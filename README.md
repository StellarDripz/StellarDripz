# 💧 StellarDripz — Testnet XLM Faucet

![StellarDripz](https://img.shields.io/badge/Stellar-Testnet-blue?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-3-38bdf8?style=flat-square&logo=tailwindcss)
![Soroban](https://img.shields.io/badge/Soroban-Contracts-purple?style=flat-square)

**StellarDripz** is a full-featured, developer-focused Stellar Testnet dApp. Connect any Stellar wallet, request testnet XLM faucet funds, send transactions, deploy and interact with Soroban smart contracts — all with real-time event tracking.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 **Multi-Wallet** | Connect Freighter, xBull, Albedo, LOBSTR, Rabet — wallet picker modal |
| 🛡️ **Network Detection** | Warns if wallet is on Mainnet — testnet only |
| 💰 **Multi-Asset Balance** | Real-time XLM + custom asset balances with manual refresh |
| 💧 **One-Click Faucet** | Request 10,000 testnet XLM via Friendbot |
| 📤 **Send Assets** | Send XLM or custom assets to any address, signed via connected wallet |
| 📜 **Smart Contracts** | Deploy and interact with Soroban contracts on testnet |
| 🔢 **Contract Counter** | Read + increment a counter stored on-chain |
| ✉️ **Contract Greeting** | Read + set a greeting message on-chain |
| 🔔 **Real-Time Events** | 5-second polling for contract-emitted events with live log |
| 📋 **Transaction History** | Session log of faucet, send, and contract transactions |
| 🔗 **Explorer Links** | Direct links to Stellar Expert for all transactions |
| 📊 **Tx Status Tracker** | Live pending/success/error status bar |
| 📱 **QR Codes** | Generate QR for wallet address + payment requests |
| 📖 **Address Book** | Save frequent addresses in localStorage |
| 🎨 **Beautiful UI** | Dark theme, glassmorphism, micro-animations |

---

## 🛠️ Tech Stack

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
- **Language:** TypeScript
- **Styling:** [Tailwind CSS 3](https://tailwindcss.com/)
- **Blockchain:**
  - [`@stellar/stellar-sdk`](https://www.npmjs.com/package/@stellar/stellar-sdk) — Horizon client, Soroban RPC, transaction building
  - [`@stellar/freighter-api`](https://www.npmjs.com/package/@stellar/freighter-api) — Freighter wallet connection & signing
- **Smart Contracts:** [Soroban SDK (Rust)](https://soroban.stellar.org/) — Contract development & deployment
- **QR Codes:** [`qrcode.react`](https://www.npmjs.com/package/qrcode.react)
- **Testing:** Jest + ts-jest + jsdom
- **Deployment:** Vercel (recommended)

---

## 📦 Setup Instructions

### Prerequisites

- **Node.js** 18.x or higher
- **npm** or **yarn**
- A **Stellar wallet** browser extension (Freighter, xBull, Albedo, LOBSTR, or Rabet)
- Wallet set to **Testnet** network
- **Rust** + **wasm32 target** (for contract compilation):
  ```bash
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
  rustup target add wasm32-unknown-unknown
  ```

### 1. Clone the Repository

```bash
git clone https://github.com/StellarDripz/StellarDripz.git
cd StellarDripz
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment (Optional)

```bash
cp .env.local.example .env.local
```

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_HORIZON_URL` | `https://horizon-testnet.stellar.org` | Horizon API endpoint |
| `NEXT_PUBLIC_FRIENDBOT_URL` | `https://friendbot.stellar.org` | Friendbot API endpoint |
| `NEXT_PUBLIC_STELLAR_EXPERT_URL` | `https://stellar.expert/explorer/testnet` | Block explorer URL |
| `NEXT_PUBLIC_NETWORK_PASSPHRASE` | `Test SDF Network ; September 2015` | Testnet passphrase |
| `NEXT_PUBLIC_SOROBAN_RPC_URL` | `https://soroban-testnet.stellar.org` | Soroban RPC endpoint |
| `NEXT_PUBLIC_CONTRACT_EXPLORER_URL` | `https://stellar.expert/explorer/testnet/contract` | Contract explorer URL |

### 4. Start Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build for Production

```bash
npm run build
npm start
```

### 6. Run Tests

```bash
npm test
```

---

## 📜 Smart Contract Deployment

### Compile the Contract

```bash
cd contracts
cargo build --target wasm32-unknown-unknown --release
```

### Deploy to Testnet

Set your funded testnet secret key and run:

```bash
DEPLOYER_SECRET_KEY=S... npx ts-node scripts/deploy-contract.ts
```

The script will output:
- **Contract ID** — paste into the StellarDripz UI
- **Transaction Hash** — verifiable on Stellar Expert

### Interact from the UI

1. Connect any wallet (Freighter recommended)
2. Paste the deployed Contract ID into the input field
3. Click **Read** to fetch the current counter/greeting
4. Click **+ Increment** to increment the counter (signs via wallet)
5. Enter text and click **Set** to update the greeting
6. Watch real-time events appear in the event log

---

## 🏗️ Project Structure

```
stellardripz/
├── README.md
├── package.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── jest.config.js
├── .env.local.example
├── contracts/                          # Soroban smart contract
│   ├── Cargo.toml
│   ├── src/
│   │   ├── lib.rs                      # Counter + greeting contract
│   │   └── test.rs                     # Rust unit tests
│   └── target/                         # Compiled WASM
├── scripts/
│   └── deploy-contract.ts              # Contract deployment script
└── src/
    ├── config.ts                       # Network constants & env config
    ├── types/
    │   └── index.ts                    # Shared TypeScript types
    ├── services/
    │   ├── walletService.ts            # Multi-wallet abstraction
    │   ├── balanceService.ts           # Horizon multi-asset balance
    │   ├── transactionService.ts       # Build, sign, submit txs
    │   ├── contractService.ts          # Soroban contract interaction + events
    │   └── addressBookService.ts       # Saved addresses CRUD
    ├── context/
    │   └── AppContext.tsx              # Global state (reducer + context)
    ├── components/
    │   ├── Header.tsx                  # App header with branding
    │   ├── WalletCard.tsx              # Multi-wallet picker + connect
    │   ├── BalanceCard.tsx             # Multi-asset balance display
    │   ├── FaucetButton.tsx            # One-click faucet request
    │   ├── SendForm.tsx                # Send XLM/assets form
    │   ├── ContractInteraction.tsx     # Smart contract read/write UI
    │   ├── TxStatusTracker.tsx         # Live transaction status
    │   ├── TransactionHistory.tsx      # Transaction log
    │   ├── NetworkWarning.tsx          # Mainnet warning banner
    │   ├── QrModal.tsx                 # QR code generator
    │   ├── AddressBook.tsx             # Address book manager
    │   └── Toast.tsx                   # Toast notification system
    ├── __tests__/                      # Jest unit tests
    │   ├── config.test.ts
    │   ├── walletService.test.ts
    │   └── addressBookService.test.ts
    └── app/
        ├── layout.tsx                  # Root layout
        ├── page.tsx                    # Main page
        └── globals.css                 # Global styles
```

---

## 🔄 Application Flow

```
┌──────────────┐     ┌──────────────┐     ┌────────────────┐
│  Wallet       │────▶│ walletService │────▶│  AppContext    │
│  (Freighter,  │     │ (connect,     │     │  (global state)│
│   xBull, etc) │     │  sign)        │     │                │
└──────────────┘     └──────────────┘     └───────┬────────┘
                                                   │
        ┌──────────────────────────────────────────┼──────────────────────────┐
        │                  │                       │                          │
  ┌─────▼─────┐    ┌───────▼──────┐    ┌──────────▼──────────┐    ┌──────────▼──────────┐
  │ WalletCard │    │  BalanceCard │    │  FaucetButton       │    │ ContractInteraction │
  │ (connect)  │    │ (fetch XLM)  │    │  (Friendbot)        │    │ (soroban RPC)       │
  └────────────┘    └──────────────┘    └─────────────────────┘    └─────────────────────┘
```

1. User picks a wallet from the modal → public key stored in context
2. Balance fetched from Horizon → displayed in BalanceCard (XLM + assets)
3. Faucet button → Friendbot API → 10,000 XLM credited
4. Send form → build tx → sign via wallet → submit to Horizon
5. Contract section → simulate reads → sign+submit writes → poll events
6. All transactions logged in TransactionHistory + real-time TxStatusTracker

---

## 📸 Screenshots

### Wallet Options Available
![Wallet Picker](./screenshots/wallet-picker.png)

> *Multi-wallet picker modal showing Freighter, xBull, Albedo, LOBSTR, and Rabet options.*

### Wallet Connected State
![Wallet Connected](./screenshots/connected.png)

> *Connected state showing wallet name, truncated public key, copy address, and QR code buttons.*

### Balance Displayed
![Balance Displayed](./screenshots/balance.png)

> *Multi-asset balance card showing XLM + custom assets with manual refresh.*

### Successful Testnet Transaction
![Transaction Success](./screenshots/transaction-success.png)

> *Faucet request success showing transaction hash with explorer link. TxStatusTracker shows live status.*

### Contract Interaction
![Contract Interaction](./screenshots/contract-interaction.png)

> *Smart contract UI: counter read/increment, greeting read/set, real-time event log.*

### Mobile Responsive
![Mobile View](./screenshots/mobile.png)

> *Fully responsive layout adapting to smaller screens.*

---

## 📋 Deployed Contract (Testnet)

| Item | Value |
|---|---|
| **Contract ID** | *(Deploy using scripts/deploy-contract.ts)* |
| **Network** | Stellar Testnet |
| **Explorer** | [Stellar Expert Testnet](https://stellar.expert/explorer/testnet) |

*After deployment, paste your contract ID here and add a screenshot of the transaction hash on Stellar Explorer.*

---

## 🧪 Development Standards

- **TypeScript throughout** — strict mode, no `any`
- **Multi-wallet abstraction** — wallet logic isolated from UI components
- **Service layer** — wallet, balance, transaction, contract services
- **Component separation** — each component has a single responsibility
- **Error handling** — 3 error types handled: wallet errors, network/RPC errors, transaction failures
- **Environment config** — all endpoints configurable via env vars
- **Persistence** — wallet state survives page reloads (24h localStorage)
- **Real-time events** — 5-second polling for contract event synchronization
- **Unit tested** — 22 tests across 3 suites (Jest + jsdom)

---

## 📄 License

MIT — feel free to use, modify, and distribute.

---

**Built with 💧 for the Stellar developer community.**
