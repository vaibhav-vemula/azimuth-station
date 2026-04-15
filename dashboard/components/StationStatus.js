import { timeAgo, isStationOnline } from "../lib/utils";

export default function StationStatus({ station, epochInterval }) {
  if (!station || !station.registered) {
    return (
      <div className="bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-white/[0.06] border-t-2 border-t-slate-300 dark:border-t-slate-700 rounded-xl p-6">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest block mb-3">
          Station Status
        </span>
        <div className="flex flex-col items-center justify-center py-5">
          <p className="text-slate-500 text-sm">Not registered</p>
        </div>
      </div>
    );
  }

  const online = isStationOnline(station.lastHeartbeat, epochInterval || 300);

  return (
    <div className={`
      bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-white/[0.06] border-t-2 rounded-xl p-6 transition-all duration-300
      ${online ? "border-t-emerald-500 card-hover-green" : "border-t-red-500"}
    `}>
      <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest block mb-4">
        Station Status
      </span>

      <div className="flex items-center gap-3 mb-5">
        <span className="relative flex h-4 w-4 shrink-0">
          {online && (
            <span className="ping-slow absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-50" />
          )}
          <span className={`relative inline-flex h-4 w-4 rounded-full ${
            online ? "bg-emerald-400 shadow-md shadow-emerald-400/60" : "bg-red-400"
          }`} />
        </span>
        <span className={`text-2xl font-bold tracking-tight ${online ? "text-emerald-400" : "text-red-400"}`}>
          {online ? "Online" : "Offline"}
        </span>
        <span className={`ml-auto text-xs font-semibold px-2.5 py-1 rounded-full border ${
          station.active
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/25"
            : "bg-red-500/10 text-red-400 border-red-500/25"
        }`}>
          {station.active ? "Active" : "Inactive"}
        </span>
      </div>

      <div className="space-y-3">
        {[
          { label: "Location",       value: station.location || "—",                  mono: true  },
          { label: "Last Heartbeat", value: timeAgo(station.lastHeartbeat),            mono: false },
          { label: "Total HBs",      value: station.heartbeatCount?.toLocaleString(), mono: true, accent: true },
        ].map(({ label, value, mono, accent }) => (
          <div key={label} className="flex items-center justify-between">
            <span className="text-sm text-slate-500">{label}</span>
            <span className={`text-sm ${mono ? "font-mono" : ""} ${accent ? "text-cyan-400 font-bold" : "text-slate-700 dark:text-slate-200"}`}>
              {value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
