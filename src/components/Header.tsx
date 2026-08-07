"use client";

export default function Header() {
  return (
    <header className="relative z-10 w-full border-b border-white/5 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-stellar-blue to-stellar-purple shadow-lg shadow-stellar-blue/25">
            <span className="text-xl">💧</span>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 animate-drip rounded-full bg-stellar-blue/60" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">
              Stellar<span className="text-stellar-blue">Dripz</span>
            </h1>
            <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-white/40">
              Testnet Faucet
            </p>
          </div>
        </div>

        {/* Badge */}
        <div className="hidden sm:flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/50">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-stellar-green opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-stellar-green" />
          </span>
          Stellar Testnet
        </div>
      </div>
    </header>
  );
}
