# 💧 StellarDripz — Testnet XLM Faucet

![StellarDripz](https://img.shields.io/badge/Stellar-Testnet-blue?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-3-38bdf8?style=flat-square&logo=tailwindcss)

**StellarDripz** is a lightweight, developer-focused web interface that lets users request testnet XLM (Stellar Lumens) with a single click. It removes the friction of manually hitting Stellar's Friendbot API or CLI tools by wrapping the entire flow — wallet connection, balance check, and testnet fund transfer — into a clean, guided UI.

Built for Stellar developers, hackathon participants, and QA testers who need fast, repeatable access to testnet funds without leaving the browser.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🔐 **Freighter Wallet** | Seamless connect/disconnect with persistence across reloads |
| 🛡️ **Network Detection** | Warns if wallet is on Mainnet — testnet only |
| 💰 **Balance Display** | Real-time XLM balance with manual refresh |
| 💧 **One-Click Faucet** | Request 10,000 testnet XLM via Friendbot |
| 📤 **Send XLM** | Send testnet XLM to any address, signed via Freighter |
| 📋 **Transaction History** | Session-level log of faucet & send transactions |
| 🔗 **Explorer Links** | Direct links to Stellar Expert for completed txs |
| 🎨 **Beautiful UI** | Dark theme, glassmorphism, micro-animations |
| 📱 **Responsive** | Works on desktop, tablet, and mobile |

---

## 🛠️ Tech Stack

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
- **Language:** TypeScript
- **Styling:** [Tailwind CSS 3](https://tailwindcss.com/)
- **Blockchain:**
  - [`@stellar/stellar-sdk`](https://www.npmjs.com/package/@stellar/stellar-sdk) — Horizon client, transaction building
  - [`@stellar/freighter-api`](https://www.npmjs.com/package/@stellar/freighter-api) — Wallet connection & signing
- **Notifications:** `react-hot-toast` for toast feedback
- **Deployment:** Vercel (recommended)

---

## 📦 Setup Instructions

### Prerequisites

- **Node.js** 18.x or higher
- **npm** or **yarn**
- **[Freighter Wallet](https://www.freighter.app/)** browser extension installed
- Freighter set to **Testnet** network

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/stellardripz.git
cd stellardripz
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment (Optional)

The app works out of the box with sensible defaults for Stellar Testnet. To customize:

```bash
cp .env.local.example .env.local
```

| Variable | Default | Description |
|---|---|---|
| `NEXT_PUBLIC_HORIZON_URL` | `https://horizon-testnet.stellar.org` | Horizon API endpoint |
| `NEXT_PUBLIC_FRIENDBOT_URL` | `https://friendbot.stellar.org` | Friendbot API endpoint |
| `NEXT_PUBLIC_STELLAR_EXPERT_URL` | `https://stellar.expert/explorer/testnet` | Block explorer URL |
| `NEXT_PUBLIC_NETWORK_PASSPHRASE` | `Test SDF Network ; September 2015` | Testnet passphrase |

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

---

## 🏗️ Project Structure

```
stellardripz/
├── README.md
├── package.json
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── .env.local.example
└── src/
    ├── config.ts                        # Network constants & env config
    ├── types/
    │   └── index.ts                     # Shared TypeScript types
    ├── services/
    │   ├── walletService.ts             # Freighter wallet abstraction
    │   ├── balanceService.ts            # Horizon balance fetching
    │   └── transactionService.ts        # Build, sign, submit txs
    ├── context/
    │   └── AppContext.tsx               # Global state (reducer + context)
    ├── components/
    │   ├── Header.tsx                   # App header with branding
    │   ├── WalletCard.tsx               # Connect / disconnect card
    │   ├── BalanceCard.tsx              # XLM balance display
    │   ├── FaucetButton.tsx             # One-click faucet request
    │   ├── SendForm.tsx                 # Send XLM form
    │   ├── TransactionHistory.tsx       # Transaction log
    │   ├── NetworkWarning.tsx           # Mainnet warning banner
    │   └── Toast.tsx                    # Toast notification system
    └── app/
        ├── layout.tsx                   # Root layout
        ├── page.tsx                     # Main page
        └── globals.css                  # Global styles
```

---

## 🔄 Application Flow

```
┌─────────────┐     ┌──────────────┐     ┌────────────────┐
│  Freighter   │────▶│  walletService │────▶│  AppContext    │
│  Extension   │     │  (connect,    │     │  (global state) │
│              │     │   sign)       │     │                │
└─────────────┘     └──────────────┘     └───────┬────────┘
                                                  │
                          ┌───────────────────────┼──────────────────────┐
                          │                       │                      │
                    ┌─────▼─────┐          ┌──────▼──────┐        ┌──────▼──────┐
                    │  WalletCard │          │ BalanceCard  │        │  FaucetButton│
                    │  (connect)  │          │ (fetch XLM)  │        │  (Friendbot) │
                    └────────────┘          └─────────────┘        └─────────────┘
```

1. User connects Freighter wallet → public key stored in context
2. Balance fetched from Horizon → displayed in BalanceCard
3. Faucet button → Friendbot API → 10,000 XLM credited
4. Send form → build tx → sign via Freighter → submit to Horizon
5. All transactions logged in TransactionHistory

---

## 📸 Screenshots

### Wallet Disconnected State
![Wallet Disconnected](./screenshots/disconnected.png)

> *Initial state showing "Connect Wallet" CTA, feature teasers, and Freighter install prompt if extension is missing.*

### Wallet Connected State
![Wallet Connected](./screenshots/connected.png)

> *Wallet connected showing truncated public key, green connection indicator, and disconnect button.*

### Balance Displayed
![Balance Displayed](./screenshots/balance.png)

> *Real-time XLM balance with 7-decimal precision, last-fetched timestamp, and manual refresh button.*

### Successful Testnet Transaction
![Transaction Success](./screenshots/transaction-success.png)

> *Successful faucet request showing transaction hash and explorer link. Transaction logged in history with green success badge.*

### Transaction Result Shown
![Transaction Result](./screenshots/transaction-result.png)

> *Full transaction feedback: success toast notification, updated balance, and detailed transaction card with explorer link.*

### Mobile Responsive
![Mobile View](./screenshots/mobile.png)

> *Fully responsive layout adapting to smaller screens with stacked cards.*

---

## 🧪 Development Standards

- **TypeScript throughout** — no `any` types, strict mode enabled
- **Service layer abstraction** — wallet/balance/transaction logic isolated from UI
- **Component separation** — each component has a single responsibility
- **Error handling** — no silent failures; all error states surfaced to user
- **Environment config** — Horizon URL, network passphrase, Friendbot endpoint all configurable
- **Persistence** — wallet connection state survives page reloads (localStorage)

---

## 📄 License

MIT — feel free to use, modify, and distribute.

---

**Built with 💧 for the Stellar developer community.**
