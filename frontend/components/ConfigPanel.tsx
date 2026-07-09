"use client";

import { useEffect, useRef, useState } from "react";
import { API_URL } from "@/lib/api";
import { FRAMEWORKS, type Framework, type Mode } from "@/lib/types";

interface Props {
  framework: Framework;
  onFramework: (f: Framework) => void;
  mode: Mode;
  onMode: (m: Mode) => void;
  query: string;
  onQuery: (q: string) => void;
  busy: boolean;
  onGenerate: () => void;
}

export default function ConfigPanel({ framework, onFramework, mode, onMode, query, onQuery, busy, onGenerate }: Props) {
  const [open, setOpen] = useState(false);
  const [apiUp, setApiUp] = useState<boolean | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // close dropdown on outside click
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  // backend health probe
  useEffect(() => {
    let cancelled = false;
    const probe = () =>
      fetch(`${API_URL}/health`)
        .then((r) => !cancelled && setApiUp(r.ok))
        .catch(() => !cancelled && setApiUp(false));
    probe();
    const t = setInterval(probe, 15000);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  return (
    <aside className="w-1/4 min-w-[300px] flex flex-col border-r border-edge bg-card/40 h-full overflow-y-auto panel-scroll">
      {/* Brand */}
      <header className="px-6 pt-7 pb-6 border-b border-edge/70">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 shrink-0 rounded-xl bg-canvas border border-neon/40 shadow-neon-soft grid place-items-center">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path d="M13 2 4.5 13.5H11L9.5 22 19 9.5h-6.5L13 2Z" fill="#00FFFF" opacity="0.95" />
            </svg>
            <span className="absolute -inset-px rounded-xl ring-1 ring-neon/20 animate-pulse pointer-events-none" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-none">
              Stack<span className="text-neon">Pilot</span>
            </h1>
            <p className="text-[11px] text-muted mt-1.5 tracking-[0.14em] uppercase">AI Framework Masterclass</p>
          </div>
        </div>
      </header>

      <div className="flex-1 px-6 py-6 space-y-7">
        {/* Framework selector */}
        <section>
          <label className="block text-[11px] font-semibold tracking-[0.14em] uppercase text-muted">Active Stack</label>
          <div className="relative mt-2.5" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setOpen((o) => !o)}
              aria-haspopup="listbox"
              aria-expanded={open}
              className="w-full flex items-center justify-between gap-3 rounded-lg bg-card border border-edge px-3.5 py-2.5 text-sm font-medium hover:border-muted/60 focus:outline-none focus:border-neon/60 focus:shadow-neon-soft transition-colors"
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <span className="h-2 w-2 rounded-full shrink-0" style={{ background: framework.color }} />
                <span className="truncate">{framework.label}</span>
              </span>
              <svg
                className={`h-4 w-4 text-muted transition-transform duration-200 shrink-0 ${open ? "rotate-180" : ""}`}
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {open && (
              <ul role="listbox" className="absolute z-30 mt-2 w-full rounded-lg bg-card border border-edge shadow-2xl shadow-black/50 overflow-hidden">
                {FRAMEWORKS.map((f) => (
                  <li
                    key={f.id}
                    role="option"
                    aria-selected={f.id === framework.id}
                    onClick={() => {
                      onFramework(f);
                      setOpen(false);
                    }}
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium cursor-pointer border-l-2 border-transparent hover:bg-neon/5 hover:border-neon transition-colors ${
                      f.id === framework.id ? "text-neon" : "text-ink"
                    }`}
                  >
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: f.color }} />
                    <span className="truncate">{f.label}</span>
                    <span className="ml-auto font-mono text-[10px] text-muted">{f.sub}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Mode toggle */}
        <section>
          <label className="block text-[11px] font-semibold tracking-[0.14em] uppercase text-muted">Masterclass Mode</label>
          <div className="mt-2.5 grid grid-cols-2 gap-1 rounded-lg bg-canvas border border-edge p-1" role="tablist">
            {(
              [
                ["deep-dive", "Architectural Deep-Dive"],
                ["code-first", "Code-First Tutorial"],
              ] as [Mode, string][]
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                role="tab"
                aria-selected={mode === value}
                onClick={() => onMode(value)}
                className={`rounded-md px-2 py-2 text-[12px] font-semibold border transition-all ${
                  mode === value
                    ? "bg-card text-neon border-neon/35 shadow-neon-soft"
                    : "text-muted border-transparent hover:text-ink"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {/* Learning goal */}
        <section>
          <label htmlFor="goal" className="block text-[11px] font-semibold tracking-[0.14em] uppercase text-muted">
            Learning Goal
          </label>
          <textarea
            id="goal"
            rows={6}
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="e.g., Explain how to set up multi-tenant row-level security using Neon pgvector and Next.js..."
            className="mt-2.5 w-full resize-none rounded-lg bg-card border border-edge px-3.5 py-3 text-sm leading-relaxed placeholder:text-muted/60 focus:outline-none focus:border-neon/60 focus:shadow-neon-soft transition-colors panel-scroll"
          />
        </section>

        {/* Action */}
        <button
          type="button"
          onClick={onGenerate}
          disabled={busy}
          className="w-full rounded-lg bg-neon text-canvas font-bold text-sm py-3 px-4 flex items-center justify-center gap-2 hover:bg-neondim active:scale-[.985] focus:outline-none focus-visible:shadow-neon transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {busy ? (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <path d="M21 12a9 9 0 1 1-6.2-8.56" />
            </svg>
          ) : (
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2 4.5 13.5H11L9.5 22 19 9.5h-6.5L13 2Z" />
            </svg>
          )}
          <span>{busy ? "Synthesizing path…" : "Generate Masterclass Path"}</span>
        </button>
      </div>

      {/* Footer / backend status */}
      <footer className="px-6 py-4 border-t border-edge/70 flex items-center justify-between text-[11px] text-muted/70">
        <span className="font-mono">v1.0.0</span>
        <span className="flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              apiUp === null ? "bg-muted" : apiUp ? "bg-neon shadow-neon-soft" : "bg-red-400"
            }`}
          />
          <span>{apiUp === null ? "checking API…" : apiUp ? "FastAPI connected" : "API offline — start uvicorn :8000"}</span>
        </span>
      </footer>
    </aside>
  );
}
