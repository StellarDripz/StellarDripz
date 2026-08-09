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

### Bug Bounty

We offer recognition and rewards for valid security reports:

| Severity | Reward | Examples |
|----------|--------|----------|
| Critical | $500–$2,000 + Hall of Fame | Smart contract fund drain, RCE, auth bypass |
| High | $200–$500 | Data exposure, significant access control flaws |
| Medium | $50–$200 | CSRF, XSS, input validation bypass |
| Low | Recognition + Hall of Fame | Information disclosure, best practice issues |

Rewards are paid in XLM on Stellar testnet. All valid reports receive Hall of Fame recognition regardless of reward tier.

### Safe Harbor

We will not pursue legal action against researchers who:
- Act in good faith and follow this disclosure policy
- Avoid privacy violations, data destruction, and service interruption
- Provide a reasonable time for remediation before public disclosure

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
- **cargo audit** — Rust dependency scanning on every CI/CD build

---

*Last updated: August 2026*
