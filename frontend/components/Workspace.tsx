"use client";

import type { AgentTraceState, Framework, Mode, Status } from "@/lib/types";
import AgentTrace from "./AgentTrace";
import MasterclassMarkdown from "./MasterclassMarkdown";

interface Props {
  status: Status;
  markdown: string;
  error: string | null;
  framework: Framework;
  mode: Mode;
  trace: AgentTraceState;
  citeIds: number[];
  onCite: (id: number) => void;
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

export default function Workspace({ status, markdown, error, framework, mode, trace, citeIds, onCite }: Props) {
  const busy = status === "loading" || status === "streaming";

  return (
    <main className="w-1/2 flex flex-col h-full bg-canvas border-r border-edge">
      {/* Header */}
      <div className="shrink-0 border-b border-edge/70 bg-canvas/90">
        <div className="flex items-center justify-between px-7 py-3.5">
          <div className="flex items-center gap-2.5">
            <h2 className="text-[13px] font-semibold tracking-wide text-ink/90">Masterclass Workspace</h2>
            {status === "streaming" && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-neon/30 text-neon bg-neon/5">
                streaming
              </span>
            )}
            {status === "done" && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-neon/30 text-neon bg-neon/5">
                generated
              </span>
            )}
          </div>
          <span className="text-[11px] text-muted font-mono truncate max-w-[50%]">
            {status === "idle" ? "" : `${framework.label} · ${mode}`}
          </span>
        </div>
        {/* Neon loading bar */}
        <div className={`h-[2px] ${busy ? "loading-bar" : ""}`} />
      </div>

      {/* Feed */}
      <div className="flex-1 overflow-y-auto panel-scroll px-7 lg:px-10 py-8">
        <div className="max-w-[720px] mx-auto">
          {status !== "idle" && <AgentTrace trace={trace} />}

          {status === "idle" && (
            <div className="min-h-[380px] h-full flex flex-col items-center justify-center text-center gap-4 pt-24">
              <div className="h-14 w-14 rounded-2xl border border-edge bg-card grid place-items-center">
                <svg className="h-6 w-6 text-neon/80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1" />
                  <circle cx="12" cy="12" r="3.2" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-ink/90">Your masterclass renders here</p>
                <p className="mt-1.5 text-[13px] text-muted max-w-sm leading-relaxed">
                  Pick a stack, describe a learning goal on the left, and hit{" "}
                  <span className="text-neon font-medium">Generate Masterclass Path</span>. Retrieval runs on Neon,
                  generation streams live from Gemini.
                </p>
              </div>
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
