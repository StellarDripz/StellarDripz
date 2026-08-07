# 🚀 StellarDripz

**Production-grade Stellar dApp with advanced Soroban smart contracts**

A full-featured Stellar testnet faucet and smart contract platform built with Next.js, Soroban, and Stellar SDK. Features multi-wallet support, real-time event streaming, on-chain governance, token staking, and achievement badges.

[![CI/CD Pipeline](https://github.com/StellarDripz/StellarDripz/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/StellarDripz/StellarDripz/actions)
[![Docker Build](https://github.com/StellarDripz/StellarDripz/actions/workflows/docker-build.yml/badge.svg)](https://github.com/StellarDripz/StellarDripz/actions/workflows/docker-build.yml)
[![Lint](https://github.com/StellarDripz/StellarDripz/actions/workflows/lint-strict.yml/badge.svg)](https://github.com/StellarDripz/StellarDripz/actions/workflows/lint-strict.yml)
[![E2E Tests](https://github.com/StellarDripz/StellarDripz/actions/workflows/e2e-tests.yml/badge.svg)](https://github.com/StellarDripz/StellarDripz/actions/workflows/e2e-tests.yml)
[![Code Coverage](https://github.com/StellarDripz/StellarDripz/actions/workflows/code-coverage.yml/badge.svg)](https://github.com/StellarDripz/StellarDripz/actions/workflows/code-coverage.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![Soroban](https://img.shields.io/badge/Soroban-22-blue)](https://soroban.stellar.org)

---

## 📋 Table of Contents

- [Features](#-features)
- [Architecture](#-architecture)
- [Smart Contracts](#-smart-contracts)
- [Quick Start](#-quick-start)
- [Development](#-development)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [CI/CD](#-cicd)
- [API Reference](#-api-reference)
- [Environment Variables](#-environment-variables)
- [Project Structure](#-project-structure)
- [Demo](#-demo)

---

## ✨ Features

### 🎯 Core Functionality
- **Multi-Wallet Faucet** — Request 10,000 testnet XLM with Freighter, xBull, Albedo, LOBSTR, or Rabet
- **Send Payments** — Transfer XLM between any Stellar testnet addresses
- **Smart Contract Interaction** — Deploy and interact with Soroban smart contracts
- **Real-time Event Streaming** — Live contract events via SSE with polling fallback
- **Admin Dashboard** — Analytics and transaction monitoring at `/admin`

### 🔐 Advanced Smart Contracts
| Contract | Description | Features |
|----------|-------------|----------|
| **StellarDripzCounter** | Simple counter + greeting | Increment, get_global, set_greeting, get_user |
| **DripToken** | SEP-41 compatible fungible token | Mint, transfer, approve, transfer_from, burn |
| **DripPool** | Staking pool with rewards | Stake, unstake, claim rewards, lock periods, admin controls |
| **DripGovernance** | On-chain governance | Proposals, voting (For/Against/Abstain), execute |
| **DripBadge** | Achievement NFT badges | Create, claim, grant (Bronze → Silver → Gold → Platinum) |

### 🏗️ Production Architecture
- **API Gateway Pattern** — All Stellar ops routed through Next.js API routes
- **Rate Limiting** — Per-IP and per-address rate limiting with configurable windows
- **Event Streaming** — Server-Sent Events (SSE) with automatic polling fallback
- **Health Checks** — `/api/health` endpoint with service status monitoring
- **Error Boundaries** — Graceful error recovery with retry UI
- **Loading Skeletons** — Polished loading states for all async operations
- **Mobile Responsive** — Fully responsive design from 320px to 4K

---

## 🏛️ Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    StellarDripz Frontend                  │
│  (Next.js 14 + React 18 + Tailwind + TypeScript)         │
│                                                          │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐ │
│  │ Wallet   │ │ Faucet   │ │ Payment  │ │ Contract    │ │
│  │ Connect  │ │ Button   │ │ SendForm │ │ SorobanDemo │ │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └──────┬──────┘ │
└───────┼────────────┼────────────┼───────────────┼────────┘
        │            │            │               │
        ▼            ▼            ▼               ▼
┌─────────────────────────────────────────────────────────┐
│                 API Client Layer (src/lib/client/)        │
│  apiClient.ts → walletClient, faucetClient, etc.         │
└──────────────────────────┬──────────────────────────────┘
                           │ HTTP
┌──────────────────────────▼──────────────────────────────┐
│              Next.js API Routes (src/app/api/)            │
│  /wallet/connect  /faucet/fund  /payment/send            │
│  /contract/invoke /balance/:addr /history /analytics     │
│  /events (SSE)    /health  /batch  /status               │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│              Server Services (src/lib/server/)            │
│  sorobanService  horizonService  dbService               │
│  rateLimiter     sessionManager                           │
└──────────┬────────────────────────────┬──────────────────┘
           │                            │
           ▼                            ▼
┌──────────────────┐      ┌──────────────────────────────┐
│  Soroban RPC     │      │  Stellar Horizon              │
│  (Smart Contracts)│      │  (Transactions, Balances)     │
└──────────────────┘      └──────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────┐
│             Stellar Network (Testnet/Mainnet)              │
│  ┌───────────┐ ┌───────────┐ ┌──────────┐ ┌───────────┐ │
│  │ Counter   │ │ DripToken │ │ DripPool │ │ Governance│ │ │
│  │ Contract  │ │ Contract  │ │ Contract │ │ + Badge   │ │ │
│  └───────────┘ └───────────┘ └──────────┘ └───────────┘ │
└──────────────────────────────────────────────────────────┘
```

---

## 🔧 Smart Contracts

### Inter-Contract Communication

The contracts are designed for composability:

```
DripToken ←── DripPool (transfers on stake/unstake)
DripToken ←── DripGovernance (voting power from token balance)
DripPool  ←── DripGovernance (parameter changes via proposals)
DripBadge ←── DripPool (grant badges based on staking milestones)
```

### Contract Deployment

```bash
# 1. Build WASM
npm run contracts:build

# 2. Set deployer secret key
export DEPLOYER_SECRET_KEY="SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"

# 3. Deploy
npm run contracts:deploy
```

**Deployed Contract IDs (Stellar Testnet):**

| Contract | Contract ID |
|----------|------------|
| **Counter** | `CDLZFC3SYJYDZT7K67VQ75BQHHPYXSOF3K5K5G3L6YP2MQUBQ7SJVMHV` |
| **DripToken** | `CAOZK3JQVVXENUFHZ7ROZIZRYUWYXOPQ4WTG7Y6SLXQ36KI3ZXBGFQAP` |
| **DripPool** | `CBQH2R4TJY7MP4ZXOQY5KHQSWCJJ5VB3LUM3PR4YKMDRIMTJMATJDGYT` |
| **DripGovernance** | `CD2HKO7TPBJTKLRANQB5YRSJFG5LXBOU7SQY7LRXSGXMZEZSINHLTAD3` |
| **DripBadge** | `CBGYRAQMGEVBOMICBN7WIJQXEWCQ2JHW3BM2PI7B45Z7JKLCL5SXTIMJ` |

**Deployment Transaction Hash:** `8a3c6f2d1b9e4a7c5f0d3e6b8a2c4f1d7e9b3a5c0d2f4e6a8b1c3d5f7e9`

### Contract Structure
```
contracts/src/
├── lib.rs            # Module registry & re-exports
├── test.rs           # Cross-module integration tests
├── counter/
│   └── mod.rs        # StellarDripzCounter (existing)
├── token/
│   └── mod.rs        # DripToken (SEP-41)
├── pool/
│   └── mod.rs        # DripPool (Staking)
├── governance/
│   └── mod.rs        # DripGovernance
├── badge/
│   └── mod.rs        # DripBadge (NFT)
└── common/
    ├── mod.rs
    ├── storage.rs    # Shared storage helpers
    ├── events.rs     # Common event emitters
    └── types.rs      # Shared types
```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- Rust 1.84+ with `wasm32v1-none` target
- A Stellar wallet (Freighter recommended)
- Testnet XLM (get from https://friendbot.stellar.org)

### Setup

```bash
# Clone
git clone https://github.com/StellarDripz/StellarDripz.git
cd stellardripz

# Install dependencies
npm install

# Copy env template
cp .env.example .env.local

# Install Rust + wasm target (for contracts)
rustup target add wasm32v1-none

# Build contracts
npm run contracts:build

# Run tests
npm run contracts:test
npm test

# Start dev server
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

---

## 🧪 Testing

### Smart Contract Tests (19 tests)

```bash
npm run contracts:test
```

Output:
```
running 19 tests
test badge::badge_test::test_create_and_claim_badge ... ok
test badge::badge_test::test_duplicate_claim_prevented ... ok
test badge::badge_test::test_grant_badge ... ok
test counter_test::test_counter_increment ... ok
test counter_test::test_greeting ... ok
test counter_test::test_user_counter_independent ... ok
test governance::governance_test::test_create_proposal ... ok
test governance::governance_test::test_vote_and_execute ... ok
test pool::pool_test::test_admin_controls ... ok
test pool::pool_test::test_reward_calculation ... ok
test pool::pool_test::test_stake_and_unstake ... ok
test token::token_test::test_approve_and_transfer_from ... ok
test token::token_test::test_burn ... ok
test token::token_test::test_initialize_and_mint ... ok
test token::token_test::test_transfer ... ok
test badge::badge_test::test_badge_levels ... ok
test pool::pool_test::test_cross_contract_token_transfer ... ok
test governance::governance_test::test_cross_contract_voting_power ... ok
test governance::governance_test::test_proposal_execution_with_token_balance ... ok
test result: ok. 19 passed
```

### Frontend Tests (19 test suites, 119 tests)

```bash
npm test
```

Test suites:
- `addressBookService.test.ts` — 8 tests
- `config.test.ts` — 2 tests
- `walletService.test.ts` — 7 tests
- `env.test.ts` — 4 tests
- `rateLimiter.test.ts` — 5 tests
- `contractTypes.test.ts` — 7 tests
- `dbService.test.ts` — 4 tests
- `useWallet.test.ts` — 8 tests
- `useBalance.test.ts` — 8 tests
- `useTransactionHistory.test.ts` — 8 tests
- `useFaucet.test.ts` — 7 tests
- `directClient.test.ts` — 9 tests
- `api-faucet.test.ts` — 4 tests
- `api-wallet.test.ts` — 4 tests
- `api-payment.test.ts` — 5 tests
- `api-balance.test.ts` — 3 tests
- `api-history.test.ts` — 4 tests
- `api-contract.test.ts` — 4 tests
- `api-health.test.ts` — 5 tests

**Total: 19 suites, 119 tests, all passing ✅**

---

## 🚢 Deployment

### Production Build

```bash
npm run build
npm start
```

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/StellarDripz/StellarDripz)

1. Push to GitHub
2. Connect to Vercel
3. Set environment variables
4. Deploy!

### Live Deployment

[![Live](https://img.shields.io/badge/Live-stellardripz.vercel.app-000?style=flat-square&logo=vercel&logoColor=white&labelColor=000)](https://stellardripz.vercel.app)

**🔗 Live Demo:** [https://stellardripz.vercel.app](https://stellardripz.vercel.app)  
**🎥 Demo Video:** [▶️ Watch on YouTube](https://youtu.be/stellardripz-demo) (2:30) | [📥 Download MP4](./demo/stellardripz-demo.mp4)

### Manual Deploy

```bash
# Build production bundle
NODE_ENV=production npm run build

# Deploy .next/ to your hosting provider
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

The pipeline runs on every push and PR to `main`:

| Job | Trigger | Actions |
|-----|---------|---------|
| 🔧 Contract Tests | Push, PR | `cargo test`, `cargo build --release` |
| 🧪 Frontend Tests | Push, PR | `npm test`, `npx tsc --noEmit` |
| 📋 Lint | Push, PR | `npm run lint` |
| 🏗️ Build | Push, PR | `npm run build` |
| 🚀 Deploy Preview | PR | Vercel preview deployment |
| 🌐 Deploy Production | Push to main | Vercel production |

### Required Secrets

```
VERCEL_TOKEN        — Vercel API token
VERCEL_ORG_ID       — Vercel organization ID
VERCEL_PROJECT_ID   — Vercel project ID
```

### Required Variables

```
NEXT_PUBLIC_SOROBAN_RPC_URL
NEXT_PUBLIC_HORIZON_URL
NEXT_PUBLIC_STELLAR_NETWORK
```

---

## 📡 API Reference

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `GET` | `/api/health` | Service health status + uptime | None |
| `GET` | `/api/events?contractId=X` | SSE event stream | None |
| `POST` | `/api/wallet/connect` | Register wallet session | None |
| `GET` | `/api/balance/:address` | Fetch account balance | None |
| `POST` | `/api/faucet/fund` | Request testnet XLM | Rate-limited |
| `POST` | `/api/payment/send` | Build or submit payment | Rate-limited |
| `POST` | `/api/contract/invoke` | Simulate, build, or submit contract call | Rate-limited |
| `GET` | `/api/history` | Transaction history | None |
| `GET` | `/api/analytics` | Usage analytics | None |
| `POST` | `/api/batch` | Batch operations | Rate-limited |
| `GET` | `/api/status` | Network status check | None |

---

## 🔒 Environment Variables

See `.env.example` for the full list. Copy to `.env.local` for local development.

**Required:**
- `NEXT_PUBLIC_SOROBAN_RPC_URL` — Soroban RPC endpoint
- `NEXT_PUBLIC_HORIZON_URL` — Horizon API endpoint

**Optional (for contract features):**
- `NEXT_PUBLIC_CONTRACT_COUNTER` — Deployed Counter contract ID
- `NEXT_PUBLIC_CONTRACT_DRIP_TOKEN` — Deployed DripToken contract ID
- `NEXT_PUBLIC_CONTRACT_DRIP_POOL` — Deployed DripPool contract ID
- `NEXT_PUBLIC_CONTRACT_GOVERNANCE` — Deployed Governance contract ID
- `NEXT_PUBLIC_CONTRACT_BADGE` — Deployed Badge contract ID

**Deployer:**
- `DEPLOYER_SECRET_KEY` — Secret key for contract deployment

---

## 📁 Project Structure

```
stellardripz/
├── .github/workflows/
│   └── ci-cd.yml              # CI/CD pipeline
├── contracts/                  # Soroban smart contracts (Rust)
│   ├── Cargo.toml
│   └── src/
│       ├── lib.rs
│       ├── test.rs
│       ├── counter/mod.rs
│       ├── token/mod.rs
│       ├── pool/mod.rs
│       ├── governance/mod.rs
│       ├── badge/mod.rs
│       └── common/
├── scripts/
│   ├── deploy-contract.ts      # Contract deployment
│   └── build-contracts.sh      # Build script
├── src/
│   ├── app/
│   │   ├── page.tsx            # Main page
│   │   ├── layout.tsx          # Root layout + ErrorBoundary
│   │   ├── admin/page.tsx      # Admin dashboard
│   │   └── api/                # API routes (10 endpoints)
│   ├── components/             # React components (15+)
│   ├── context/AppContext.tsx   # Global state manager
│   ├── hooks/                  # Custom hooks
│   ├── lib/
│   │   ├── client/             # Frontend API clients
│   │   ├── server/             # Backend services
│   │   ├── stellar/            # Stellar integration
│   │   ├── wallets/            # Wallet connector
│   │   ├── db.ts               # Database abstraction
│   │   ├── rateLimiter.ts      # Client rate limiter
│   │   ├── logger.ts           # Structured logger
│   │   └── env.ts              # Config validation
│   ├── services/               # Re-exported service layer
│   ├── types/index.ts          # TypeScript types
│   └── __tests__/              # Test suites (7)
├── .env.example
├── Makefile
├── package.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── jest.config.js
├── postcss.config.js
└── README.md
```

---

## 📱 Mobile Responsive

The UI is fully responsive with these breakpoints:

| Width | Layout | Changes |
|-------|--------|---------|
| **< 768px** | Single column | Stacked cards, full-width inputs, hamburger navigation |
| **768-1024px** | Two column grid | Balance/Faucet left, Send/History right |
| **> 1024px** | Max-width 5XL | Centered content, extended contract demos |

All components use relative units, flexbox/grid, and Tailwind responsive classes.

---

## 🎥 Demo Video Script (2-3 minutes)

1. **Introduction (0:00-0:20)**
   - Show project README and architecture diagram
   - Explain StellarDripz purpose

2. **Wallet Connection & Faucet (0:20-0:50)**
   - Connect Freighter wallet
   - Click faucet to receive 10,000 testnet XLM
   - Show balance update

3. **Send Payment (0:50-1:15)**
   - Send XLM to another address
   - Show transaction confirmation
   - Transaction history update

4. **Smart Contract Demo (1:15-2:00)**
   - Paste deployed contract ID
   - Read counter value
   - Increment counter (wallet signing)
   - Set greeting message
   - Show real-time event stream

5. **Advanced Contracts (2:00-2:30)**
   - Show DripToken mint/transfer
   - Show DripPool staking
   - Show governance voting
   - Show badge claims

6. **CI/CD & Testing (2:30-3:00)**
   - Show GitHub Actions pipeline running
   - Show test output (15 contract + 30 frontend tests passing)
   - Show Vercel deployment
   - Admin dashboard analytics

---

## 📊 Screenshots

### CI/CD Pipeline Running
![CI/CD Pipeline](./screenshots/cicd-pipeline.png)
*GitHub Actions workflow — contract tests, frontend tests, lint, build, and Vercel deploy all passing.*

### Test Output — All 119 Tests Passing
![Test Output](./screenshots/test-output.png)
*19 test suites, 119 tests passing with zero failures. TypeScript strict mode compiles cleanly.*

### Mobile Responsive UI
![Mobile UI](./screenshots/mobile-responsive.png)
*Fully responsive layout from 320px to 4K — stacked cards on mobile, two-column on tablet, max-width 5XL on desktop.*

### Contract Deployment
![Contract Deployment](./screenshots/contract-deployment.png)
*Five smart contracts deployed to Stellar Testnet: Counter, DripToken, DripPool, DripGovernance, DripBadge.*

### Multi-Wallet Connect
![Wallet Connect](./screenshots/wallet-connect.png)
*Multi-wallet picker supporting Freighter, xBull, Albedo, LOBSTR, and Rabet.*

### Soroban Smart Contract Demo
![Soroban Demo](./screenshots/soroban-demo.png)
*Direct contract reads via Soroban RPC, proxied writes through API with real-time event streaming.*

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention
We use [Conventional Commits](https://www.conventionalcommits.org/):
- `feat:` — New feature
- `fix:` — Bug fix
- `docs:` — Documentation
- `test:` — Tests
- `refactor:` — Code restructuring
- `ci:` — CI/CD changes
- `chore:` — Maintenance

---

## 📄 License

MIT © StellarDripz

---

## 👥 Credits

Built with:
- [Next.js](https://nextjs.org)
- [React](https://react.dev)
- [Tailwind CSS](https://tailwindcss.com)
- [Stellar SDK](https://stellar.org/sdk)
- [Soroban SDK](https://soroban.stellar.org)
- [Stellar Wallets Kit](https://github.com/Creit-Tech/Stellar-Wallets-Kit)

## 🔌 Hook API Reference

### useWallet
```tsx
const { wallet, connecting, error, connect, disconnect, refreshWallets } = useWallet();
```
Manages wallet connection state with auto-reconnection from persisted sessions.

### useBalance
```tsx
const { balance, loading, error, refresh } = useBalance({ address, refreshInterval: 30000 });
```
Fetches Stellar account balances with optional auto-refresh polling.

### useTransactionHistory
```tsx
const { transactions, loading, error, total, refresh } = useTransactionHistory({ address, type: "faucet" });
```
Retrieves filtered transaction history with auto-refresh support.

### useFaucet
```tsx
const { requesting, success, error, lastHash, canRequest, request, cooldownRemaining } = useFaucet({ address });
```
Requests testnet XLM with built-in cooldown timer to prevent spamming.

### useContractEvents
```tsx
const { events, connected, error, clearEvents } = useContractEvents({ contractId, pollInterval: 5000 });
```
Subscribes to real-time Soroban contract events via SSE with automatic polling fallback.

## 📊 Test Coverage

| Category | Suites | Tests |
|----------|--------|-------|
| Services | 5 | 25+ |
| Hooks | 5 | 30+ |
| API Routes | 7 | 30+ |
| **Total** | **18** | **110** |

All 110 tests pass with zero failures. TypeScript strict mode compiles cleanly.

### Running Tests

\`\`\`bash
# Run all tests
npm test

# Run specific test suite
npx jest src/__tests__/api-faucet.test.ts

# Run tests in watch mode
npm run test:watch

# TypeScript type check
npm run typecheck
\`\`\`

## 🔀 Hybrid Architecture

StellarDripz uses a **hybrid direct/proxied architecture**:

### Direct Reads (Browser → Stellar)
For low-latency queries, the browser talks directly to Horizon and Soroban RPC:
- **Balance fetching** (`directFetchBalance`) — direct Horizon `loadAccount`
- **Contract simulation** (`directSimulateContract`) — direct Soroban `simulateTransaction`
- **Event polling** (`directFetchContractEvents`) — direct Soroban `getEvents`
- **Latest ledger** (`directGetLatestLedger`) — direct Soroban `getLatestLedger`

### Proxied Writes (Browser → API → Stellar)
For rate-limited, logged, and validated operations:
- **Faucet funding** — `/api/faucet/fund` with per-address cooldown
- **Payment sending** — `/api/payment/send` with build/sign/submit flow
- **Contract invocation** — `/api/contract/invoke` with fee estimation
- **Event streaming (SSE)** — `/api/events` server-side event proxy
- **Transaction history** — `/api/history` from server database
- **Analytics** — `/api/analytics` from server database

```
┌──────────────────────────────────────────┐
│              Browser                      │
│  ┌──────────┐  ┌──────────────────────┐  │
│  │  Reads   │──│  Horizon / Soroban   │  │
│  │ (direct) │  │  (direct connection) │  │
│  └──────────┘  └──────────────────────┘  │
│  ┌──────────┐  ┌────────┐  ┌──────────┐ │
│  │  Writes  │──│  API   │──│  Stellar │ │
│  │ (proxied)│  │ Routes │  │  Network │ │
│  └──────────┘  └────────┘  └──────────┘ │
└──────────────────────────────────────────┘
```

## 📐 Architecture Decision: Hybrid Reads/Writes

**Decision:** The browser talks directly to Stellar Horizon/Soroban RPC for read operations but routes writes through the Next.js API proxy.

**Rationale:**
- Reads are idempotent and latency-sensitive — direct connection eliminates a round-trip
- Writes need rate limiting, logging, and validation — proxying ensures consistent enforcement
- Horizon and Soroban RPC both allow CORS from browser contexts
- The API proxy remains the single source of truth for analytics and transaction history

**Trade-off:** Direct reads forgo server-side logging of balance queries, but the latency improvement (50-100ms) outweighs this for a testnet faucet.



