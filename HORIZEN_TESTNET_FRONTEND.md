# BudolPH User App: Horizen Testnet Frontend

This branch is the Cloudflare-deployed user app adaptation for Horizen testnet.

## Branch

```bash
git switch horizen-testnet-adaptation
```

## Scope

This keeps the current Arbitrum Sepolia production branch intact and adds support for direct external-wallet transactions on Horizen testnet.

No Alchemy, smart-wallet bundler, or paymaster is used for Horizen.
Google/social login is disabled in this branch; users authenticate by signing a wallet message and trade by signing wallet transactions.

## Horizen Testnet

```text
Name: Horizen Testnet
Chain ID: 2651420
RPC HTTPS: https://horizen-testnet.rpc.caldera.xyz/http
RPC WS: wss://horizen-testnet.rpc.caldera.xyz/ws
Symbol: ETH
Explorer: https://horizen-testnet.explorer.caldera.xyz/
Faucet/Bridge: https://horizen-testnet.hub.caldera.xyz/
```

## Required Backend

The frontend only follows whatever `/api/trade/config` returns.

For Horizen testing, the API behind `VITE_API_BASE_URL` must return:

```json
{
  "chainId": 2651420,
  "networkName": "Horizen Testnet",
  "tokenAddress": "0xb06EC4ce262D8dbDc24Fac87479A49A7DC4cFb87",
  "tokenDecimals": 18,
  "tokenSymbol": "tZEN"
}
```

The backend must also verify escrow transfers against:

```text
https://horizen-testnet.rpc.caldera.xyz/http
```

## Cloudflare Deployment Recommendation

Do not point production `budolph.xyz` at this branch yet.

Use either:

- a Cloudflare preview deployment for `horizen-testnet-adaptation`, or
- a separate Worker/Pages project/domain like `horizen-testnet.budolph.xyz`.

Last Cloudflare rebuild trigger: 2026-07-09.
