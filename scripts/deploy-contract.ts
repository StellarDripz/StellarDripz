#!/usr/bin/env ts-node
/**
 * StellarDripz Multi-Contract Deployment Script
 *
 * Deploys all StellarDripz smart contracts to Stellar Testnet.
 * The WASM is uploaded once (WASM-write deduplication).
 * Each contract is deployed as a separate instance.
 *
 * Usage:
 *   export DEPLOYER_SECRET_KEY="S..."
 *   npx ts-node --transpile-only scripts/deploy-contract.ts
 *
 * Requirements:
 *   - Funded Stellar Testnet account (~5 XLM recommended)
 *   - Compiled WASM: contracts/target/wasm32v1-none/release/stellardripz.wasm
 *   - Rust toolchain with wasm32v1-none target (Rust 1.84+)
 */

import * as StellarSdk from "@stellar/stellar-sdk";
import * as fs from "fs";
import * as path from "path";

const RPC_URL = process.env.SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE = process.env.NETWORK_PASSPHRASE || "Test SDF Network ; September 2015";
const HORIZON_URL = process.env.HORIZON_URL || "https://horizon-testnet.stellar.org";
const SECRET_KEY = process.env.DEPLOYER_SECRET_KEY || "";

const WASM_PATH = path.join(__dirname, "..", "contracts", "target", "wasm32v1-none", "release", "stellardripz.wasm");

async function waitForTx(server: StellarSdk.rpc.Server, hash: string, label: string): Promise<StellarSdk.SorobanRpc.Api.GetTransactionResponse> {
  for (let i = 0; i < 30; i++) {
    const tx = await server.getTransaction(hash);
    if (tx.status !== StellarSdk.SorobanRpc.Api.GetTransactionStatus.NOT_FOUND) {
      return tx;
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Timeout waiting for ${label} — TX: ${hash}`);
}

async function main() {
  if (!SECRET_KEY) {
    console.error("❌ DEPLOYER_SECRET_KEY is required. Set it to a funded Testnet secret key.");
    process.exit(1);
  }
  if (!fs.existsSync(WASM_PATH)) {
    console.error(`❌ WASM not found at ${WASM_PATH}\n   Build with: npm run contracts:build`);
    process.exit(1);
  }

  const rpc = new StellarSdk.rpc.Server(RPC_URL);
  const horizon = new StellarSdk.Horizon.Server(HORIZON_URL);
  const keypair = StellarSdk.Keypair.fromSecret(SECRET_KEY);
  const deployerPub = keypair.publicKey();

  console.log("╔══════════════════════════════════════════════════════╗");
  console.log("║      StellarDripz Multi-Contract Deployer          ║");
  console.log("╚══════════════════════════════════════════════════════╝");
  console.log(`📡 RPC:   ${RPC_URL}`);
  console.log(`🔑 Key:   ${deployerPub}`);

  const account = await horizon.loadAccount(deployerPub);
  const xlmBalance = account.balances.find((b) => b.asset_type === "native")?.balance || "0";
  console.log(`💰 XLM:   ${xlmBalance}`);

  const wasmBuffer = fs.readFileSync(WASM_PATH);
  const wasmHash = StellarSdk.hash(wasmBuffer);
  const wasmHashHex = wasmHash.toString("hex");
  console.log(`📦 WASM:  ${(wasmBuffer.length / 1024).toFixed(2)} KB`);
  console.log(`🔐 Hash:  ${wasmHashHex}`);

  // Step 1: Upload WASM (reuses Stellar's write dedup)
  console.log("\n─── Step 1: Upload WASM ───");
  const feeStats = await horizon.fetchBaseFee();
  const fee = String(Math.floor(Number(feeStats) * 2));
  const sourceAccount = await horizon.loadAccount(deployerPub);

  const uploadOp = StellarSdk.Operation.invokeHostFunction({
    func: StellarSdk.xdr.HostFunction.hostFunctionTypeUploadContractWasm(wasmBuffer),
    auth: [],
  });

  let uploadTx = new StellarSdk.TransactionBuilder(sourceAccount, { fee, networkPassphrase: NETWORK_PASSPHRASE })
    .addOperation(uploadOp).setTimeout(30).build();

  console.log("🔄 Simulating upload...");
  const simResult = await rpc.simulateTransaction(uploadTx);
  if (StellarSdk.SorobanRpc.Api.isSimulationError(simResult)) {
    // WASM may already exist — try with create-only
    console.log("   WASM may already exist, trying create-only...");
  }

  // Step 2: Deploy each contract with unique salt
  console.log("\n─── Step 2: Deploy Contracts ───\n");

  const contracts: Array<{ name: string; salt: Buffer; initFn?: string; initArgs?: StellarSdk.xdr.ScVal[] }> = [
    { name: "Counter",  salt: Buffer.from("DRIP_COUNTER_00", "utf-8") },
    { name: "DripToken", salt: Buffer.from("DRIP_TOKEN_0000", "utf-8") },
    { name: "DripPool", salt: Buffer.from("DRIP_POOL_00000", "utf-8") },
    { name: "Governance", salt: Buffer.from("DRIP_GOVERN_000", "utf-8") },
    { name: "Badge",    salt: Buffer.from("DRIP_BADGE_0000", "utf-8") },
  ];

  const deployed: Record<string, string> = {};

  for (const contract of contracts) {
    const preimage = StellarSdk.xdr.ContractIdPreimage.contractIdPreimageFromAddress(
      new StellarSdk.xdr.ContractIdPreimageFromAddress({
        address: StellarSdk.xdr.ScAddress.scAddressTypeAccount(
          StellarSdk.StrKey.decodeEd25519PublicKey(deployerPub)
        ),
        salt: contract.salt,
      })
    );

    const createOp = StellarSdk.Operation.invokeHostFunction({
      func: StellarSdk.xdr.HostFunction.hostFunctionTypeCreateContract(
        new StellarSdk.xdr.CreateContractArgs({
          contractIdPreimage: preimage,
          executable: StellarSdk.xdr.ContractExecutable.contractExecutableWasm(wasmBuffer),
        })
      ),
      auth: [],
    });

    const srcAccount = await horizon.loadAccount(deployerPub);
    const tx = new StellarSdk.TransactionBuilder(srcAccount, { fee, networkPassphrase: NETWORK_PASSPHRASE })
      .addOperation(uploadOp).addOperation(createOp).setTimeout(30).build();

    console.log(`🔧 Deploying ${contract.name}...`);

    try {
      const sim = await rpc.simulateTransaction(tx);
      if (StellarSdk.SorobanRpc.Api.isSimulationError(sim)) {
        console.log(`   ⚠️  ${contract.name}: Simulation error — ${sim.error}`);
        continue;
      }

      const prepared = StellarSdk.SorobanRpc.assembleTransaction(tx, sim);
      prepared.sign(keypair);
      const resp = await rpc.sendTransaction(prepared);
      console.log(`   📝 TX: ${resp.hash}`);

      await waitForTx(rpc, resp.hash, contract.name);
      const cid = StellarSdk.contractIdFromWasmHash(wasmBuffer, contract.salt).toString("hex");
      deployed[contract.name] = cid;
      console.log(`   ✅ ${contract.name}: ${cid}`);
    } catch (err) {
      // Try create-only (WASM may already be uploaded)
      try {
        const createOnlyTx = new StellarSdk.TransactionBuilder(
          await horizon.loadAccount(deployerPub),
          { fee, networkPassphrase: NETWORK_PASSPHRASE }
        ).addOperation(createOp).setTimeout(30).build();

        const sim = await rpc.simulateTransaction(createOnlyTx);
        if (StellarSdk.SorobanRpc.Api.isSimulationError(sim)) {
          console.log(`   ⚠️  ${contract.name}: ${sim.error} (may already be deployed)`);
          continue;
        }

        const prepared = StellarSdk.SorobanRpc.assembleTransaction(createOnlyTx, sim);
        prepared.sign(keypair);
        const resp = await rpc.sendTransaction(prepared);
        console.log(`   📝 TX (create): ${resp.hash}`);
        await waitForTx(rpc, resp.hash, `${contract.name} (create)`);
        const cid = StellarSdk.contractIdFromWasmHash(wasmBuffer, contract.salt).toString("hex");
        deployed[contract.name] = cid;
        console.log(`   ✅ ${contract.name}: ${cid}`);
      } catch (err2) {
        console.log(`   ❌ ${contract.name}: ${err2 instanceof Error ? err2.message : "Failed"}`);
      }
    }
  }

  // Summary
  console.log("\n" + "=".repeat(64));
  console.log("   DEPLOYMENT SUMMARY");
  console.log("=".repeat(64));
  for (const [name, cid] of Object.entries(deployed)) {
    console.log(`   ${name.padEnd(14)} ${cid}`);
    console.log(`   ${" ".repeat(14)} https://stellar.expert/explorer/testnet/contract/${cid}`);
  }
  console.log("=".repeat(64));

  // Print env vars
  if (deployed.Counter) console.log(`\nNEXT_PUBLIC_CONTRACT_COUNTER=${deployed.Counter}`);
  if (deployed.DripToken) console.log(`NEXT_PUBLIC_CONTRACT_DRIP_TOKEN=${deployed.DripToken}`);
  if (deployed.DripPool) console.log(`NEXT_PUBLIC_CONTRACT_DRIP_POOL=${deployed.DripPool}`);
  if (deployed.Governance) console.log(`NEXT_PUBLIC_CONTRACT_GOVERNANCE=${deployed.Governance}`);
  if (deployed.Badge) console.log(`NEXT_PUBLIC_CONTRACT_BADGE=${deployed.Badge}`);
}

main().catch((err) => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});
