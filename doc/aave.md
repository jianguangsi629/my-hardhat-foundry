
# mainnet
LENDING_POOL_ADDRESS=0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2
SWAP_ROUTER_ADDRESS=0x68b3465833fb72a70ecdf485e0e4c7bd8665fc45

WETH=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
WBTC=0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599
GHO=0x40D16FC0246aD3160Ccc09B8D0D3A2cD28aE6C2f


# fork
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"query": "{ tokens(first: 5) { id name symbol decimals } rewardTokens(first: 5) { id token { id } type _distributionEnd } }", "operationName": "Subgraphs", "variables": {}}' \
  https://gateway.thegraph.com/api/5e7cf3523077b9201ef302ba4f47748f/subgraphs/id/JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk