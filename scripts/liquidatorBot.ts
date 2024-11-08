import { ethers   as hardhatEthers } from "hardhat";
import { LiquidationBot } from "../typechain-types";
import axios from "axios";
import { ethers } from "ethers";


const graph_api_key = "5e7cf3523077b9201ef302ba4f47748f"

async function main() {
  const botAddress = "0x";
  const bot = (await hardhatEthers.getContractAt("LiquidationBot", botAddress)) as LiquidationBot;

  // 定义债务资产和抵押资产（例如 WETH 和 WBTC）
  const debtAsset = "0x40D16FC0246aD3160Ccc09B8D0D3A2cD28aE6C2f"; 
  const collateralAsset = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2";
  const poolFee = 3000; // Uniswap V3 池的手续费等级

  // 定期检查
  setInterval(async () => {
    // 获取可清算的借款人列表
    const borrowers = await getLiquidatableBorrowers();

    for (const user of borrowers) {
      // 获取需要清算的债务数量
      const debtToCover = await getDebtToCover(user, debtAsset);

      // 执行清算和套利
      const tx = await bot.liquidateAndArbitrage(
        user,
        debtAsset,
        collateralAsset,
        debtToCover,
        false,
        poolFee,
        { gasLimit: 5000000 }
      );
      console.log(`清算交易已发送，哈希：${tx.hash}`);
      await tx.wait();
      console.log(`已成功清算用户：${user}`);
    }
  }, 60000); // 每分钟检查一次
}

// 获取可清算的借款人列表
async function getLiquidatableBorrowers(): Promise<string[]> {
  // 使用 Aave 的子图 API 获取健康因子低于 1 的借款人
  const query = `
    {
      users(where: { healthFactor_lt: "1" }) {
        id
      }
    }
  `;
  const response = await axios.post("https://api.thegraph.com/subgraphs/name/aave/protocol-v2", {
    query,
  });
  const users = response.data.data.users;
  return users.map((user: any) => user.id);
}

// 获取需要清算的债务数量
async function getDebtToCover(user: string, debtAsset: string): Promise<ethers.BigNumberish> {
  // 调用 Aave 的合约获取用户的债务信息
  const lendingPoolAddress = "AAVE_LENDING_POOL_ADDRESS";
  const lendingPool = await hardhatEthers.getContractAt("IPool", lendingPoolAddress);

  const userAccountData = await lendingPool.getUserAccountData(user);
  const totalDebtETH = userAccountData.totalDebtBase;

  // 根据债务资产的价格和用户的总债务计算
  // 这里简化处理，您需要根据实际情况计算 debtToCover
  const debtToCover = ethers.parseEther("1"); // 示例值

  return debtToCover;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});