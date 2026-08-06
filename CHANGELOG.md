# Changelog

All notable changes to StellarDripz are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] — 2026-08-06

### Added
- **5 smart contracts**: DripToken (SEP-41), DripPool (staking), DripGovernance, DripBadge, Counter
- **Inter-contract communication**: DripPool↔DripToken, DripGovernance↔DripToken cross-contract calls
- **Hybrid architecture**: Direct browser→Stellar reads, proxied API writes
- **SSE event streaming**: Real-time contract events with polling fallback
- **19 test suites**: 119 frontend tests + 19 Rust contract tests
- **CI/CD pipeline**: 6-stage GitHub Actions (contracts → tests → lint → build → preview → production)
- **API Gateway**: 11 rate-limited API routes with session management
- **Admin dashboard**: Analytics and transaction monitoring at `/admin`
- **Error handling**: ErrorBoundary, AsyncBoundary, Skeleton loading states
- **Multi-wallet support**: Freighter, xBull, Albedo, LOBSTR, Rabet
- **Comprehensive documentation**: 23-section README with architecture diagrams and API reference

### Changed
- Refactored counter into multi-contract module architecture
- Migrated balance reads from API proxy to direct Horizon calls
- Upgraded wallet abstraction layer for Stellar Wallets Kit v2

### Fixed
- Removed duplicate `/api/fund` route (canonical is `/api/faucet/fund`)
- Consolidated duplicate type definitions into `stellar.d.ts`
- Fixed stray export in API client barrel file

---

## [1.0.0] — 2026-07-01

### Added
- **Initial release**: Testnet XLM faucet with Stellar Friendbot integration
- **Wallet connection**: Freighter wallet support with connect/sign/disconnect
- **Multi-asset balance**: Horizon balance fetching for XLM + custom assets
- **Send payments**: Build, sign, and submit Stellar transactions
- **Soroban counter contract**: Deploy and interact with on-chain counter + greeting
- **Transaction history**: Session log of faucet, send, and contract operations
- **QR codes**: Wallet address and payment request QR generation
- **Address book**: localStorage-based saved addresses
- **Dark theme UI**: Glassmorphism design with Tailwind CSS
- **Mobile responsive**: Full responsive layout from 320px to 4K

---

[2.0.0]: https://github.com/StellarDripz/StellarDripz/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/StellarDripz/StellarDripz/releases/tag/v1.0.0
