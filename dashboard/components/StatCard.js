const themes = {
  cyan: {
    topBorder: "border-t-cyan-500",
    value: "text-cyan-400",
    icon: "bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/20",
    hover: "card-hover-cyan",
  },
  green: {
    topBorder: "border-t-emerald-500",
    value: "text-emerald-400",
    icon: "bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20",
    hover: "card-hover-green",
  },
  amber: {
    topBorder: "border-t-amber-500",
    value: "text-amber-400",
    icon: "bg-amber-500/10 text-amber-400 ring-1 ring-amber-500/20",
    hover: "card-hover-amber",
  },
  violet: {
    topBorder: "border-t-violet-500",
    value: "text-violet-400",
    icon: "bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/20",
    hover: "card-hover-violet",
  },
};

export default function StatCard({ label, value, subtext, icon, accentColor = "cyan" }) {
  const t = themes[accentColor] || themes.cyan;

  return (
    <div className={`
      bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-white/[0.06] border-t-2 ${t.topBorder}
      rounded-xl p-6 transition-all duration-300 ${t.hover}
    `}>
      <div className="flex items-start justify-between mb-4">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
          {label}
        </span>
        {icon && (
          <span className={`w-9 h-9 rounded-xl ${t.icon} flex items-center justify-center text-lg shrink-0`}>
            {icon}
          </span>
        )}
      </div>
      <div className={`text-3xl font-bold font-mono tracking-tight ${t.value}`}>
        {value}
      </div>
      {subtext && (
        <p className="text-sm text-slate-500 mt-2 leading-relaxed">{subtext}</p>
      )}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-white/[0.06] border-t-2 border-t-slate-300 dark:border-t-white/[0.06] rounded-xl p-6">
      <div className="skeleton h-3 w-24 mb-5" />
      <div className="skeleton h-8 w-36 mb-3" />
      <div className="skeleton h-3 w-20" />
    </div>
  );
}
