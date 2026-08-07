#!/usr/bin/env bash
# Build all StellarDripz smart contracts
# Requirements: Rust toolchain with wasm32v1-none target (Rust 1.84+)
set -euo pipefail

echo "🏗️  Building StellarDripz smart contracts..."
echo "============================================"

cd "$(dirname "$0")/../contracts"

# Ensure wasm target is installed (Soroban SDK 27+ requires wasm32v1-none)
if ! rustup target list --installed | grep -q wasm32v1-none; then
    echo "📦 Installing wasm32v1-none target..."
    rustup target add wasm32v1-none
fi

# Optimized release build
echo "🔨 Compiling contracts (release, optimized)..."
cargo build --target wasm32v1-none --release

# Output
WASM_PATH="target/wasm32v1-none/release/stellardripz.wasm"
if [ -f "$WASM_PATH" ]; then
    SIZE=$(ls -lh "$WASM_PATH" | awk '{print $5}')
    echo ""
    echo "✅ Build successful!"
    echo "📦 WASM: $WASM_PATH ($SIZE)"
    echo ""
    echo "📋 Next steps:"
    echo "  1. Run tests:      cd contracts && cargo test"
    echo "  2. Deploy:         ts-node scripts/deploy-contract.ts"
else
    echo "❌ Build failed — WASM not found at $WASM_PATH"
    exit 1
fi
