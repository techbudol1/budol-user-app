# BudolPH User App: Horizen Testnet Frontend

This branch is the Cloudflare-deployed user app adaptation for Horizen testnet.

## Branch

```bash
git switch horizen-testnet-adaptation
```

## Scope

This keeps the current Arbitrum Sepolia production branch intact and adds support for Horizen testnet.

Default trading still uses direct external-wallet transactions. ERC-4337 smart-wallet discovery is now supported when the API exposes `/api/smart-wallet/config` with a deployed EntryPoint, SimpleAccountFactory, and bundler URL.

Google/social login is disabled in this branch; users authenticate by signing a wallet message.

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

## Smart-wallet config

The wallet page calls:

```text
GET /api/smart-wallet/config
```

When enabled, the frontend derives the user's ERC-4337 SimpleAccount address from:

- `entryPointAddress`
- `factoryAddress`
- connected owner wallet address
- account index `0`

Until a bundler is running and trade flow is converted to UserOperations, normal external-wallet trading remains the active transaction path.

## Cloudflare Deployment Recommendation

Do not point production `budolph.xyz` at this branch yet.

Use either:

- a Cloudflare preview deployment for `horizen-testnet-adaptation`, or
- a separate Worker/Pages project/domain like `horizen-testnet.budolph.xyz`.

Last Cloudflare rebuild trigger: 2026-07-09.
