import { createPublicClient, http, Block } from "viem";
import { mainnet, base, arbitrum } from "viem/chains";

async function main() {
  const client = createPublicClient({
    chain: mainnet,
    transport: http(
      "https://eth-mainnet.g.alchemy.com/v2/kJiBw01_8ouacMm_2EGKnm-AVePf5CKX",
    ),
  });

  const block: Block = await client.getBlock({
    blockNumber: 123456n,
  });

  console.log(block);
}

main();