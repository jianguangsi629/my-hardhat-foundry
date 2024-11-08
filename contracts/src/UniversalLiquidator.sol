// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import {FlashLoanSimpleReceiverBase} from "@aave/core-v3/contracts/flashloan/base/FlashLoanSimpleReceiverBase.sol";
import {IPoolAddressesProvider} from "@aave/core-v3/contracts/interfaces/IPoolAddressesProvider.sol";
import {IPool} from "@aave/core-v3/contracts/interfaces/IPool.sol";
import {ISwapRouter} from "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract UniversalLiquidator is FlashLoanSimpleReceiverBase {
    using SafeERC20 for IERC20;
    // 常量定义
    address public constant USDC = 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913;
    address public constant WETH = 0x4200000000000000000000000000000000000006;
    // address public constant cbBTC = 0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf;

    uint24 public constant POOL_FEE = 3000; // 0.3% fee tier
    uint256 public constant minOut = 0; // 最小输出

    ISwapRouter public immutable swapRouter;
    address public immutable owner;

    // Aave 清算参数结构
    struct AaveLiquidationParams {
        address collateralAsset; // 抵押资产
        address debtAsset; // 债务资产
        address user; // 用户
        uint256 debtToCover; // 债务覆盖
        bool receiveAToken; // 是否接收 aToken
    }

    event LiquidationExecuted(address user, uint256 profit);
    event SwapExecuted(address tokenIn, address tokenOut, uint256 amountIn);
    event ProfitWithdrawn(address indexed owner, uint256 amount);
    event TokenRescued(address indexed owner, address token, uint256 amount);

    constructor(address _pool, address _swapRouter) FlashLoanSimpleReceiverBase(IPoolAddressesProvider(_pool)) {
        swapRouter = ISwapRouter(_swapRouter);
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    /**
     * 开始清算流程
     * @param params 清算参数
     * @param flashAmount 闪电贷金额
     */
    function executeLiquidation(AaveLiquidationParams calldata params, uint256 flashAmount) external onlyOwner {
        bytes memory encodedParams = abi.encode(params); // TODO Swap 路径优化
        POOL.flashLoanSimple(
            address(this), // 当前合约
            params.debtAsset, // 债务资产
            flashAmount, // 闪电贷金额
            encodedParams, // 清算参数
            0 // 0 表示不设置滑点保护   // TODO: 需要设置滑点保护
        );
    }

    /**
     * 闪电贷回调函数
     */
    function executeOperation(
        address asset,
        uint256 amount,
        uint256 premium,
        address /* initiator */, // 未使用的参数用注释标记
        bytes calldata params
    ) external override returns (bool) {
        // 解码参数
        AaveLiquidationParams memory liquidationParams = abi.decode(params, (AaveLiquidationParams));

        // 1. 批准 Aave 池子使用闪电贷资产
        IERC20(asset).approve(address(POOL), 0);
        IERC20(asset).approve(address(POOL), liquidationParams.debtToCover); // 设置新授权
        // 2. 执行清算
        POOL.liquidationCall(
            liquidationParams.collateralAsset,
            liquidationParams.debtAsset,
            liquidationParams.user,
            liquidationParams.debtToCover,
            liquidationParams.receiveAToken
        );

        // 3. 如果收到 aToken，需要先提取underlying资产
        if (liquidationParams.receiveAToken) {
            address aToken = _getATokenAddress(liquidationParams.collateralAsset);
            uint256 aTokenBalance = IERC20(aToken).balanceOf(address(this));
            if (aTokenBalance > 0) {
                POOL.withdraw(liquidationParams.collateralAsset, aTokenBalance, address(this));
            }
        }

        // 4. 将获得的抵押品换成 USDC
        uint256 collateralBalance = IERC20(liquidationParams.collateralAsset).balanceOf(address(this));
        if (collateralBalance > 0) {
            _swapToStablecoin(liquidationParams.collateralAsset, collateralBalance);
        }

        // 5. 如果债务资产不是 USDC
        if (asset != USDC) {
            uint256 remainingBalance = IERC20(asset).balanceOf(address(this));
            if (remainingBalance > (amount + premium)) {
                uint256 profitToSwap = remainingBalance - (amount + premium);
                _swapToStablecoin(asset, profitToSwap);
            }
        }

        // 6. 批准还款
        IERC20(asset).approve(address(POOL), amount + premium); // TODO safeApprove

        emit LiquidationExecuted(liquidationParams.user, collateralBalance); // todo collateralBalance ??

        return true;
    }

    /**
     * 将资产换成稳定币 (USDC)
     */
    function _swapToStablecoin(address tokenIn, uint256 amountIn) internal {
        if (amountIn == 0) return;

        // 批准 Uniswap 路由合约使用代币
        IERC20(tokenIn).approve(address(swapRouter), amountIn); // TODO safeApprove

        // 设置 swap 参数
        ISwapRouter.ExactInputParams memory params = ISwapRouter.ExactInputParams({
            path: _getPath(tokenIn, USDC, false),
            recipient: address(this),
            deadline: block.timestamp,
            amountIn: amountIn,
            amountOutMinimum: 0 // 注意：实际使用时应该设置滑点保护
        });

        // 执行 swap
        try swapRouter.exactInput(params) returns (uint256 amountOut) {
            // swap 成功
            emit SwapExecuted(tokenIn, USDC, amountOut);

            return;
        } catch {
            // Log fallback to alternative token (USDC) // TODO: 换成 USDT
            params.path = _getPath(tokenIn, USDC, true);
            swapRouter.exactInput(params); // ⚠️ 这里的失败没有处理
        }
    }

    /**
     * 构建 swap 路径
     */
    function _getPath(address tokenIn, address tokenOut, bool throughWETH) internal pure returns (bytes memory) {
        if (throughWETH) {
            // 通过 WETH 中转
            return abi.encodePacked(tokenIn, uint24(POOL_FEE), WETH, uint24(POOL_FEE), tokenOut);
        } else {
            // 直接路径
            return abi.encodePacked(tokenIn, uint24(POOL_FEE), tokenOut);
        }
    }

    /**
     * 获取资产对应的 aToken 地址
     */
    function _getATokenAddress(address asset) internal view returns (address) {
        return POOL.getReserveData(asset).aTokenAddress;
    }

    /**
     * 提取合约中的 USDC 利润
     */
    function withdrawProfit() external onlyOwner {
        // 提取 USDC
        uint256 usdcBalance = IERC20(USDC).balanceOf(address(this));
        if (usdcBalance > 0) {
            IERC20(USDC).safeTransfer(owner, usdcBalance);
        }
    }

    /**
     * 紧急提取指定代币
     */
    function rescueToken(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(owner, balance);
            emit TokenRescued(owner, token, balance); // 添加事件
        }
    }
}

// /**
//  * 使用 AAVE 的闪电贷
//     执行清算
//     使用 Uniswap V3 将获得的抵押品换回债务资产
//     还款给闪电贷
//     将剩余利润换成 USDC
//     这是一个基础版本，你可能还需要：
//     添加滑点保护
//     添加更多的错误处理
//     优化 swap 路径（可能需要通过 WETH 中转）
//     添加紧急取回功能
//  */
