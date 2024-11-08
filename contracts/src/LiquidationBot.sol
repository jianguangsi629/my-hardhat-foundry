// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;


import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@aave/core-v3/contracts/interfaces/IPool.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";

contract LiquidationBot is Ownable {
    IPool public lendingPool;
    ISwapRouter public swapRouter;

    constructor(address _lendingPoolAddress, address _swapRouterAddress) Ownable(msg.sender){
        lendingPool = IPool(_lendingPoolAddress);
        swapRouter = ISwapRouter(_swapRouterAddress);
    }

    function liquidateAndArbitrage(
        address _user,
        address _debtAsset,
        address _collateralAsset,
        uint256 _debtToCover,
        bool _receiveAToken,
        uint24 _poolFee
    ) external onlyOwner {
        IERC20(_debtAsset).approve(address(lendingPool), _debtToCover);

        lendingPool.liquidationCall(_collateralAsset, _debtAsset, _user, _debtToCover, _receiveAToken);

        uint256 collateralAmount = IERC20(_collateralAsset).balanceOf(address(this));

        IERC20(_collateralAsset).approve(address(swapRouter), collateralAmount);

        ISwapRouter.ExactInputSingleParams memory params = ISwapRouter.ExactInputSingleParams({
            tokenIn: _collateralAsset,
            tokenOut: _debtAsset,
            fee: _poolFee,
            recipient: address(this),
            deadline: block.timestamp + 300,
            amountIn: collateralAmount,
            amountOutMinimum: 0, // 可根据需要设置滑点保护
            sqrtPriceLimitX96: 0
        });

        uint256 amountOut = swapRouter.exactInputSingle(params);

        IERC20(_debtAsset).transfer(owner(), amountOut);
    }

    function withdrawToken(address _token, uint256 _amount) external onlyOwner {
        IERC20(_token).transfer(owner(), _amount);
    }

    receive() external payable {}
}
