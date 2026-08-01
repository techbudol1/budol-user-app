# BudolPH User App

BudolPH is a privacy-aware prediction-market frontend built for **Horizen Testnet**. It lets users trade Philippine public-interest market outcomes with BUDOL, then optionally use tZEN privacy access for private claim and shielded-payout flows.

> **Testnet software:** this repository is for demonstration and beta testing on Horizen Testnet (`2651420`). It is not a real-value or mainnet release.

## Why Horizen

Prediction-market activity can reveal sensitive civic preferences. BudolPH keeps public market participation simple while offering an opt-in privacy layer for users who need greater separation between a winning position and its payout.

| Token | Role |
| --- | --- |
| **ETH** | Native Horizen Testnet gas token. |
| **BUDOL** | Market trading token: collateral, trading fees, and payouts. |
| **tZEN** | Privacy-access token on testnet: hidden positions, private claim proofs, and shielded payouts. |

## What the app supports

- Browse, quote, and trade public BUDOL prediction markets.
- Connect a self-custodial EVM wallet, or sign in with Google for a GMR Vault-backed managed wallet.
- Use a configured ERC-4337 smart account, bundler, and paymaster/sponsor path.
- Select self-paid gas or an admin-enabled sponsored trade flow.
- Hide a position until market resolution by paying the configured tZEN privacy fee.
- Place a cryptographically shielded fixed-denomination order whose deposit is
  spent with a Poseidon/Merkle membership proof and one-time nullifier.
- Submit a private winning-claim proof and route a shielded payout to a recipient wallet.
- Review BUDOL, ETH, and tZEN balances plus unified wallet activity.

## Privacy model

Public trading and portfolio history are free. Privacy is opt-in:

1. Enable **Private trade** in the trade ticket.
2. Deposit a fixed-denomination BUDOL commitment and create the order proof in
   the browser.
3. Pay tZEN for the privacy-access receipt and relay the order into a delayed
   batch.
4. After resolution, create a private claim and enter the payout recipient once.
5. BudolPH queues internal fixed-denomination payout notes as a relay batch.

The order proof hides which vault deposit was spent and binds the hidden market,
side, and amount to an accepted commitment. Public odds move only after an
aggregate batch settles. The testnet coordinator still receives the plaintext
order, and the final ERC-20 withdrawal and recipient remain visible on-chain.
For stronger payout privacy, users should withdraw to a fresh wallet.

The checked-in Groth16 artifacts are development artifacts for testnet. A verified multi-party ceremony, final verifier deployment, and independent security review are required before any real-value or mainnet privacy claim.

## Horizen Testnet

```text
Network:     Horizen Testnet
Chain ID:    2651420
RPC (HTTPS): https://horizen-testnet.rpc.caldera.xyz/http
RPC (WS):    wss://horizen-testnet.rpc.caldera.xyz/ws
Explorer:    https://horizen-testnet.explorer.caldera.xyz/
Faucet:      https://horizen-testnet.hub.caldera.xyz/
Native gas:  ETH
```

Current BUDOL testnet contract:

```text
0x689513fb392e460c6d9225f911fce57fe50d6db4
```

The API is the source of truth for active tZEN, privacy collector, shielded-payout, smart-account, bundler, paymaster, and sponsored-gas configuration. Do not hard-code those deployment addresses in the frontend.

## Architecture

```text
User wallet / Google managed wallet
            │
            ▼
      BudolPH User App
            │
            ├── BudolPH API ── market state, escrow checks, privacy receipts
            ├── GMR Engine ── contract administration, relays, ERC-4337 services
            └── Horizen Testnet ── BUDOL, tZEN, privacy, and account contracts
```

Useful backend configuration endpoints:

- `GET /api/trade-config`
- `GET /api/smart-wallet/config`
- `GET /api/privacy-access/config`
- `GET /api/privacy-access/metrics`
- `GET /api/private-claims/shielded-config`
- `GET /api/shielded-trades/config`

## Local development

```bash
cp .env.frontend.example .env.frontend
bun install
bun run dev
```

Set the API endpoint in `.env.frontend`:

```env
VITE_API_BASE_URL=http://localhost:8082
VITE_GMR_ENGINE_BASE_URL=http://localhost:8090
```

Validate a production build with:

```bash
bun run typecheck
bun run build
```

## Cloudflare Workers deployment

For a Git-connected Cloudflare Worker:

| Setting | Value |
| --- | --- |
| Build command | `bun run build` |
| Deploy command | `bunx wrangler deploy` |
| Root directory | `/` |

Alternatively:

```bash
bun run deploy
```

Build-time frontend environment values are public. Never put API secrets, private keys, OAuth client secrets, paymaster keys, or Vault credentials in `VITE_*` variables or Cloudflare frontend settings.

## Testnet boundaries

The current testnet implementation demonstrates:

- Horizen integration and testnet market operations.
- Direct tZEN utility for privacy access.
- ZK commitment/nullifier-based private claims and shielded withdrawal flows.
- Aggregate privacy metrics without publishing per-user private-position data.

Still required before mainnet or real funds:

- multi-party ZK ceremony and production proving artifacts;
- independent smart-contract, paymaster, relayer, and API security review;
- recorded live end-to-end tests for self-paid, sponsored, and managed smart-account trading;
- funded operations, project KYC, and legal/compliance approval.

See [HORIZEN_TESTNET_FRONTEND.md](./HORIZEN_TESTNET_FRONTEND.md) for frontend integration notes.
