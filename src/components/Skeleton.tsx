"use client";

/**
 * Reusable skeleton loading components for a polished loading experience.
 */

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div
      className={`rounded-2xl border border-white/10 bg-surface-800/60 p-6 animate-pulse ${className}`}
    >
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-xl bg-white/5" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-24 rounded bg-white/5" />
          <div className="h-3 w-32 rounded bg-white/5" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-4 w-full rounded bg-white/5" />
        <div className="h-4 w-3/4 rounded bg-white/5" />
        <div className="h-10 w-full rounded-xl bg-white/5" />
      </div>
    </div>
  );
}

export function SkeletonBalanceCard() {
  return (
    <div className="rounded-2xl border border-white/10 bg-surface-800/60 p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-3 w-20 rounded bg-white/5" />
        <div className="h-3 w-20 rounded bg-white/5" />
      </div>
      <div className="mb-4 space-y-2">
        <div className="h-8 w-40 rounded bg-white/5" />
        <div className="h-3 w-24 rounded bg-white/5" />
      </div>
      <div className="space-y-2">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-xl bg-white/[0.02] px-3 py-2"
          >
            <div className="h-3 w-16 rounded bg-white/5" />
            <div className="h-3 w-12 rounded bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonTransactionList({ count = 3 }: { count?: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-surface-800/60 p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-3 w-28 rounded bg-white/5" />
        <div className="h-3 w-10 rounded bg-white/5" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="h-3 w-24 rounded bg-white/5" />
              <div className="h-4 w-16 rounded-md bg-white/5" />
            </div>
            <div className="flex gap-4">
              <div className="h-3 w-32 rounded bg-white/5" />
              <div className="h-3 w-40 rounded bg-white/5" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonContractDemo() {
  return (
    <div className="rounded-2xl border border-stellar-purple/20 bg-surface-800/60 p-5 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-8 w-8 rounded-lg bg-stellar-purple/10" />
        <div className="space-y-1">
          <div className="h-3 w-24 rounded bg-white/5" />
          <div className="h-2 w-32 rounded bg-white/5" />
        </div>
      </div>
      <div className="space-y-3">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <div className="flex justify-between">
            <div className="space-y-1">
              <div className="h-2 w-14 rounded bg-white/5" />
              <div className="h-6 w-8 rounded bg-white/5" />
            </div>
            <div className="flex gap-2">
              <div className="h-8 w-14 rounded-lg bg-white/5" />
              <div className="h-8 w-12 rounded-lg bg-white/5" />
            </div>
          </div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
          <div className="h-2 w-14 rounded bg-white/5 mb-2" />
          <div className="h-3 w-48 rounded bg-white/5 mb-2" />
          <div className="flex gap-2">
            <div className="h-8 flex-1 rounded-lg bg-white/5" />
            <div className="h-8 w-14 rounded-lg bg-white/5" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonPageHero() {
  return (
    <div className="text-center max-w-2xl mx-auto animate-pulse py-8">
      <div className="inline-flex mb-6 h-7 w-32 rounded-full bg-white/5" />
      <div className="space-y-3">
        <div className="h-10 w-80 mx-auto rounded bg-white/5" />
        <div className="h-4 w-64 mx-auto rounded bg-white/5" />
      </div>
    </div>
  );
}
// Skeleton components: mimics card shapes for loading states
