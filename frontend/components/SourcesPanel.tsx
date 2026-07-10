"use client";

import { useEffect, useRef } from "react";
import type { CitationCheck, SourceDoc, Status } from "@/lib/types";

interface Props {
  status: Status;
  sources: SourceDoc[];
  flash: { id: number; nonce: number } | null;
  verification: CitationCheck[];
  onView: (source: SourceDoc) => void;
}

function fileTag(url: string): string {
  if (url.includes("neon.tech")) return "SQL";
  if (url.includes("fastapi")) return "PY";
  if (url.includes("nextjs")) return "TS";
  return "MD";
}

const VERDICT_STYLE: Record<CitationCheck["verdict"], { label: string; cls: string }> = {
  supported: { label: "✓ verified", cls: "text-emerald-300 border-emerald-300/40 bg-emerald-300/5" },
  partial: { label: "~ partial", cls: "text-amber-300 border-amber-300/40 bg-amber-300/5" },
  unsupported: { label: "✗ unsupported", cls: "text-red-300 border-red-300/40 bg-red-300/5" },
};

export default function SourcesPanel({ status, sources, flash, verification, onView }: Props) {
  const cardRefs = useRef<Map<number, HTMLElement>>(new Map());
  const verdictById = new Map(verification.map((c) => [c.id, c]));

  // citation clicked in the workspace -> scroll + flash the matching card
  useEffect(() => {
    if (!flash) return;
    const card = cardRefs.current.get(flash.id);
    if (!card) return;
    card.classList.remove("cite-flash");
    void card.offsetWidth; // reflow so the animation can retrigger
    card.classList.add("cite-flash");
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    const t = setTimeout(() => card.classList.remove("cite-flash"), 1800);
    return () => clearTimeout(t);
  }, [flash]);

  return (
    <aside className="w-1/4 min-w-[290px] flex flex-col h-full bg-card/40">
      <div className="shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-edge/70">
        <h2 className="text-[13px] font-semibold tracking-wide text-ink/90 flex items-center gap-2">
          <svg className="h-3.5 w-3.5 text-accent/90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
          </svg>
          RAG Sources
        </h2>
        <span className="text-[10px] font-mono text-muted border border-edge rounded-full px-2 py-0.5">
          {status === "loading" ? "retrieving…" : `${sources.length} retrieved`}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto panel-scroll px-4 py-4 space-y-3">
        {sources.length === 0 && status !== "loading" && (
          <div className="h-full min-h-[240px] flex flex-col items-center justify-center text-center gap-3 px-4">
            <svg className="h-8 w-8 text-muted/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="m21 21-4.3-4.3" />
            </svg>
            <p className="text-[12px] text-muted leading-relaxed">
              Documentation chunks retrieved from Neon will appear here, matched to inline citations like{" "}
              <span className="cite-chip pointer-events-none">1</span> in the workspace.
            </p>
          </div>
        )}

        {status === "loading" &&
          [0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-[10px] border border-edge bg-card p-3.5 space-y-2.5" style={{ opacity: 1 - i * 0.15 }} aria-hidden="true">
              <div className="flex justify-between gap-3">
                <div className="skel h-4 w-2/3" />
                <div className="skel h-4 w-8" />
              </div>
              <div className="skel h-3 w-full" />
              <div className="skel h-3 w-4/5" />
              <div className="skel h-7 w-full !rounded-md" />
            </div>
          ))}

        {sources.map((s, i) => (
          <article
            key={s.id}
            ref={(el) => {
              if (el) cardRefs.current.set(s.id, el);
              else cardRefs.current.delete(s.id);
            }}
            className="rounded-[10px] border border-edge bg-card p-3.5 transition-colors hover:border-muted/60 rise-in"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="h-5 w-5 shrink-0 grid place-items-center rounded-md bg-canvas border border-edge font-mono text-[9.5px] font-bold text-accent-bright">
                  {s.id}
                </span>
                <h3 className="text-[12.5px] font-semibold leading-snug truncate" title={s.section_title}>
                  {s.section_title}
                </h3>
              </div>
              <span className="shrink-0 font-mono text-[9px] font-bold tracking-[0.08em] text-accent-bright bg-accent/5 border border-accent/30 rounded px-1.5 py-0.5">
                {fileTag(s.doc_url)}
              </span>
            </div>
            <p className="mt-2 text-[11.5px] leading-relaxed text-muted line-clamp-2">{s.raw_content}</p>
            <div className="mt-2 flex items-center justify-between gap-2">
              <p className="text-[10px] font-mono text-muted/60 truncate">{s.doc_url}</p>
              {typeof s.relevance === "number" && (
                <span className="shrink-0 text-[9.5px] font-mono text-accent/90" title="cosine similarity to the planned query">
                  {(s.relevance * 100).toFixed(0)}% match
                </span>
              )}
            </div>
            {verdictById.has(s.id) && (
              <span
                className={`mt-2 inline-flex items-center gap-1 text-[9.5px] font-mono font-semibold border rounded px-1.5 py-0.5 ${VERDICT_STYLE[verdictById.get(s.id)!.verdict].cls}`}
                title={verdictById.get(s.id)!.note || "citation audit by the verifier agent"}
              >
                {VERDICT_STYLE[verdictById.get(s.id)!.verdict].label}
              </span>
            )}
            <button
              type="button"
              onClick={() => onView(s)}
              className="w-full mt-2.5 inline-flex items-center justify-center gap-1.5 text-[11.5px] font-semibold text-muted border border-edge rounded-[7px] px-2.5 py-1.5 hover:text-accent-bright hover:border-accent/45 hover:bg-accent/5 transition-all"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              View Full Docs
            </button>
          </article>
        ))}
      </div>
    </aside>
  );
}
