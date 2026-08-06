# Contributing to StellarDripz

Thank you for your interest in contributing! StellarDripz is a testnet faucet and smart contract platform built with Next.js 14, Soroban, and TypeScript.

## Code of Conduct

Please read our [Code of Conduct](./CODE_OF_CONDUCT.md) before contributing. We are committed to providing a welcoming and inclusive environment.

## How to Contribute

### Reporting Bugs

1. Check the [existing issues](https://github.com/StellarDripz/StellarDripz/issues) to avoid duplicates
2. Use the **Bug Report** template when opening a new issue
3. Include:
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment (browser, wallet, OS, Node version)
   - Screenshots if applicable

### Suggesting Features

1. Use the **Feature Request** template
2. Describe the problem your feature solves
3. Include possible implementation approaches

### Pull Request Process

1. **Fork** the repository and create a feature branch:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Follow our conventions:**
   - TypeScript strict mode — no `any` types
   - 2-space indentation (see `.editorconfig`)
   - Conventional commits: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, `ci:`, `chore:`

3. **Write tests** for new functionality:
   - Frontend: Jest + React Testing Library
   - Contracts: Rust `#[test]` in the relevant module

4. **Run the full verification suite:**
   ```bash
   npm run verify          # TypeCheck + Tests
   npm run contracts:test  # Rust contract tests
   npm run contracts:build # Verify WASM compilation
   ```

5. **Update documentation** if your change affects APIs, architecture, or setup

6. **Submit your PR** against the `main` branch

### PR Checklist

- [ ] All tests pass (`npm test`)
- [ ] TypeScript compiles cleanly (`npx tsc --noEmit`)
- [ ] Smart contracts build (`npm run contracts:build`)
- [ ] Code follows existing conventions
- [ ] Commit messages use conventional commits format
- [ ] Documentation updated if needed
- [ ] New tests added for new functionality

## Development Setup

```bash
# Clone
git clone https://github.com/StellarDripz/StellarDripz.git
cd stellardripz

# Install
npm install
rustup target add wasm32-unknown-unknown

# Configure
cp .env.example .env.local

# Run
npm run dev           # Next.js dev server
npm test              # Frontend tests
npm run contracts:test # Contract tests
```

## Project Structure

See the [README](./README.md#-project-structure) for a complete file tree.

## Architecture Decisions

Key architectural decisions are documented in the [README](./README.md#-hybrid-architecture):
- **Hybrid reads/writes**: Direct Horizon reads, proxied API writes
- **API Gateway pattern**: All writes go through rate-limited Next.js API routes
- **Multi-wallet abstraction**: Unified interface for Freighter, xBull, Albedo, LOBSTR, Rabet

## Getting Help

- **Questions?** Open a [GitHub Discussion](https://github.com/StellarDripz/StellarDripz/discussions)
- **Stuck on a PR?** Mention `@maintainers` in a comment
- **Security issues?** See [SECURITY.md](./SECURITY.md)

---

*Happy building! 💧*
