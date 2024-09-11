import { HardhatUserConfig, task, vars } from "hardhat/config";

import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import "@nomicfoundation/hardhat-ledger";
import "@nomicfoundation/hardhat-foundry";
import "@nomicfoundation/hardhat-chai-matchers";
import "@nomicfoundation/hardhat-ignition-ethers";
import "@nomicfoundation/hardhat-viem";
import "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import '@nomicfoundation/hardhat-viem';

import '@typechain/hardhat';
import "hardhat-gas-reporter";
import "hardhat-abi-exporter";
import "hardhat-contract-sizer";

import "xdeployer";
import "solidity-coverage";

// import * as tdly from "@tenderly/hardhat-tenderly";
// Turning off the automatic Tenderly verification
// tdly.setup({ automaticVerifications: false });

const ethMainnetUrl = vars.get("ETH_MAINNET_URL", "https://eth.llamarpc.com");
const accounts = [
  vars.get(
    "PRIVATE_KEY",
    // `keccak256("DEFAULT_VALUE")`
    "0x0d1706281056b7de64efd2088195fa8224c39103f578c9b84f951721df3fa71c",
  ),
];
const ledgerAccounts = [
  vars.get(
    "LEDGER_ACCOUNT",
    // `bytes20(uint160(uint256(keccak256("DEFAULT_VALUE"))))`
    "0x8195fa8224c39103f578c9b84f951721df3fa71c",
  ),
];

task("accounts", "Prints the list of accounts", async (_, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

task("evm", "Prints the configured EVM version", async (_, hre) => {
  console.log(hre.config.solidity.compilers[0].settings.evmVersion);
});

task(
  "balances",
  "Prints the list of accounts and their balances",
  async (_, hre) => {
    const accounts = await hre.ethers.getSigners();

    for (const account of accounts) {
      console.log(
        account.address +
          " " +
          (await hre.ethers.provider.getBalance(account.address)),
      );
    }
  },
);

const config: HardhatUserConfig = {
  paths: {
    // sources: "./contracts/src",
  },
  solidity: {
    // Only use Solidity default versions `>=0.8.25` for EVM networks that support the new `cancun` opcodes:
    // https://github.com/ethereum/execution-specs/blob/master/network-upgrades/mainnet-upgrades/cancun.md
    // Only use Solidity default versions `>=0.8.20` for EVM networks that support the opcode `PUSH0`
    // Otherwise, use the versions `<=0.8.19`
    version: "0.8.24",
    settings: {
      evmVersion: "paris", // Prevent using the `PUSH0` and `cancun` opcodes
      optimizer: {
        enabled: true,
        runs: 999_999,
      },
    },
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      // initialBaseFeePerGas: 0,
      // chainId: 31337,
      // hardfork: "cancun",
      // forking: {
      //   url: vars.get("ETH_MAINNET_URL", ethMainnetUrl),
      //   // blockNumber: 14743877,
      //   enabled: false,
      // },
      // ledgerAccounts,
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      ledgerAccounts,
    },
    tenderly: {
      // Add your own Tenderly fork ID
      url: `https://rpc.tenderly.co/fork/${vars.get("TENDERLY_FORK_ID", "")}`,
      ledgerAccounts,
    },
    devnet: {
      // Add your own Tenderly DevNet ID
      url: `https://rpc.vnet.tenderly.co/devnet/${vars.get(
        "TENDERLY_DEVNET_ID",
        "",
      )}`,
      accounts,
      ledgerAccounts,
    },
    sepolia: {
      chainId: 11155111,
      url: vars.get("ETH_SEPOLIA_TESTNET_URL", "https://rpc.sepolia.org"),
      accounts,
      ledgerAccounts,
    },
    holesky: {
      chainId: 17000,
      url: vars.get(
        "ETH_HOLESKY_TESTNET_URL",
        "https://ethereum-holesky-rpc.publicnode.com",
      ),
      accounts,
      ledgerAccounts,
    },
    ethMain: {
      chainId: 1,
      url: ethMainnetUrl,
      accounts,
      ledgerAccounts,
    },
    bscTestnet: {
      chainId: 97,
      url: vars.get(
        "BSC_TESTNET_URL",
        "https://data-seed-prebsc-1-s1.binance.org:8545",
      ),
      accounts,
      ledgerAccounts,
    },
    bscMain: {
      chainId: 56,
      url: vars.get("BSC_MAINNET_URL", "https://bsc-dataseed1.binance.org"),
      accounts,
      ledgerAccounts,
    },
    optimismTestnet: {
      chainId: 420,
      url: vars.get("OPTIMISM_TESTNET_URL", "https://goerli.optimism.io"),
      accounts,
      ledgerAccounts,
    },
    optimismSepolia: {
      chainId: 11155420,
      url: vars.get("OPTIMISM_SEPOLIA_URL", "https://sepolia.optimism.io"),
      accounts,
      ledgerAccounts,
    },
    optimismMain: {
      chainId: 10,
      url: vars.get("OPTIMISM_MAINNET_URL", "https://mainnet.optimism.io"),
      accounts,
      ledgerAccounts,
    },
    arbitrumSepolia: {
      chainId: 421614,
      url: vars.get(
        "ARBITRUM_SEPOLIA_URL",
        "https://sepolia-rollup.arbitrum.io/rpc",
      ),
      accounts,
      ledgerAccounts,
    },
    arbitrumMain: {
      chainId: 42161,
      url: vars.get("ARBITRUM_MAINNET_URL", "https://arb1.arbitrum.io/rpc"),
      accounts,
      ledgerAccounts,
    },
    arbitrumNova: {
      chainId: 42170,
      url: vars.get("ARBITRUM_NOVA_URL", "https://nova.arbitrum.io/rpc"),
      accounts,
      ledgerAccounts,
    },
    baseSepolia: {
      chainId: 84532,
      url: vars.get("BASE_SEPOLIA_URL", "https://sepolia.base.org"),
      accounts,
      ledgerAccounts,
    },
    baseMain: {
      chainId: 8453,
      url: vars.get("BASE_MAINNET_URL", "https://mainnet.base.org"),
      accounts,
      ledgerAccounts,
    },
  },
  xdeploy: {
    // Change this name to the name of your main contract
    // Does not necessarily have to match the contract file name
    contract: "Greeter",

    // Change to `undefined` if your constructor does not have any input arguments
    constructorArgsPath: "./deploy-args.ts",

    // The salt must be the same for each EVM chain for which you want to have a single contract address
    // Change the salt if you are doing a re-deployment with the same codebase
    salt: vars.get(
      "SALT",
      // `keccak256("SALT")`
      "0x087ee6a43229fddc3e140062b42bcff0c6d1c5a3bba8123976a59688e7024c25",
    ),

    // This is your wallet's private key
    signer: accounts[0],

    // Use the network names specified here: https://github.com/pcaversaccio/xdeployer#configuration
    // Use `localhost` or `hardhat` for local testing
    networks: ["hardhat", "sepolia", "optimismSepolia"],

    // Use the matching env URL with your chosen RPC in the `.env` file
    rpcUrls: [
      "hardhat",
      vars.get("ETH_SEPOLIA_TESTNET_URL", "https://rpc.sepolia.org"),
      vars.get("OPTIMISM_SEPOLIA_URL", "https://sepolia.optimism.io"),
    ],

    // Maximum limit is 15 * 10 ** 6 or 15,000,000. If the deployments are failing, try increasing this number
    // However, keep in mind that this costs money in a production environment!
    gasLimit: 1.2 * 10 ** 6,
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: true,
    disambiguatePaths: false,
    strict: true,
    only: [],
    except: ["CreateX", "Create2DeployerLocal"],
  },
  gasReporter: {
    enabled: vars.has("REPORT_GAS") ? true : false,
    currency: "USD",
  },
  abiExporter: {
    path: "./abis",
    runOnCompile: true,
    clear: true,
    flat: false,
    only: [],
    spacing: 2,
    pretty: true,
  },
  sourcify: {
    // Enable Sourcify verification by default
    enabled: true,
    apiUrl: "https://sourcify.dev/server",
    browserUrl: "https://repo.sourcify.dev",
  },
  etherscan: {
    // Add your own API key by getting an account at etherscan (https://etherscan.io), snowtrace (https://snowtrace.io) etc.
    // This is used for verification purposes when you want to `npx hardhat verify` your contract using Hardhat
    // The same API key works usually for both testnet and mainnet
    apiKey: {
      // For Ethereum testnets & mainnet
      mainnet: vars.get("ETHERSCAN_API_KEY", ""),
      sepolia: vars.get("ETHERSCAN_API_KEY", ""),
      holesky: vars.get("ETHERSCAN_API_KEY", ""),
      // For BSC testnet & mainnet
      bsc: vars.get("BSC_API_KEY", ""),
      bscTestnet: vars.get("BSC_API_KEY", ""),
      // For Optimism testnets & mainnet
      optimisticEthereum: vars.get("OPTIMISM_API_KEY", ""),
      optimisticGoerli: vars.get("OPTIMISM_API_KEY", ""),
      optimisticSepolia: vars.get("OPTIMISM_API_KEY", ""),
      // For Arbitrum testnet & mainnets
      arbitrumOne: vars.get("ARBITRUM_API_KEY", ""),
      arbitrumNova: vars.get("ARBITRUM_API_KEY", ""),
      arbitrumSepolia: vars.get("ARBITRUM_API_KEY", ""),
      // For Base testnets & mainnet
      base: vars.get("BASE_API_KEY", ""),
      baseTestnet: vars.get("BASE_API_KEY", ""),
      baseSepolia: vars.get("BASE_API_KEY", ""),
    },
    customChains: [
      {
        network: "holesky",
        chainId: 17000,
        urls: {
          apiURL: "https://api-holesky.etherscan.io/api",
          browserURL: "https://holesky.etherscan.io",
        },
      },
      {
        network: "optimisticSepolia",
        chainId: 11155420,
        urls: {
          apiURL: "https://api-sepolia-optimistic.etherscan.io/api",
          browserURL: "https://sepolia-optimism.etherscan.io",
        },
      },
    ],
  },
  // tenderly: {
  //   username: "MyAwesomeUsername",
  //   project: "super-awesome-project",
  //   forkNetwork: "",
  //   privateVerification: false,
  //   deploymentsDir: "deployments_tenderly",
  // },
};

export default config;
