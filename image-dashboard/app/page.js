"use client";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import Image from "next/image";
import { fetchImages } from "../lib/arweave";

function timeAgo(date) {
  if (!date) return "—";
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function truncate(str, start = 6, end = 4) {
  if (!str) return "—";
  return `${str.slice(0, start)}...${str.slice(-end)}`;
}

function completenessColor(pct) {
  if (pct >= 90) return { badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25", bar: "bg-emerald-500" };
  if (pct >= 60) return { badge: "bg-amber-500/15 text-amber-400 border-amber-500/25", bar: "bg-amber-500" };
  return { badge: "bg-red-500/15 text-red-400 border-red-500/25", bar: "bg-red-500" };
}

// ─── Theme Toggle ──────────────────────────────────────────────────────────────

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-9 h-9" />;

  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 dark:border-white/[0.09] bg-slate-50 dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/[0.08] transition-all shrink-0"
    >
      {isDark ? (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <circle cx="12" cy="12" r="5" />
          <path strokeLinecap="round" d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
        </svg>
      ) : (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      )}
    </button>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon, accent }) {
  const colors = {
    cyan:   { border: "border-t-cyan-500",    value: "text-cyan-400",    icon: "bg-cyan-500/10 text-cyan-400"    },
    green:  { border: "border-t-emerald-500", value: "text-emerald-400", icon: "bg-emerald-500/10 text-emerald-400" },
    amber:  { border: "border-t-amber-500",   value: "text-amber-400",   icon: "bg-amber-500/10 text-amber-400"  },
    violet: { border: "border-t-violet-500",  value: "text-violet-400",  icon: "bg-violet-500/10 text-violet-400" },
  };
  const c = colors[accent] || colors.cyan;
  return (
    <div className={`bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-white/[0.06] border-t-2 ${c.border} rounded-xl p-6`}>
      <div className="flex items-start justify-between mb-4">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{label}</span>
        <span className={`w-9 h-9 rounded-xl ${c.icon} flex items-center justify-center text-lg shrink-0`}>{icon}</span>
      </div>
      <div className={`text-3xl font-bold font-mono ${c.value}`}>{value}</div>
      {sub && <p className="text-sm text-slate-500 mt-2">{sub}</p>}
    </div>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-white/[0.06] rounded-2xl overflow-hidden">
      <div className="skeleton w-full h-56" />
      <div className="p-4 space-y-2.5">
        <div className="skeleton h-3 w-32" />
        <div className="skeleton h-3 w-24" />
      </div>
    </div>
  );
}

// ─── Image card ───────────────────────────────────────────────────────────────

function ImageCard({ img, onClick }) {
  const [imgError, setImgError] = useState(false);
  const c = img.completeness !== null ? completenessColor(img.completeness) : null;

  return (
    <button
      onClick={() => onClick(img)}
      className="bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-white/[0.06] rounded-2xl overflow-hidden hover:border-cyan-500/40 hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300 text-left group"
    >
      {/* Image */}
      <div className="relative w-full h-56 bg-slate-100 dark:bg-[#030712] overflow-hidden">
        {!imgError ? (
          <img
            src={img.imageUrl}
            alt="Satellite pass"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <div className="w-12 h-12 rounded-2xl bg-slate-200 dark:bg-white/[0.03] border border-slate-300 dark:border-white/[0.06] flex items-center justify-center text-2xl">
              🛰️
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-600">Propagating to Arweave...</span>
          </div>
        )}

        {/* Completeness badge */}
        {c && (
          <div className="absolute top-3 right-3">
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${c.badge}`}>
              {img.completeness}%
            </span>
          </div>
        )}

        {/* Bottom overlay */}
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent px-4 py-3">
          <span className="text-xs text-slate-300 font-medium">{timeAgo(img.timestamp)}</span>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-mono text-slate-700 dark:text-slate-300 font-medium">
            {truncate(img.passId, 10, 6)}
          </span>
          {img.recovered !== null && (
            <span className="text-xs text-slate-500 font-mono">
              {img.recovered}/{img.total} pkts
            </span>
          )}
        </div>

        {/* Packet completeness bar */}
        {img.completeness !== null && (
          <div className="w-full h-1 bg-slate-200 dark:bg-white/[0.05] rounded-full overflow-hidden mb-2">
            <div
              className={`h-full rounded-full ${c.bar}`}
              style={{ width: `${img.completeness}%` }}
            />
          </div>
        )}

        <div className="text-xs text-slate-500 dark:text-slate-600 truncate">
          {img.stations.length > 0
            ? `${img.stations.length} station${img.stations.length > 1 ? "s" : ""} · ${img.stations.map((s) => truncate(s, 6, 4)).join(", ")}`
            : ""}
        </div>
      </div>
    </button>
  );
}

// ─── Lightbox ─────────────────────────────────────────────────────────────────

function Lightbox({ img, onClose }) {
  const c = img.completeness !== null ? completenessColor(img.completeness) : null;

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#0d1117] border border-slate-200 dark:border-white/[0.08] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl shadow-black/60"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image */}
        <div className="relative bg-black">
          <img
            src={img.imageUrl}
            alt="Satellite pass"
            className="w-full object-contain max-h-[58vh]"
          />
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center text-xl transition-colors border border-white/[0.1]"
          >
            ×
          </button>
          {c && (
            <div className="absolute top-3 left-3">
              <span className={`text-sm font-bold px-3 py-1.5 rounded-full border ${c.badge}`}>
                {img.completeness}% complete
              </span>
            </div>
          )}
        </div>

        {/* Info panel */}
        <div className="p-6">
          <div className="flex items-start justify-between mb-5">
            <div>
              <p className="text-lg font-bold text-slate-900 dark:text-white">Satellite Pass</p>
              <p className="text-xs font-mono text-slate-500 mt-1 break-all">{img.passId || "—"}</p>
            </div>
            {img.recovered !== null && (
              <span className="text-sm font-mono text-slate-400 shrink-0 ml-4">
                <span className="text-slate-900 dark:text-white font-bold">{img.recovered}</span>
                <span className="text-slate-400 dark:text-slate-600">/{img.total}</span>
                <span className="text-slate-500 ml-1">packets</span>
              </span>
            )}
          </div>

          {/* Packet progress bar */}
          {img.completeness !== null && (
            <div className="mb-5">
              <div className="w-full h-2 bg-slate-200 dark:bg-white/[0.05] rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${c.bar}`} style={{ width: `${img.completeness}%` }} />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1.5">Received</p>
              <p className="text-sm text-slate-700 dark:text-slate-200">{img.timestamp?.toLocaleString() || "—"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1.5">Stored</p>
              <p className="text-sm text-slate-700 dark:text-slate-200">Arweave (permanent)</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-2">Ground Stations</p>
              <div className="flex flex-wrap gap-2">
                {img.stations.length > 0 ? img.stations.map((s) => (
                  <span key={s} className="font-mono text-xs bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08] text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg">
                    {s}
                  </span>
                )) : <span className="text-slate-500 dark:text-slate-600 text-sm">—</span>}
              </div>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1.5">Arweave TX</p>
              <p className="font-mono text-xs text-slate-500 dark:text-slate-400 break-all">{img.arweaveTxId}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <a
              href={img.imageUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 text-center py-2.5 bg-cyan-500 hover:bg-cyan-400 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-cyan-500/20"
            >
              View on Arweave
            </a>
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 text-sm font-medium rounded-xl transition-all"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ImageDashboard() {
  const [images, setImages]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [filter, setFilter]         = useState("all");

  const load = useCallback(async () => {
    const imgs = await fetchImages();
    setImages(imgs);
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, [load]);

  const fullImages = images.filter((i) => i.completeness !== null && i.completeness >= 90).length;
  const avgCompleteness = images.filter((i) => i.completeness !== null).length > 0
    ? Math.round(
        images.filter((i) => i.completeness !== null).reduce((s, i) => s + i.completeness, 0) /
        images.filter((i) => i.completeness !== null).length
      )
    : null;

  const filtered = images.filter((img) => {
    if (filter === "complete") return img.completeness !== null && img.completeness >= 90;
    if (filter === "partial")  return img.completeness === null || img.completeness < 90;
    return true;
  });

  return (
    <div className="min-h-screen">

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-white/[0.06] bg-white/95 dark:bg-[#030712]/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-5">

          {/* Logo */}
          <div className="flex items-center gap-3.5 shrink-0">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-cyan-500/20">
                <Image src="/azimuth_logo.png" alt="Azimuth" width={40} height={40} className="object-contain" />
              </div>
              <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
                <span className="ping-slow absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400 shadow shadow-emerald-400/60" />
              </span>
            </div>
            <div>
              <div className="text-base font-bold text-slate-900 dark:text-white tracking-tight leading-none">Azimuth</div>
              <div className="text-xs text-slate-500 uppercase tracking-widest mt-0.5">Image Archive</div>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center gap-3">
            {lastUpdated && (
              <span className="hidden sm:block text-sm text-slate-500 dark:text-slate-600">
                Updated {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={load}
              className="h-9 px-4 bg-slate-100 dark:bg-white/[0.04] hover:bg-slate-200 dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/[0.08] text-slate-600 dark:text-slate-300 text-sm font-medium rounded-xl transition-all"
            >
              Refresh
            </button>
            <span className="hidden sm:flex h-8 items-center gap-1.5 text-xs px-3 rounded-lg bg-violet-500/[0.08] text-violet-500 dark:text-violet-400 border border-violet-500/20 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
              Arweave
            </span>
            <span className="hidden sm:flex h-8 items-center gap-1.5 text-xs px-3 rounded-lg bg-amber-500/[0.08] text-amber-500 dark:text-amber-400 border border-amber-500/20 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              Hedera Testnet
            </span>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-10">

        {/* Stat cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-10">
          <StatCard
            label="Total Images"
            icon="🖼️"
            value={loading ? "—" : images.length}
            sub="stored permanently on Arweave"
            accent="cyan"
          />
          <StatCard
            label="Complete Passes"
            icon="✅"
            value={loading ? "—" : fullImages}
            sub="≥90% packets recovered"
            accent="green"
          />
          <StatCard
            label="Avg Completeness"
            icon="📊"
            value={loading ? "—" : avgCompleteness !== null ? `${avgCompleteness}%` : "—"}
            sub="across all merged passes"
            accent="amber"
          />
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-3 mb-8">
          <span className="text-sm text-slate-500 font-medium">Show:</span>
          {[
            { id: "all",      label: "All",      count: images.length      },
            { id: "complete", label: "Complete", count: fullImages          },
            { id: "partial",  label: "Partial",  count: images.length - fullImages },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`h-9 px-4 rounded-xl text-sm font-medium transition-all ${
                filter === tab.id
                  ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30"
                  : "bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.07] text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/[0.06]"
              }`}
            >
              {tab.label}
              <span className={`ml-2 text-xs font-mono ${filter === tab.id ? "text-cyan-500" : "text-slate-400 dark:text-slate-600"}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 fade-up">
            {[...Array(8)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 text-center fade-up">
            <div className="w-20 h-20 rounded-3xl bg-slate-100 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] flex items-center justify-center text-4xl mb-6">
              🛰️
            </div>
            <p className="text-xl font-bold text-slate-700 dark:text-slate-300 mb-2">No images yet</p>
            <p className="text-slate-500 text-sm max-w-sm leading-relaxed">
              Images appear once the primary station merges packets from both ground stations and uploads to Arweave.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 fade-up">
            {filtered.map((img) => (
              <ImageCard key={img.arweaveTxId} img={img} onClick={setSelected} />
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-center gap-2 mt-12 pb-4 text-sm text-slate-500 dark:text-slate-700">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shadow shadow-emerald-500/50" />
          Auto-refreshing every 30s &nbsp;·&nbsp; Permanently stored on Arweave &nbsp;·&nbsp; Coordinated via Hedera HCS
        </div>
      </main>

      {selected && <Lightbox img={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}
