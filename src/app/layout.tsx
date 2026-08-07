import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import Header from "@/components/Header";
import ToastContainer from "@/components/Toast";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "StellarDripz — Testnet XLM Faucet",
  description:
    "A lightweight, developer-focused web interface for requesting testnet XLM with a single click. Built for Stellar developers, hackathon participants, and QA testers.",
  keywords: ["Stellar", "XLM", "Testnet", "Faucet", "Freighter", "Blockchain"],
  authors: [{ name: "StellarDripz" }],
  openGraph: {
    title: "StellarDripz — Testnet XLM Faucet",
    description: "Request testnet XLM with a single click. Built for Stellar developers.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-surface-950 bg-grid">
        <AppProvider>
          <Header />
          <ErrorBoundary>
            <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
          </ErrorBoundary>
          <ToastContainer />
          <footer className="border-t border-white/5 py-6 text-center">
            <p className="text-xs text-white/20">
              StellarDripz — Powered by Stellar Testnet &amp; Friendbot. Not for production use.
            </p>
          </footer>
        </AppProvider>
      </body>
    </html>
  );
}
