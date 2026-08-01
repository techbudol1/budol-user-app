# BudolPH User App: Horizen Testnet Integration

This application targets Horizen Testnet and obtains active chain, token, privacy, and account-abstraction configuration from the BudolPH API. It supports self-custodial EVM wallets and the configured Google-managed wallet flow.

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

## Required backend configuration

The API behind `VITE_API_BASE_URL` is the source of truth. Its trade configuration must identify BUDOL as the trading token on Horizen Testnet:

```json
{
  "chainId": 2651420,
  "networkName": "Horizen Testnet",
  "tokenAddress": "0x689513fb392e460c6d9225f911fce57fe50d6db4",
  "tokenDecimals": 18,
  "tokenSymbol": "BUDOL"
}
```

The backend must verify escrow transfers against:

```text
https://horizen-testnet.rpc.caldera.xyz/http
```

## Smart-account configuration

The wallet page calls:

```text
GET /api/smart-wallet/config
```

When enabled, the frontend derives an ERC-4337 SimpleAccount address from:

- `entryPointAddress`
- `factoryAddress`
- connected owner wallet address
- account index `0`

When `enabled: true`, the trade escrow transfer is submitted as an ERC-4337 UserOperation through the configured bundler. The frontend waits for the UserOperation receipt, extracts the underlying transaction hash, and sends that hash to the API for the existing escrow verification flow.

When disabled, direct external-wallet trading remains the active transaction path.

## Deployment notes

Build-time variables are public. Keep only public endpoint URLs in Cloudflare build settings; never add wallet keys, paymaster credentials, OAuth secrets, or Vault credentials.
