"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { PublicKey } from "@solana/web3.js";
import Image from "next/image";

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

export default function Header({ onConnect, currentAddress }) {
  const [input, setInput] = useState(currentAddress || "");
  const [inputError, setInputError] = useState("");

  function handleSubmit(e) {
    e.preventDefault();
    const trimmed = input.trim();
    try { new PublicKey(trimmed); } catch {
      setInputError("Invalid Solana address");
      return;
    }
    setInputError("");
    onConnect(trimmed);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 dark:border-white/[0.06] bg-white/95 dark:bg-[#030712]/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-5">

        {/* Logo */}
        <div className="flex items-center gap-3.5 shrink-0">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-cyan-500/20 flex items-center justify-center">
              <Image src="/azimuth_logo.png" alt="Azimuth" width={40} height={40} className="object-contain" />
            </div>
            <span className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="ping-slow absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-400 shadow shadow-emerald-400/60" />
            </span>
          </div>
          <div className="hidden sm:block">
            <div className="text-base font-bold text-slate-900 dark:text-white tracking-tight leading-none">Azimuth</div>
            <div className="text-xs text-slate-500 uppercase tracking-widest mt-0.5">Node Dashboard</div>
          </div>
        </div>

        <div className="hidden sm:block h-6 w-px bg-slate-200 dark:bg-white/[0.08] shrink-0" />

        {/* Address Input */}
        <form onSubmit={handleSubmit} className="flex items-center gap-3 flex-1 min-w-0">
          <div className="relative flex-1 max-w-xl">
            <div className="absolute inset-y-0 left-3.5 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-slate-400 dark:text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
              </svg>
            </div>
            <input
              type="text"
              value={input}
              onChange={(e) => { setInput(e.target.value); setInputError(""); }}
              placeholder="Enter station address (base58)..."
              className="w-full h-10 bg-slate-50 dark:bg-white/[0.04] border border-slate-300 dark:border-white/[0.09] rounded-xl pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-cyan-500/50 focus:bg-white dark:focus:bg-white/[0.06] focus:ring-1 focus:ring-cyan-500/20 transition-all font-mono"
            />
            {inputError && (
              <p className="absolute -bottom-6 left-0 text-xs text-red-400">{inputError}</p>
            )}
          </div>
          <button
            type="submit"
            className="h-10 px-5 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-white text-sm font-semibold rounded-xl transition-all shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 whitespace-nowrap shrink-0"
          >
            Load Station
          </button>
        </form>

        {/* Right badges */}
        <div className="hidden lg:flex items-center gap-2.5 shrink-0">
          {currentAddress && (
            <span className="h-8 flex items-center text-xs font-mono text-slate-500 bg-slate-50 dark:bg-white/[0.03] px-3 rounded-lg border border-slate-200 dark:border-white/[0.07]">
              {currentAddress.slice(0, 6)}…{currentAddress.slice(-4)}
            </span>
          )}
          <span className="h-8 flex items-center gap-2 text-xs px-3 rounded-lg bg-purple-500/[0.08] text-purple-500 dark:text-purple-400 border border-purple-500/20 font-medium">
            <span className="w-2 h-2 rounded-full bg-purple-400 shadow-sm shadow-purple-400/60" />
            Solana Devnet
          </span>
          <ThemeToggle />
        </div>

        {/* Mobile theme toggle */}
        <div className="lg:hidden ml-auto shrink-0">
          <ThemeToggle />
        </div>

      </div>
    </header>
  );
}
