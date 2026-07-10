"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { API_URL } from "@/lib/api";
import { FRAMEWORKS, MODES, MODE_META, type Framework, type Mode } from "@/lib/types";

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

/** Layered-stack brand mark: a solid gradient top layer over two receding strokes. */
export function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id="sp-mark" x1="4" y1="3" x2="20" y2="13" gradientUnits="userSpaceOnUse">
          <stop stopColor="#C4B5FD" />
          <stop offset="1" stopColor="#7C3AED" />
        </linearGradient>
      </defs>
      <path d="M12 2.4 20.6 7.5 12 12.6 3.4 7.5 12 2.4Z" fill="url(#sp-mark)" />
      <path d="M3.4 12.3 12 17.4l8.6-5.1" stroke="#A78BFA" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" opacity="0.6" />
      <path d="M3.4 16.9 12 22l8.6-5.1" stroke="#A78BFA" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" opacity="0.28" />
    </svg>
  );
}

const MODE_PATHS: Record<Mode, React.ReactNode> = {
  "deep-dive": (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="8.5" y="14" width="7" height="7" rx="1.5" />
      <path d="M6.5 10v2.5h11V10M12 12.5V14" />
    </>
  ),
  "code-first": <path d="m8 7-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16" />,
  comparison: (
    <>
      <path d="M12 3v18M7 21h10" />
      <path d="M3 7h4c2 0 4-.7 5-1.5C13 6.3 15 7 17 7h4" />
      <path d="m5 7-2.5 6a2.9 2.9 0 0 0 5 0L5 7ZM19 7l-2.5 6a2.9 2.9 0 0 0 5 0L19 7Z" />
    </>
  ),
};

/** Scalable stroke icon for a masterclass mode (inherits currentColor). */
export function ModeIcon({ mode, size = 16 }: { mode: Mode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {MODE_PATHS[mode]}
    </svg>
  );
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
      <header className="relative px-6 pt-7 pb-6 border-b border-edge/70 overflow-hidden">
        <div className="pointer-events-none absolute -top-16 -left-10 h-40 w-64 bg-[radial-gradient(closest-side,rgba(124,58,237,0.16),transparent)]" />
        <Link href="/" title="Back to the landing page" className="group relative flex items-center gap-3.5">
          <span className="shrink-0 drop-shadow-[0_0_14px_rgba(124,58,237,0.5)] transition-transform group-hover:scale-105">
            <BrandMark size={36} />
          </span>
          <div>
            <h1 className="font-display text-[20px] font-bold tracking-[-0.03em] leading-none text-ink transition-colors group-hover:text-accent-bright">
              StackPilot
            </h1>
            <p className="text-[9.5px] font-mono text-muted mt-2 tracking-[0.26em] uppercase">Framework Masterclass</p>
          </div>
        </Link>
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
              className="w-full flex items-center justify-between gap-3 rounded-lg bg-card border border-edge px-3.5 py-2.5 text-sm font-medium hover:border-muted/60 focus:outline-none focus:border-accent/60 focus:shadow-glow-soft transition-colors"
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
                    className={`flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] font-medium cursor-pointer border-l-2 border-transparent hover:bg-accent/5 hover:border-accent transition-colors ${
                      f.id === framework.id ? "text-accent-bright" : "text-ink"
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

        {/* Mode selector — full cards so the active teaching style is unmissable */}
        <section>
          <label className="block text-[11px] font-semibold tracking-[0.14em] uppercase text-muted">Masterclass Mode</label>
          <div className="mt-2.5 space-y-2" role="radiogroup" aria-label="Masterclass mode">
            {MODES.map((m) => {
              const selected = mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => onMode(m.id)}
                  className={`w-full text-left rounded-xl border p-3.5 transition-all ${
                    selected
                      ? "border-accent/60 bg-accent/[0.07] shadow-glow-soft"
                      : "border-edge bg-card hover:border-muted/50"
                  }`}
                >
                  <span className="flex items-center gap-2.5">
                    <span
                      className={`h-7 w-7 shrink-0 grid place-items-center rounded-lg border transition-colors ${
                        selected ? "border-accent/50 bg-accent/10 text-accent-bright" : "border-edge bg-canvas text-muted"
                      }`}
                    >
                      <ModeIcon mode={m.id} />
                    </span>
                    <span className={`text-[13px] font-semibold ${selected ? "text-ink" : "text-ink/80"}`}>{m.label}</span>
                    <span
                      className={`ml-auto h-4 w-4 shrink-0 grid place-items-center rounded-full border transition-all ${
                        selected ? "border-accent bg-accent text-canvas" : "border-edge bg-transparent"
                      }`}
                    >
                      {selected && (
                        <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m5 13 4 4L19 7" />
                        </svg>
                      )}
                    </span>
                  </span>
                  <span className={`mt-2 block text-[11.5px] leading-relaxed ${selected ? "text-ink/70" : "text-muted"}`}>
                    {m.desc}
                  </span>
                </button>
              );
            })}
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
            placeholder={
              mode === "comparison"
                ? "Describe only your use case — the stacks are picked in the workspace. e.g., A SaaS dashboard with real-time charts, a small team, SEO matters..."
                : "e.g., Explain how to set up multi-tenant row-level security using Neon pgvector and Next.js..."
            }
            className="mt-2.5 w-full resize-none rounded-lg bg-card border border-edge px-3.5 py-3 text-sm leading-relaxed placeholder:text-muted/60 focus:outline-none focus:border-accent/60 focus:shadow-glow-soft transition-colors panel-scroll"
          />
        </section>

        {/* Action — label reflects the selected mode */}
        <button
          type="button"
          onClick={onGenerate}
          disabled={busy}
          className="w-full rounded-lg bg-[linear-gradient(180deg,#8B5CF6,#6D28D9)] text-white font-semibold text-sm py-3 px-4 flex items-center justify-center gap-2 shadow-[0_0_0_1px_rgba(139,92,246,0.45),0_8px_24px_-8px_rgba(124,58,237,0.55)] hover:brightness-110 active:scale-[.985] focus:outline-none focus-visible:shadow-glow transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {busy ? (
            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
              <path d="M21 12a9 9 0 1 1-6.2-8.56" />
            </svg>
          ) : (
            <span className="text-accent-bright"><ModeIcon mode={mode} /></span>
          )}
          <span>{busy ? "Synthesizing path…" : `Generate ${MODE_META[mode].short} Masterclass`}</span>
        </button>
      </div>

      {/* Footer / backend status */}
      <footer className="px-6 py-4 border-t border-edge/70 flex items-center justify-between text-[11px] text-muted/70">
        <span className="font-mono">v1.0.0</span>
        <span className="flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              apiUp === null ? "bg-muted" : apiUp ? "bg-accent shadow-glow-soft" : "bg-red-400"
            }`}
          />
          <span>{apiUp === null ? "checking API…" : apiUp ? "FastAPI connected" : "API offline — start uvicorn :8000"}</span>
        </span>
      </footer>
    </aside>
  );
}
