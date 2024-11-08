import { createPublicClient, http, Block, Address } from "viem";
import { base } from "viem/chains";
import fs from "fs";
import aaveV3Abi from "./abis/aave_v3.json";

// Aave V3 在 Base 上的地址
const AAVE_POOL = "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5" as Address;
const USERS_FILE = "aave_users.json";

// 用户数据接口
interface UserData {
  address: string;
  firstSeen: number; // 首次交互时间戳
  lastSeen: number; // 最后交互时间戳
  interactions: {
    borrow: boolean; // 是否有借贷
    supply: boolean; // 是否有存款
    withdraw: boolean; // 是否有取款
    repay: boolean; // 是否有还款
  };
  healthFactor?: string; // 健康因子
}

// 用户映射
interface UserMap {
  [address: string]: UserData;
}

main();

async function main() {
  const client = createPublicClient({
    chain: base,
    transport: http(process.env.BASE_MAINNET_RPC),
  });

  // 加载现有用户数据
  let users: UserMap = loadUsers();

  // 监听 Borrow 事件
  client.watchContractEvent({
    address: AAVE_POOL,
    abi: aaveV3Abi,
    eventName: "Borrow",
    onLogs: async (logs) => {
      for (const log of logs) {
        const { args } = log as unknown as {
          args: { user: Address; onBehalfOf: Address };
        };
        const { user, onBehalfOf } = args;
        await processUser(client, users, user, "borrow");
        if (user !== onBehalfOf) {
          await processUser(client, users, onBehalfOf as Address, "borrow");
        }
      }
    },
  });

  // 监听 Supply 事件
  client.watchContractEvent({
    address: AAVE_POOL,
    abi: aaveV3Abi,
    eventName: "Supply",
    onLogs: async (logs) => {
      for (const log of logs) {
        const { args } = log as unknown as {
          args: { user: Address; onBehalfOf: Address };
        };
        const { user, onBehalfOf } = args;
        await processUser(client, users, user, "supply");
        if (user !== onBehalfOf) {
          await processUser(client, users, onBehalfOf as Address, "supply");
        }
      }
    },
  });

  // 定期更新所有用户的健康因子
  setInterval(
    async () => {
      console.log("Updating health factors...");
      await updateAllUsersHealthFactor(client, users);
    },
    5 * 60 * 1000,
  ); // 每5分钟更新一次
}

async function processUser(
  client: any,
  users: UserMap,
  address: Address,
  action: "borrow" | "supply" | "withdraw" | "repay",
) {
  const now = Date.now();

  if (!users[address]) {
    users[address] = {
      address: address,
      firstSeen: now,
      lastSeen: now,
      interactions: {
        borrow: false,
        supply: false,
        withdraw: false,
        repay: false,
      },
    };
  }

  users[address].lastSeen = now;
  users[address].interactions[action] = true;

  // 更新健康因子
  await updateUserHealthFactor(client, users, address);

  // 保存更新
  saveUsers(users);

  console.log(`Processed ${action} action for user ${address}`);
}

async function updateUserHealthFactor(
  client: any,
  users: UserMap,
  address: Address,
) {
  try {
    const data = await client.readContract({
      address: AAVE_POOL,
      abi: aaveV3Abi,
      functionName: "getUserAccountData",
      args: [address],
    });

    users[address].healthFactor = data[5].toString();
    console.log(
      `Updated health factor for ${address}: ${users[address].healthFactor}`,
    );
  } catch (error) {
    console.error(`Error updating health factor for ${address}:`, error);
  }
}

async function updateAllUsersHealthFactor(client: any, users: UserMap) {
  for (const address of Object.keys(users)) {
    await updateUserHealthFactor(client, users, address as Address);
    // 添加延迟以避免速率限制
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  saveUsers(users);
}

function loadUsers(): UserMap {
  try {
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, "utf8"));
    }
  } catch (error) {
    console.error("Error loading users:", error);
  }
  return {};
}

function saveUsers(users: UserMap) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error("Error saving users:", error);
  }
}

// 错误处理
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
});
