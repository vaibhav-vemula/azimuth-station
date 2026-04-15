"use client";

import { useState } from "react";
import Image from "next/image";
import Header from "../components/Header";
import StatCard, { StatCardSkeleton } from "../components/StatCard";
import StationStatus from "../components/StationStatus";
import PoaMonitor from "../components/PoaMonitor";
import PorxFeed from "../components/PorxFeed";
import { useStationData } from "../lib/useStationData";
import { formatAzm } from "../lib/utils";

function EmptyState({ onDemo }) {
  return (
    <div className="flex flex-col items-center justify-center py-32 text-center px-4">
      <div className="relative mb-10">
        <div className="w-32 h-32 drop-shadow-2xl" style={{ filter: "drop-shadow(0 0 24px rgba(6,182,212,0.25))" }}>
          <Image src="/azimuth_logo.png" alt="Azimuth" width={128} height={128} className="object-contain" />
        </div>
      </div>

      <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3 tracking-tight">
        Azimuth Node Dashboard
      </h2>
      <p className="text-slate-400 max-w-md text-base leading-relaxed mb-8">
        Enter your station Solana address above to view real-time PoA epochs,
        PoRx passes, and AZM rewards.
      </p>

      <div className="flex flex-wrap justify-center gap-3 mb-10">
        {[
          { icon: "⚡", label: "PoA Epochs" },
          { icon: "📡", label: "PoRx Passes" },
          { icon: "💰", label: "AZM Rewards" },
          { icon: "🌐", label: "Solana Devnet" },
        ].map(({ icon, label }) => (
          <span key={label} className="flex items-center gap-2 text-sm text-slate-500 bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08] rounded-full px-4 py-2">
            {icon} {label}
          </span>
        ))}
      </div>

      <button
        onClick={onDemo}
        className="text-sm text-cyan-500 hover:text-cyan-400 underline underline-offset-4 transition-colors"
      >
        Load demo station
      </button>
    </div>
  );
}

export default function Dashboard() {
  const [address, setAddress] = useState("");
  const { data, loading, error } = useStationData(address);

  return (
    <div className="min-h-screen">
      <Header onConnect={setAddress} currentAddress={address} />

      <main className="max-w-7xl mx-auto px-6 py-10">

        {!address && (
          <EmptyState onDemo={() => setAddress("11111111111111111111111111111111")} />
        )}

        {error && address && (
          <div className="bg-red-500/[0.07] border border-red-500/20 rounded-xl px-5 py-4 mb-8 flex items-start gap-3">
            <span className="text-red-400 text-lg mt-0.5 shrink-0">⚠</span>
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {loading && address && !data && (
          <div className="space-y-6 fade-up">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-white/[0.06] rounded-xl p-6 h-72">
                <div className="skeleton h-3 w-32 mb-6" />
                <div className="skeleton h-24 w-24 rounded-full mx-auto mb-5" />
                <div className="skeleton h-4 w-48 mx-auto" />
              </div>
              <div className="bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-white/[0.06] rounded-xl p-6 h-72">
                <div className="skeleton h-3 w-32 mb-6" />
                <div className="space-y-3">
                  {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-20 w-full rounded-xl" />)}
                </div>
              </div>
            </div>
          </div>
        )}

        {data && (
          <div className="space-y-6 fade-up data-transition">

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <StationStatus station={data.station} epochInterval={data.epochInterval} />

              <StatCard
                label="AZM Balance"
                icon="💰"
                value={data.azmBalance != null ? `${formatAzm(data.azmBalance)} AZM` : "—"}
                subtext={`${data.stationCount} station${data.stationCount !== 1 ? "s" : ""} on network`}
                accentColor="green"
              />

              <StatCard
                label="PoA Rewards"
                icon="⚡"
                value={`${formatAzm(data.station.totalPoaRewards)} AZM`}
                subtext={`${formatAzm(data.poaRewardAmount)} AZM per epoch`}
                accentColor="cyan"
              />

              <StatCard
                label="PoRx Rewards"
                icon="📡"
                value={`${formatAzm(data.station.totalPorxRewards)} AZM`}
                subtext={`${data.porxPassCount} satellite pass${data.porxPassCount !== 1 ? "es" : ""}`}
                accentColor="violet"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <PoaMonitor data={data} />
              <PorxFeed
                passes={data.porxPasses}
                totalRewards={data.station.totalPorxRewards}
                porxBaseReward={data.porxBaseReward}
              />
            </div>

            <div className="flex items-center justify-center gap-2 py-3 text-sm text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow shadow-emerald-500/50" />
              Auto-refreshing every 10s &nbsp;·&nbsp; Solana Devnet &nbsp;·&nbsp; OrbitalVault
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
