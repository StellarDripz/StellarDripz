"use client";

import { useState, useEffect } from "react";
import { getAnalyticsEvents, getAnalyticsSummary, clearAnalytics } from "@/lib/db";
import type { AnalyticsEvent } from "@/lib/db";

export default function AdminDashboard() {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [summary, setSummary] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    const evts = filter === "all" ? getAnalyticsEvents() : getAnalyticsEvents(filter as AnalyticsEvent["type"]);
    setEvents(evts);
    setSummary(getAnalyticsSummary());
  }, [filter]);

  const totalEvents = Object.values(summary).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-8 pb-16">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white">Analytics Dashboard</h1>
        <p className="mt-2 text-sm text-white/40">Track faucet usage and contract interactions</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: "Total Events", value: totalEvents, color: "text-white" },
          { label: "Faucet Requests", value: summary.faucet_request || 0, color: "text-stellar-blue" },
          { label: "Send Payments", value: summary.send_payment || 0, color: "text-stellar-green" },
          { label: "Contract Calls", value: summary.contract_call || 0, color: "text-stellar-purple" },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-white/10 bg-surface-800/60 p-5 backdrop-blur-md text-center">
            <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
            <p className="mt-1 text-xs text-white/40">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Filter + Clear */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {["all", "faucet_request", "send_payment", "contract_call", "wallet_connect"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                filter === f
                  ? "bg-stellar-blue/20 text-stellar-blue border border-stellar-blue/30"
                  : "bg-white/5 text-white/40 border border-white/10 hover:bg-white/10"
              }`}
            >
              {f === "all" ? "All" : f.replace("_", " ")}
            </button>
          ))}
        </div>
        <button
          onClick={() => { clearAnalytics(); setEvents([]); setSummary({}); }}
          className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
        >
          Clear Data
        </button>
      </div>

      {/* Events Table */}
      <div className="rounded-2xl border border-white/10 bg-surface-800/60 p-6 backdrop-blur-md overflow-x-auto">
        {events.length === 0 ? (
          <p className="text-center text-sm text-white/30 py-8">No events yet.</p>
        ) : (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-white/10 text-white/40">
                <th className="text-left py-2 px-3">Type</th>
                <th className="text-left py-2 px-3">Address</th>
                <th className="text-left py-2 px-3">Time</th>
                <th className="text-left py-2 px-3">Data</th>
              </tr>
            </thead>
            <tbody>
              {events.slice(0, 50).map((e) => (
                <tr key={e.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="py-2 px-3">
                    <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px]">{e.type.replace("_", " ")}</span>
                  </td>
                  <td className="py-2 px-3 font-mono text-white/60">{e.address.slice(0, 12)}...</td>
                  <td className="py-2 px-3 text-white/40">{new Date(e.timestamp).toLocaleString()}</td>
                  <td className="py-2 px-3 text-white/30 font-mono">{e.data ? JSON.stringify(e.data).slice(0, 40) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
