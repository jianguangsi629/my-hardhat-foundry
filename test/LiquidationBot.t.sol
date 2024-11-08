// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "forge-std/Test.sol";
import "../contracts/src/LiquidationBot.sol";

contract LiquidationBotTest is Test {
    LiquidationBot bot;

    // 替换为实际的 Aave LendingPool 和 Uniswap SwapRouter 地址
    address constant LENDING_POOL_ADDRESS = 0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2;
    address constant SWAP_ROUTER_ADDRESS = 0xE592427A0AEce92De3Edee1F18E0157C05861564;

    function setUp() public {
        bot = new LiquidationBot(LENDING_POOL_ADDRESS, SWAP_ROUTER_ADDRESS);
        bot.transferOwnership(address(this)); // 将合约所有者设置为测试合约
    }

    function testLiquidateAndArbitrage() public {
        // 模拟测试参数
        address user = 0x54539A7039C10a54f9490dD6e013F4aF1C0c1111; // 被清算的用户地址
        address debtAsset = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2; // 债务资产地址（例如 WETH）
        address collateralAsset = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2; // 抵押资产地址（例如 WBTC）
        uint256 debtToCover = 1 ether; // 要清算的债务数量
        bool receiveAToken = false;
        uint24 poolFee = 3000; // Uniswap V3 池的手续费等级

        // 为合约分配足够的债务资产用于清算
        deal(debtAsset, address(bot), debtToCover);

        // 执行清算和套利操作
        vm.prank(address(this));
        bot.liquidateAndArbitrage(user, debtAsset, collateralAsset, debtToCover, receiveAToken, poolFee);

        // 验证合约余额增加
        uint256 balanceAfter = IERC20(debtAsset).balanceOf(address(this));
        assertGt(balanceAfter, 0, "arbitrage failed, balance not increased");
    }
}
