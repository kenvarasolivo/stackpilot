"use client";

import { useEffect } from "react";
import type { SourceDoc } from "@/lib/types";

interface Props {
  source: SourceDoc | null;
  onClose: () => void;
}

export default function SourceModal({ source, onClose }: Props) {
  useEffect(() => {
    if (!source) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [source, onClose]);

  if (!source) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl max-h-[85dvh] flex flex-col rounded-xl bg-card border border-edge shadow-2xl shadow-black/60 rise-in">
        <div className="shrink-0 flex items-center justify-between gap-4 px-5 py-4 border-b border-edge">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-[9px] font-bold tracking-[0.08em] text-accent-bright bg-accent/5 border border-accent/30 rounded px-1.5 py-0.5">
                SOURCE [{source.id}]
              </span>
              <h3 className="text-sm font-semibold truncate">{source.section_title}</h3>
            </div>
            <a
              href={source.doc_url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block text-[11px] font-mono text-muted truncate hover:text-accent-bright transition-colors"
            >
              {source.doc_url}
            </a>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 h-8 w-8 grid place-items-center rounded-md border border-edge text-muted hover:text-ink hover:border-muted/60 focus:outline-none focus-visible:border-accent/60 transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto panel-scroll bg-canvas rounded-b-xl">
          <p className="px-5 pt-4 text-[10.5px] font-mono uppercase tracking-[0.14em] text-muted/70">
            Raw context retrieved from Neon · framework_docs
          </p>
          <pre className="p-5 pt-3 text-[12.5px] leading-[1.75] font-mono whitespace-pre-wrap break-words text-ink/85">
            {source.raw_content}
          </pre>
        </div>
      </div>
    </div>
  );
}
