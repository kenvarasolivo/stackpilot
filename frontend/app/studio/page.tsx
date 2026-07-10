"use client";

import { useCallback, useState } from "react";
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

  const busy = status === "loading" || status === "streaming";

  const handleGenerate = useCallback(async () => {
    if (busy) return;
    setStatus("loading");
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
    setFlash({ id, nonce: Date.now() });
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      <ConfigPanel
        framework={framework}
        onFramework={handleFramework}
        mode={mode}
        onMode={setMode}
        query={query}
        onQuery={setQuery}
        busy={busy}
        onGenerate={handleGenerate}
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
      />
      <SourcesPanel
        status={status}
        sources={sources}
        flash={flash}
        verification={verification}
        onView={setModalSource}
      />
      <SourceModal source={modalSource} onClose={() => setModalSource(null)} />
    </div>
  );
}
