.PHONY: help dev build start test lint deploy-contract build-contracts clean all

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

all: clean build-contracts test build ## Full build pipeline

# ─── Development ────────────────────────────────────────────────────

dev: ## Start Next.js dev server
	npm run dev

build: ## Build Next.js for production
	npm run build

start: ## Start production server
	npm start

# ─── Contracts ──────────────────────────────────────────────────────

build-contracts: ## Compile smart contracts to WASM
	@echo "🔨 Building smart contracts..."
	cd contracts && cargo build --target wasm32-unknown-unknown --release
	@echo "✅ Contracts built: contracts/target/wasm32-unknown-unknown/release/stellardripz.wasm"

test-contracts: ## Run contract tests
	@echo "🧪 Running contract tests..."
	cd contracts && cargo test --verbose
	@echo "✅ Contract tests passed"

deploy-contract: build-contracts ## Deploy counter contract to Testnet
	@echo "🚀 Deploying contract..."
	npx ts-node --transpile-only scripts/deploy-contract.ts

# ─── Frontend ──────────────────────────────────────────────────────

test: ## Run frontend tests
	npm test

test-watch: ## Run tests in watch mode
	npm test -- --watch

typecheck: ## TypeScript type check
	npx tsc --noEmit

lint: ## Lint the project
	npm run lint

lint-fix: ## Auto-fix lint issues
	npm run lint -- --fix

# ─── Cleanup ────────────────────────────────────────────────────────

clean: ## Clean build artifacts
	@echo "🧹 Cleaning..."
	rm -rf .next contracts/target
	@echo "✅ Clean"
# Lint: runs ESLint on all source files
# Deploy: push to Vercel production

