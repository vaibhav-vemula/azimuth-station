"use client";

import { useState, useEffect } from "react";
import { formatCountdown, formatAzm } from "../lib/utils";

function EpochRing({ progress }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ - Math.min(1, progress / 100) * circ;

  return (
    <svg width="104" height="104" viewBox="0 0 104 104" className="-rotate-90">
      <circle cx="52" cy="52" r={r} fill="none" stroke="var(--ring-track)" strokeWidth="7" />
      <circle
        cx="52" cy="52" r={r}
        fill="none"
        stroke="url(#epochGrad)"
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 1s linear" }}
      />
      <defs>
        <linearGradient id="epochGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#10b981" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export default function PoaMonitor({ data }) {
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!data) return;
    const tick = () => {
      const now = Math.floor(Date.now() / 1000);
      setCountdown(Math.max(0, data.nextSettlement - now));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [data]);

  if (!data) return null;

  const epochProgress =
    data.epochInterval > 0
      ? Math.round(Math.max(0, 100 - (countdown / data.epochInterval) * 100))
      : 0;

  const hbPercent =
    data.heartbeatThreshold > 0
      ? Math.min(100, Math.round((data.station.heartbeatCount / data.heartbeatThreshold) * 100))
      : 0;

  return (
    <div className="bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-white/[0.06] rounded-xl p-6 card-hover-cyan transition-all duration-300">

      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
          PoA Epoch Monitor
        </h3>
        <span className="text-sm font-mono font-semibold text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-full border border-cyan-500/20">
          Epoch #{data.epochCount + 1}
        </span>
      </div>

      {/* Ring + Countdown */}
      <div className="flex items-center gap-6 mb-6">
        <div className="relative shrink-0">
          <EpochRing progress={epochProgress} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-base font-bold text-slate-900 dark:text-white">{epochProgress}%</span>
            <span className="text-xs text-slate-500 dark:text-slate-600">done</span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Next Settlement</p>
          <p className="text-4xl font-mono font-bold text-slate-900 dark:text-white tracking-tight tabular-nums">
            {formatCountdown(countdown)}
          </p>
          <p className="text-sm text-slate-500 mt-2">
            Every {Math.round(data.epochInterval / 60)} min &nbsp;·&nbsp; {formatAzm(data.poaRewardAmount)} AZM / epoch
          </p>
        </div>
      </div>

      {/* Heartbeat progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-slate-400">Heartbeats this epoch</span>
          <span className="text-sm font-mono">
            <span className={hbPercent >= 100 ? "text-emerald-400 font-bold" : "text-slate-700 dark:text-slate-200"}>
              {data.station.heartbeatCount}
            </span>
            <span className="text-slate-400 dark:text-slate-600"> / {data.heartbeatThreshold}</span>
          </span>
        </div>
        <div className="w-full h-2 bg-slate-200 dark:bg-white/[0.05] rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${
              hbPercent >= 100
                ? "bg-emerald-500 shadow-sm shadow-emerald-500/50"
                : "bg-gradient-to-r from-cyan-600 to-cyan-400"
            }`}
            style={{ width: `${hbPercent}%` }}
          />
        </div>
      </div>

    </div>
  );
}
