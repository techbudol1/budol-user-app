# BudolPH User App

Public React frontend for BudolPH.

```bash
cp .env.frontend.example .env.frontend
bun install
bun run dev
```

Build with `bun run build` and type-check with `bun run typecheck`.

## Cloudflare Workers

For a Git-connected Worker, use these build settings:

- Build command: `bun run build`
- Deploy command: `bunx wrangler deploy`
- Root directory: `/`

Alternatively, `bun run deploy` builds and deploys in one command.
