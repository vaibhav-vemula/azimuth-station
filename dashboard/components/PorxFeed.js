import { truncateHash, timeAgo, formatAzm, porxStatus } from "../lib/utils";

const STATUS_CONFIG = {
  Paid:      { dot: "bg-emerald-400 shadow-emerald-400/50", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  Verified:  { dot: "bg-cyan-400 shadow-cyan-400/50",       badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"         },
  Claimed:   { dot: "bg-amber-400 shadow-amber-400/50",     badge: "bg-amber-500/10 text-amber-400 border-amber-500/20"      },
  Submitted: { dot: "bg-slate-500",                         badge: "bg-slate-500/10 text-slate-400 border-slate-500/20"      },
};

export default function PorxFeed({ passes, totalRewards, porxBaseReward }) {
  return (
    <div className="bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-white/[0.06] rounded-xl p-6 card-hover-green transition-all duration-300">

      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
          PoRx Activity
        </h3>
        <span className="text-sm text-slate-500">
          Earned:&nbsp;<span className="text-emerald-400 font-bold font-mono">{formatAzm(totalRewards)} AZM</span>
        </span>
      </div>

      {!passes || passes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-14 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] flex items-center justify-center mb-4">
            <svg className="w-6 h-6 text-slate-400 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z"
              />
            </svg>
          </div>
          <p className="text-base text-slate-500 font-medium">No satellite passes yet</p>
          <p className="text-sm text-slate-400 dark:text-slate-700 mt-1.5">Passes appear after LoRa reception events</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
          {passes.map((pass, i) => {
            const status = porxStatus(pass);
            const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.Submitted;
            const pct = pass.totalPackets > 0
              ? Math.round((pass.packetCount / pass.totalPackets) * 100)
              : 0;
            const barColor = pct >= 90 ? "bg-emerald-500" : pct >= 60 ? "bg-amber-500" : "bg-red-500";

            return (
              <div
                key={pass.passId + i}
                className="bg-slate-50 dark:bg-white/[0.02] border border-slate-200 dark:border-white/[0.06] rounded-xl p-4 hover:border-slate-300 dark:hover:border-white/[0.11] hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2 h-2 rounded-full shrink-0 shadow-sm ${cfg.dot}`} />
                    <span className="text-sm font-mono text-slate-700 dark:text-slate-200 font-medium">{truncateHash(pass.passId)}</span>
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${cfg.badge}`}>
                    {status}
                  </span>
                </div>

                <div className="flex items-center gap-3 mb-3">
                  <div className="flex-1 h-1.5 bg-slate-200 dark:bg-white/[0.06] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${barColor}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs font-mono text-slate-500 shrink-0">
                    {pass.packetCount}/{pass.totalPackets} pkts
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span className="text-emerald-400 font-mono font-semibold">{formatAzm(pass.reward)} AZM</span>
                  {pass.avgRssi !== 0 && (
                    <span>RSSI {pass.avgRssi} · SNR {pass.avgSnr}</span>
                  )}
                  <span>{timeAgo(pass.timestamp)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {porxBaseReward && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-white/[0.05] text-sm text-slate-500 dark:text-slate-600">
          Base reward: <span className="font-mono text-slate-500">{formatAzm(porxBaseReward)} AZM</span> / pass
        </div>
      )}
    </div>
  );
}
