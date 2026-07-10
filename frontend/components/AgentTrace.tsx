"use client";

import { AGENT_STAGES, type AgentTraceState } from "@/lib/types";

interface Props {
  trace: AgentTraceState;
}

/** Horizontal pipeline timeline: plan -> retrieve -> grade -> write -> verify.
 *  Each node pulses while its stage runs and shows the stage's result detail. */
export default function AgentTrace({ trace }: Props) {
  const activeDetail =
    AGENT_STAGES.map(({ id, label }) => ({ label, ...trace[id] }))
      .reverse()
      .find((s) => s.status !== "idle" && s.detail) ?? null;

  const planQueries = trace.plan.data?.queries;

  return (
    <div className="rise-in mb-7 rounded-xl border border-edge bg-card/60 px-4 py-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-[10px] font-mono uppercase tracking-[0.16em] text-muted">Agent pipeline</span>
        <span className="text-[10px] font-mono text-muted/70">plan · retrieve · grade · write · verify</span>
      </div>

      <ol className="mt-3 flex items-center">
        {AGENT_STAGES.map(({ id, label }, i) => {
          const s = trace[id];
          return (
            <li key={id} className={`flex items-center ${i > 0 ? "flex-1" : ""}`}>
              {i > 0 && (
                <span
                  className={`h-px flex-1 mx-2 transition-colors duration-300 ${
                    s.status !== "idle" ? "bg-accent/50" : "bg-edge"
                  }`}
                />
              )}
              <span className="flex items-center gap-1.5">
                <span
                  className={`h-5 w-5 grid place-items-center rounded-full border font-mono text-[9px] font-bold transition-all duration-300 ${
                    s.status === "done"
                      ? "border-accent/60 bg-accent/10 text-accent-bright"
                      : s.status === "running"
                        ? "border-accent bg-accent/15 text-accent-bright animate-pulse shadow-glow-soft"
                        : "border-edge bg-canvas text-muted/60"
                  }`}
                >
                  {s.status === "done" ? (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m5 13 4 4L19 7" />
                    </svg>
                  ) : (
                    i + 1
                  )}
                </span>
                <span
                  className={`text-[11px] font-semibold transition-colors ${
                    s.status === "running" ? "text-accent-bright" : s.status === "done" ? "text-ink/85" : "text-muted/60"
                  }`}
                >
                  {label}
                </span>
              </span>
            </li>
          );
        })}
      </ol>

      {(activeDetail || planQueries) && (
        <div className="mt-2.5 border-t border-edge/60 pt-2 space-y-1">
          {activeDetail && (
            <p className="text-[11px] font-mono text-muted truncate">
              <span className="text-accent/90">{activeDetail.label.toLowerCase()}</span> · {activeDetail.detail}
            </p>
          )}
          {planQueries && planQueries.length > 0 && (
            <p className="text-[11px] font-mono text-muted/70 truncate" title={planQueries.join("  |  ")}>
              queries: {planQueries.map((q) => `"${q}"`).join(" · ")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
