"use client";

import { FRAMEWORKS, MODE_META, type AgentTraceState, type Framework, type Mode, type Status } from "@/lib/types";
import AgentTrace from "./AgentTrace";
import { ModeIcon } from "./ConfigPanel";
import MasterclassMarkdown from "./MasterclassMarkdown";

interface Props {
  status: Status;
  markdown: string;
  error: string | null;
  framework: Framework;
  /** challenger stack for comparison mode */
  compareTo: Framework;
  onCompareTo: (f: Framework) => void;
  mode: Mode;
  /** mode the current output was generated with; null before the first run */
  generatedMode: Mode | null;
  trace: AgentTraceState;
  citeIds: number[];
  onCite: (id: number) => void;
  onGenerate: () => void;
}

function Skeleton() {
  return (
    <div className="space-y-5 pt-2" aria-hidden="true">
      <div className="skel h-4 w-40" />
      <div className="skel h-9 w-4/5" />
      <div className="skel h-4 w-3/5" />
      <div className="pt-4 space-y-3">
        <div className="skel h-4 w-full" />
        <div className="skel h-4 w-11/12" />
        <div className="skel h-4 w-4/6" />
      </div>
      <div className="skel h-44 w-full !rounded-xl" />
      <div className="space-y-3">
        <div className="skel h-4 w-full" />
        <div className="skel h-4 w-5/6" />
      </div>
      <div className="skel h-24 w-full !rounded-xl" />
    </div>
  );
}

export default function Workspace({ status, markdown, error, framework, compareTo, onCompareTo, mode, generatedMode, trace, citeIds, onCite, onGenerate }: Props) {
  const busy = status === "loading" || status === "streaming";
  const staleMode = status === "done" && generatedMode !== null && generatedMode !== mode;
  const isComparison = mode === "comparison";

  return (
    <main className="relative w-1/2 flex flex-col h-full bg-canvas border-r border-edge">
      {/* Ambient hero glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(60%_100%_at_50%_0%,rgba(124,58,237,0.12),transparent_70%)]" />

      {/* Header */}
      <div className="relative shrink-0 border-b border-edge/70 bg-canvas/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-7 py-3.5">
          <div className="flex items-center gap-2.5">
            <h2 className="text-[13px] font-semibold tracking-wide text-ink/90">Masterclass Workspace</h2>
            {status === "streaming" && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-accent/30 text-accent bg-accent/5">
                streaming
              </span>
            )}
            {status === "done" && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-accent/30 text-accent bg-accent/5">
                generated
              </span>
            )}
          </div>
          {/* Live selection readout — re-animates whenever the mode changes */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[11px] text-muted font-mono truncate">
              {isComparison ? `${framework.label} vs ${compareTo.label}` : framework.label}
            </span>
            <span
              key={mode}
              className="mode-pop shrink-0 inline-flex items-center gap-1.5 text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border border-accent/40 text-accent-bright bg-accent/10"
            >
              <span className="h-1 w-1 rounded-full bg-accent" />
              {MODE_META[mode].label}
            </span>
          </div>
        </div>
        {/* Loading bar */}
        <div className={`h-[2px] ${busy ? "loading-bar" : ""}`} />
      </div>

      {/* Feed */}
      <div className="relative flex-1 overflow-y-auto panel-scroll px-7 lg:px-10 py-8">
        <div className="max-w-[720px] mx-auto">
          {/* Comparison matchup bar — the challenger is picked here, so the
              learning goal only needs to describe the use case */}
          {isComparison && (
            <div className="rise-in mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-edge bg-card/60 px-4 py-3">
              <span className="text-[10.5px] font-semibold tracking-[0.14em] uppercase text-muted">Comparing</span>
              <span className="inline-flex items-center gap-1.5 text-[12px] font-medium border border-edge rounded-lg px-2.5 py-1.5 bg-card">
                <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: framework.color }} />
                {framework.label}
              </span>
              <span className="text-[11px] font-mono font-bold text-accent-bright">vs</span>
              <div className="relative">
                <select
                  value={compareTo.id}
                  onChange={(e) => onCompareTo(FRAMEWORKS.find((f) => f.id === e.target.value)!)}
                  aria-label="Stack to compare against"
                  className="appearance-none cursor-pointer rounded-lg bg-card border border-edge pl-6 pr-8 py-1.5 text-[12px] font-medium text-ink hover:border-muted/60 focus:outline-none focus:border-accent/60 focus:shadow-glow-soft transition-colors"
                >
                  {FRAMEWORKS.filter((f) => f.id !== framework.id).map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <span
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full"
                  style={{ background: compareTo.color }}
                />
                <svg
                  className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                >
                  <path d="m6 9 6 6 6-6" />
                </svg>
              </div>
            </div>
          )}

          {/* Mode changed after generation — offer a one-click regenerate */}
          {staleMode && (
            <div className="rise-in mb-6 flex items-center justify-between gap-4 rounded-xl border border-accent/35 bg-accent/[0.06] px-4 py-3">
              <p className="text-[12.5px] leading-relaxed text-ink/85">
                This masterclass was generated as{" "}
                <span className="font-semibold text-accent-bright">{generatedMode ? MODE_META[generatedMode].label : ""}</span>.
                You&apos;re now on <span className="font-semibold text-accent-bright">{MODE_META[mode].label}</span> — regenerate to
                apply it.
              </p>
              <button
                type="button"
                onClick={onGenerate}
                className="shrink-0 text-[11.5px] font-semibold rounded-lg border border-accent/50 text-accent-bright bg-accent/10 px-3 py-1.5 hover:bg-accent/20 transition-colors"
              >
                Regenerate
              </button>
            </div>
          )}

          {status !== "idle" && <AgentTrace trace={trace} />}

          {status === "idle" && (
            <div className="min-h-[380px] h-full flex flex-col items-center justify-center text-center gap-5 pt-24">
              <div
                key={mode}
                className="mode-pop text-accent-bright drop-shadow-[0_0_28px_rgba(124,58,237,0.55)]"
              >
                <ModeIcon mode={mode} size={64} />
              </div>
              <div key={`${mode}-copy`} className="mode-pop">
                <p className="font-display text-[19px] font-semibold tracking-tight text-ink">
                  {MODE_META[mode].label}
                </p>
                <p className="mt-2 text-[13px] text-accent-bright/80 max-w-sm leading-relaxed">{MODE_META[mode].desc}</p>
                <p className="mt-3 text-[12.5px] text-muted max-w-sm leading-relaxed">
                  {isComparison
                    ? "Pick the challenger stack above and describe your use case on the left — no need to name the frameworks in your goal."
                    : "Pick a stack and describe a learning goal on the left. Retrieval runs on Neon, generation streams live from Gemini."}
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-mono text-muted border border-edge rounded-full px-2.5 py-1">
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: framework.color }} />
                {framework.label}
                {isComparison && (
                  <>
                    <span className="text-accent-bright font-bold">vs</span>
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: compareTo.color }} />
                    {compareTo.label}
                  </>
                )}
              </span>
            </div>
          )}

          {status === "loading" && <Skeleton />}

          {(status === "streaming" || status === "done") && (
            <div className="rise-in">
              <MasterclassMarkdown markdown={markdown} citeIds={citeIds} onCite={onCite} />
              {status === "streaming" && <span className="stream-caret" />}
              <div className="h-16" />
            </div>
          )}

          {status === "error" && (
            <div className="rise-in mt-6 rounded-xl border border-red-400/30 bg-red-400/5 p-5">
              <p className="text-[13px] font-semibold text-red-300 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v4M12 16h.01" />
                </svg>
                Generation failed
              </p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-muted whitespace-pre-wrap">{error}</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
