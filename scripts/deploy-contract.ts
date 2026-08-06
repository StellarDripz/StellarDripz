/**
 * Deploy script for the StellarDripz Counter smart contract.
 *
 * Usage:
 *   npx ts-node --project tsconfig.deploy.json scripts/deploy-contract.ts
 *
 * Requirements:
 *   - A funded Stellar Testnet account (secret key in env or hardcoded below)
 *   - Compiled WASM at contracts/target/wasm32-unknown-unknown/release/stellardripz_counter.wasm
 *
 * This script:
 *   1. Reads the compiled WASM
 *   2. Uploads the WASM to the Stellar Testnet
 *   3. Creates the contract instance
 *   4. Prints the deployed contract ID for use in the frontend
 */

import * as StellarSdk from "@stellar/stellar-sdk";
import * as fs from "fs";
import * as path from "path";

// --- Configuration ---

const RPC_URL =
  process.env.SOROBAN_RPC_URL || "https://soroban-testnet.stellar.org";
const NETWORK_PASSPHRASE =
  process.env.NETWORK_PASSPHRASE || "Test SDF Network ; September 2015";
const HORIZON_URL =
  process.env.HORIZON_URL || "https://horizon-testnet.stellar.org";

// Secret key of a FUNDED Testnet account
const SECRET_KEY =
  process.env.DEPLOYER_SECRET_KEY || "";

// --- Main ---

async function main() {
  if (!SECRET_KEY) {
    console.error(
      "❌ DEPLOYER_SECRET_KEY environment variable is required.\n" +
        "   Set it to the secret key (starting with S...) of a funded Testnet account."
    );
    process.exit(1);
  }

  const server = new StellarSdk.rpc.Server(RPC_URL);
  const horizon = new StellarSdk.Horizon.Server(HORIZON_URL);
  const keypair = StellarSdk.Keypair.fromSecret(SECRET_KEY);

  console.log(`📡 Using RPC: ${RPC_URL}`);
  console.log(`🔑 Deployer: ${keypair.publicKey()}`);

  // Check deployer balance
  try {
    const account = await horizon.loadAccount(keypair.publicKey());
    const balances = account.balances.filter(
      (b) => b.asset_type === "native"
    );
    const xlmBalance = balances.length > 0 ? balances[0].balance : "0";
    console.log(`💰 Deployer balance: ${xlmBalance} XLM`);
  } catch {
    console.error("❌ Deployer account not found. Fund it first.");
    process.exit(1);
  }

  // 1. Read the compiled WASM
  const wasmPath = path.join(
    __dirname,
    "..",
    "contracts",
    "target",
    "wasm32-unknown-unknown",
    "release",
    "stellardripz_counter.wasm"
  );

  if (!fs.existsSync(wasmPath)) {
    console.error(
      `❌ WASM file not found at ${wasmPath}\n` +
        "   Run: cd contracts && cargo build --target wasm32-unknown-unknown --release"
    );
    process.exit(1);
  }

  const wasmBuffer = fs.readFileSync(wasmPath);
  console.log(`📦 WASM size: ${(wasmBuffer.length / 1024).toFixed(2)} KB`);

  // 2. Compute the WASM hash
  const wasmHash = StellarSdk.hash(wasmBuffer);
  const wasmHashHex = wasmHash.toString("hex");
  console.log(`🔐 WASM Hash: ${wasmHashHex}`);

  // 3. Build and submit the upload + deploy transaction
  console.log("\n🚀 Submitting contract deployment...");

  const sourceAccount = await horizon.loadAccount(keypair.publicKey());
  const feeStats = await horizon.fetchBaseFee();
  const fee = String(Math.floor(Number(feeStats) * 2));

  // Upload WASM operation
  const uploadOp = StellarSdk.Operation.invokeHostFunction({
    func: StellarSdk.xdr.HostFunction.hostFunctionTypeUploadContractWasm(
      wasmBuffer
    ),
    auth: [],
  });

  // Create contract operation (using salt=0 for deterministic address)
  const salt = Buffer.alloc(32, 0);

  const preimage = StellarSdk.xdr.ContractIdPreimage.contractIdPreimageFromAddress(
    new StellarSdk.xdr.ContractIdPreimageFromAddress({
      address: StellarSdk.xdr.ScAddress.scAddressTypeAccount(
        StellarSdk.StrKey.decodeEd25519PublicKey(keypair.publicKey())
      ),
      salt,
    })
  );

  const createOp = StellarSdk.Operation.invokeHostFunction({
    func: StellarSdk.xdr.HostFunction.hostFunctionTypeCreateContract(
      new StellarSdk.xdr.CreateContractArgs({
        contractIdPreimage: preimage,
        executable:
          StellarSdk.xdr.ContractExecutable.contractExecutableWasm(
            wasmBuffer
          ),
      })
    ),
    auth: [],
  });

  // Build transaction with both operations
  let tx = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(uploadOp)
    .addOperation(createOp)
    .setTimeout(30)
    .build();

  // Simulate
  console.log("🔄 Simulating...");
  const simResponse = await server.simulateTransaction(tx);

  if (StellarSdk.SorobanRpc.Api.isSimulationError(simResponse)) {
    console.error(`❌ Simulation failed: ${simResponse.error}`);
    // Try just uploading if already created
    console.log("🔄 Contract may already be deployed. Trying upload-only...");

    tx = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee,
      networkPassphrase: NETWORK_PASSPHRASE,
    })
      .addOperation(uploadOp)
      .setTimeout(30)
      .build();

    const sim2 = await server.simulateTransaction(tx);
    if (StellarSdk.SorobanRpc.Api.isSimulationError(sim2)) {
      console.error(`❌ Upload simulation also failed: ${sim2.error}`);
      process.exit(1);
    }

    const preparedTx = StellarSdk.SorobanRpc.assembleTransaction(tx, sim2);
    preparedTx.sign(keypair);
    const response = await server.sendTransaction(preparedTx);

    console.log(`📝 Upload-only TX: ${response.hash}`);

    // Poll for confirmation
    let getTx = await server.getTransaction(response.hash);
    let attempts = 0;
    while (
      getTx.status ===
        StellarSdk.SorobanRpc.Api.GetTransactionStatus.NOT_FOUND &&
      attempts < 30
    ) {
      await new Promise((r) => setTimeout(r, 1000));
      getTx = await server.getTransaction(response.hash);
      attempts++;
    }

    if (
      getTx.status === StellarSdk.SorobanRpc.Api.GetTransactionStatus.SUCCESS
    ) {
      console.log("✅ WASM uploaded successfully!");
      console.log(`🔐 WASM Hash: ${wasmHashHex}`);

      // Now deploy
      const deployPreimage =
        StellarSdk.xdr.ContractIdPreimage.contractIdPreimageFromAddress(
          new StellarSdk.xdr.ContractIdPreimageFromAddress({
            address: StellarSdk.xdr.ScAddress.scAddressTypeAccount(
              StellarSdk.StrKey.decodeEd25519PublicKey(keypair.publicKey())
            ),
            salt,
          })
        );

      const deployOp = StellarSdk.Operation.invokeHostFunction({
        func: StellarSdk.xdr.HostFunction.hostFunctionTypeCreateContract(
          new StellarSdk.xdr.CreateContractArgs({
            contractIdPreimage: deployPreimage,
            executable:
              StellarSdk.xdr.ContractExecutable.contractExecutableWasm(
                wasmBuffer
              ),
          })
        ),
        auth: [],
      });

      const deployTx = new StellarSdk.TransactionBuilder(
        sourceAccount,
        { fee, networkPassphrase: NETWORK_PASSPHRASE }
      )
        .addOperation(deployOp)
        .setTimeout(30)
        .build();

      const deploySim = await server.simulateTransaction(deployTx);
      if (StellarSdk.SorobanRpc.Api.isSimulationError(deploySim)) {
        console.error(`❌ Deploy simulation failed: ${deploySim.error}`);

        // Try to derive contract ID
        const contractId = StellarSdk.contractIdFromWasmHash(
          wasmBuffer,
          salt
        );
        console.log(`📜 Contract may already be deployed: ${contractId.toString("hex")}`);
        return;
      }

      const deployPrepared = StellarSdk.SorobanRpc.assembleTransaction(
        deployTx,
        deploySim
      );
      deployPrepared.sign(keypair);
      const deployResp = await server.sendTransaction(deployPrepared);
      console.log(`📝 Deploy TX: ${deployResp.hash}`);
      console.log(
        `⏳ Waiting for confirmation...`
      );

      let deployResult = await server.getTransaction(deployResp.hash);
      let deployAttempts = 0;
      while (
        deployResult.status ===
          StellarSdk.SorobanRpc.Api.GetTransactionStatus.NOT_FOUND &&
        deployAttempts < 30
      ) {
        await new Promise((r) => setTimeout(r, 1000));
        deployResult = await server.getTransaction(deployResp.hash);
        deployAttempts++;
      }

      if (
        deployResult.status ===
        StellarSdk.SorobanRpc.Api.GetTransactionStatus.SUCCESS
      ) {
        const contractId = StellarSdk.contractIdFromWasmHash(
          wasmBuffer,
          salt
        );
        printSuccess(deployResp.hash, contractId.toString("hex"));
      } else {
        console.error(
          `❌ Deploy failed: ${deployResult.status}`
        );
      }
    }
    return;
  }

  // Prepare and submit
  const preparedTx = StellarSdk.SorobanRpc.assembleTransaction(tx, simResponse);
  preparedTx.sign(keypair);
  const response = await server.sendTransaction(preparedTx);

  console.log(`📝 Transaction hash: ${response.hash}`);
  console.log(`⏳ Waiting for confirmation...`);

  // Poll for confirmation
  let getTx = await server.getTransaction(response.hash);
  let attempts = 0;
  while (
    getTx.status ===
      StellarSdk.SorobanRpc.Api.GetTransactionStatus.NOT_FOUND &&
    attempts < 30
  ) {
    await new Promise((r) => setTimeout(r, 1000));
    getTx = await server.getTransaction(response.hash);
    attempts++;
  }

  if (
    getTx.status === StellarSdk.SorobanRpc.Api.GetTransactionStatus.SUCCESS
  ) {
    const contractId = StellarSdk.contractIdFromWasmHash(wasmBuffer, salt);
    printSuccess(response.hash, contractId.toString("hex"));
  } else {
    console.error(`❌ Deploy failed with status: ${getTx.status}`);
    if ((getTx as unknown as { resultXdr?: string }).resultXdr) {
      console.error(
        `   Result: ${(getTx as unknown as { resultXdr: string }).resultXdr}`
      );
    }
  }
}

function printSuccess(txHash: string, contractId: string): void {
  console.log("\n" + "=".repeat(60));
  console.log("✅ CONTRACT DEPLOYED SUCCESSFULLY!");
  console.log("=".repeat(60));
  console.log(`\n📜 Contract ID:   ${contractId}`);
  console.log(`🔗 Transaction:    ${txHash}`);
  console.log(
    `🌐 Explorer:       https://stellar.expert/explorer/testnet/contract/${contractId}`
  );
  console.log(`📝 TX Explorer:    https://stellar.expert/explorer/testnet/tx/${txHash}`);
  console.log("\n👉 Copy the Contract ID and paste it into the StellarDripz UI.");
  console.log("=".repeat(60) + "\n");
}

main().catch((err) => {
  console.error("❌ Fatal error:", err);
  process.exit(1);
});
