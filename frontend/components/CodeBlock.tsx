"use client";

import { useMemo, useState } from "react";
import { highlight } from "@/lib/highlight";

interface Props {
  language: string;
  code: string;
}

export default function CodeBlock({ language, code }: Props) {
  const [copied, setCopied] = useState(false);
  const html = useMemo(() => highlight(code, language), [code, language]);

  const copy = () => {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    });
  };

  return (
    <figure className="mt-5 rounded-[10px] border border-edge bg-[#0A0E14] overflow-hidden shadow-lg shadow-black/30">
      <div className="flex items-center justify-between gap-3 px-3 py-2 pl-4 bg-[#10151D] border-b border-[#21262D]">
        <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-neon bg-neon/5 border border-neon/25 rounded px-1.5 py-0.5">
          {language || "code"}
        </span>
        <button
          type="button"
          onClick={copy}
          className={`inline-flex items-center gap-1.5 font-mono text-[11px] font-semibold rounded-md border px-2.5 py-1 transition-all ${
            copied
              ? "text-neon border-neon/45 bg-neon/5"
              : "text-muted border-edge hover:text-ink hover:border-muted/60"
          }`}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="12" height="12" rx="2" />
            <path d="M5 15V5a2 2 0 0 1 2-2h10" />
          </svg>
          {copied ? "Copied ✓" : "Copy Code"}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto panel-scroll font-mono text-[12.5px] leading-[1.7] text-[#C9D1D9]">
        <code dangerouslySetInnerHTML={{ __html: html }} />
      </pre>
    </figure>
  );
}
