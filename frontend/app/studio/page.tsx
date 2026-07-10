"use client";

import { useCallback, useState, type ReactNode } from "react";
import ConfigPanel from "@/components/ConfigPanel";
import SourceModal from "@/components/SourceModal";
import SourcesPanel from "@/components/SourcesPanel";
import Workspace from "@/components/Workspace";
import { streamMasterclass } from "@/lib/api";
import {
  emptyTrace,
  FRAMEWORKS,
  type AgentTraceState,
  type CitationCheck,
  type Framework,
  type Mode,
  type SourceDoc,
  type Status,
} from "@/lib/types";

// which panel is visible on small screens; desktop (lg+) always shows all three
type MobileView = "config" | "workspace" | "sources";

const MOBILE_TABS: { id: MobileView; label: string; icon: ReactNode }[] = [
  {
    id: "config",
    label: "Setup",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6" />
      </svg>
    ),
  },
  {
    id: "workspace",
    label: "Masterclass",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2Z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7Z" />
      </svg>
    ),
  },
  {
    id: "sources",
    label: "Sources",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
      </svg>
    ),
  },
];

export default function Home() {
  const [framework, setFramework] = useState<Framework>(FRAMEWORKS[0]);
  // challenger stack for comparison mode (defaults to FastAPI + Vite vs the Next.js default)
  const [compareTo, setCompareTo] = useState<Framework>(
    () => FRAMEWORKS.find((f) => f.id === "fastapi-vite") ?? FRAMEWORKS[1]
  );
  const [mode, setMode] = useState<Mode>("deep-dive");
  const [query, setQuery] = useState("");

  const [status, setStatus] = useState<Status>("idle");
  const [markdown, setMarkdown] = useState("");
  const [sources, setSources] = useState<SourceDoc[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [trace, setTrace] = useState<AgentTraceState>(emptyTrace());
  const [verification, setVerification] = useState<CitationCheck[]>([]);
  // mode the current output was generated with (to flag a stale mode selection)
  const [generatedMode, setGeneratedMode] = useState<Mode | null>(null);

  // nonce lets the same citation re-trigger the flash animation
  const [flash, setFlash] = useState<{ id: number; nonce: number } | null>(null);
  const [modalSource, setModalSource] = useState<SourceDoc | null>(null);
  const [mobileView, setMobileView] = useState<MobileView>("config");

  const busy = status === "loading" || status === "streaming";

  const handleGenerate = useCallback(async () => {
    if (busy) return;
    setStatus("loading");
    // on phones, jump to the workspace so the pipeline + stream are visible
    setMobileView("workspace");
    setMarkdown("");
    setSources([]);
    setError(null);
    setFlash(null);
    setTrace(emptyTrace());
    setVerification([]);
    setGeneratedMode(mode);

    // In comparison mode the stacks come from the selectors, so the query only
    // needs the use case; the backend composes the full "A vs B" goal.
    const fallbackQuery =
      mode === "comparison"
        ? "a typical production web application"
        : "Give me a practical masterclass on this framework's core architecture.";

    await streamMasterclass(
      {
        framework: framework.id,
        mode,
        query: query.trim() || fallbackQuery,
        ...(mode === "comparison" ? { compare_to: compareTo.id } : {}),
      },
      {
        onAgent: (stage, state) =>
          setTrace((prev) => ({
            ...prev,
            [stage]: { ...state, data: state.data ?? prev[stage].data },
          })),
        onSources: (s) => {
          setSources(s);
          setStatus("streaming");
        },
        onDelta: (text) => setMarkdown((prev) => prev + text),
        onVerification: setVerification,
        onDone: () => setStatus("done"),
        onError: (message) => {
          setError(message);
          setStatus("error");
        },
      }
    );
  }, [busy, framework.id, mode, query, compareTo.id]);

  // keep the challenger distinct from the primary stack
  const handleFramework = useCallback((f: Framework) => {
    setFramework(f);
    setCompareTo((prev) => (prev.id === f.id ? FRAMEWORKS.find((x) => x.id !== f.id)! : prev));
  }, []);

  const handleCite = useCallback((id: number) => {
    // on phones, reveal the sources panel so the flashed card can be seen
    setMobileView("sources");
    setFlash({ id, nonce: Date.now() });
  }, []);

  // panels stay mounted on every screen size; below lg only the active one is shown
  const panelCls = (view: MobileView) => `${mobileView === view ? "flex" : "hidden"} lg:flex`;

  return (
    <div className="flex flex-col h-dvh overflow-hidden">
      <div className="flex flex-1 min-h-0">
        <ConfigPanel
          framework={framework}
          onFramework={handleFramework}
          mode={mode}
          onMode={setMode}
          query={query}
          onQuery={setQuery}
          busy={busy}
          onGenerate={handleGenerate}
          className={panelCls("config")}
        />
        <Workspace
          status={status}
          markdown={markdown}
          error={error}
          framework={framework}
          compareTo={compareTo}
          onCompareTo={setCompareTo}
          mode={mode}
          generatedMode={generatedMode}
          trace={trace}
          citeIds={sources.map((s) => s.id)}
          onCite={handleCite}
          onGenerate={handleGenerate}
          className={panelCls("workspace")}
        />
        <SourcesPanel
          status={status}
          sources={sources}
          flash={flash}
          verification={verification}
          onView={setModalSource}
          className={panelCls("sources")}
        />
      </div>

      {/* Mobile bottom tab bar */}
      <nav
        aria-label="Studio panels"
        className="lg:hidden shrink-0 flex border-t border-edge bg-card/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]"
      >
        {MOBILE_TABS.map((tab) => {
          const active = mobileView === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setMobileView(tab.id)}
              aria-current={active ? "page" : undefined}
              className={`relative flex-1 flex flex-col items-center gap-1 pt-2.5 pb-2 text-[10px] font-semibold tracking-wide transition-colors ${
                active ? "text-accent-bright" : "text-muted hover:text-ink"
              }`}
            >
              <span className={`absolute top-0 inset-x-7 h-0.5 rounded-full ${active ? "bg-accent" : "bg-transparent"}`} />
              <span className="relative">
                {tab.icon}
                {tab.id === "sources" && sources.length > 0 && (
                  <span className="absolute -top-1 -right-2.5 min-w-[14px] h-3.5 px-1 grid place-items-center rounded-full bg-accent text-white font-mono text-[8.5px] font-bold leading-none">
                    {sources.length}
                  </span>
                )}
                {tab.id === "workspace" && busy && (
                  <span className="absolute -top-0.5 -right-1.5 h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                )}
              </span>
              {tab.label}
            </button>
          );
        })}
      </nav>

      <SourceModal source={modalSource} onClose={() => setModalSource(null)} />
    </div>
  );
}
