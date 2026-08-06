# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.x.x   | :white_check_mark: |
| 1.x.x   | :x:                |

## Reporting a Vulnerability

The StellarDripz team takes security seriously. We appreciate your efforts to responsibly disclose findings.

### How to Report

- **Do NOT open a public GitHub issue** for security vulnerabilities.
- Email us at **security@stellardripz.dev** (or open a private security advisory on GitHub).
- Include as much detail as possible: steps to reproduce, affected versions, potential impact.
- Allow up to **72 hours** for an initial response.

### What to Expect

| Stage | Timeline |
|-------|----------|
| Acknowledgement | Within 72 hours |
| Confirmation & assessment | Within 5 business days |
| Patch release | Within 14 days (critical), 30 days (moderate) |
| Public disclosure | After patch is released |

### Scope

Security reports related to:
- Smart contract vulnerabilities (Soroban/Rust)
- API route exploits (Next.js server)
- Wallet integration issues
- Dependency supply chain risks
- Data exposure or leakage

### Out of Scope

- Theoretical attacks requiring physical access
- Social engineering
- DDoS attacks (the app runs on testnet — rate limiting handles these)
- Issues in third-party services beyond our control

### Recognition

We maintain a [Security Hall of Fame](./SECURITY_HOF.md) for researchers who responsibly disclose vulnerabilities. With permission, we'll credit you in the release notes.

## Security Best Practices

### For Contributors
- Never commit secrets or API keys — use `.env.local` (gitignored)
- Review all dependency changes for supply chain risks
- Enable 2FA on your GitHub account
- Sign your commits with GPG

### For Users
- StellarDripz operates on **Stellar Testnet only** — never use mainnet keys
- Verify the URL is `stellardripz.vercel.app` before connecting your wallet
- Review transaction details in your wallet before signing
- Never share your secret key or seed phrase

## Dependency Security

We use automated tools to monitor dependencies:
- **Dependabot** — weekly dependency updates
- **npm audit** — runs on every CI/CD build
- **cargo audit** — Rust dependency scanning (planned)

---

*Last updated: August 2026*
