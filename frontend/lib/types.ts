export interface SourceDoc {
  id: number;
  /** which stack this chunk belongs to — useful in comparison mode */
  framework_name?: string;
  section_title: string;
  doc_url: string;
  raw_content: string;
  /** 0..1 cosine similarity of this chunk to the (planned) query */
  relevance?: number;
}

export type AgentStage = "plan" | "retrieve" | "grade" | "write" | "verify";

export const AGENT_STAGES: { id: AgentStage; label: string }[] = [
  { id: "plan", label: "Plan" },
  { id: "retrieve", label: "Retrieve" },
  { id: "grade", label: "Grade" },
  { id: "write", label: "Write" },
  { id: "verify", label: "Verify" },
];

export interface AgentStageState {
  status: "idle" | "running" | "done";
  detail?: string;
  data?: { queries?: string[] };
}

export type AgentTraceState = Record<AgentStage, AgentStageState>;

export const emptyTrace = (): AgentTraceState => ({
  plan: { status: "idle" },
  retrieve: { status: "idle" },
  grade: { status: "idle" },
  write: { status: "idle" },
  verify: { status: "idle" },
});

export type CitationVerdict = "supported" | "partial" | "unsupported";

export interface CitationCheck {
  id: number;
  verdict: CitationVerdict;
  note?: string;
}

export interface Framework {
  id: string;
  label: string;
  sub: string;
  color: string;
}

export type Mode = "deep-dive" | "code-first" | "comparison";

export interface ModeMeta {
  id: Mode;
  label: string;
  short: string;
  desc: string;
}

export const MODES: ModeMeta[] = [
  {
    id: "deep-dive",
    label: "Architectural Deep-Dive",
    short: "Deep-Dive",
    desc: "Concepts, trade-offs and system design — the why behind the framework.",
  },
  {
    id: "code-first",
    label: "Code-First Tutorial",
    short: "Code-First",
    desc: "Hands-on and runnable from the first section — the how, in working code.",
  },
  {
    id: "comparison",
    label: "Stack Comparison",
    short: "Comparison",
    desc: "Head-to-head pros and cons against an alternative stack, ending in a clear recommendation.",
  },
];

export const MODE_META: Record<Mode, ModeMeta> = Object.fromEntries(
  MODES.map((m) => [m.id, m])
) as Record<Mode, ModeMeta>;

export type Status = "idle" | "loading" | "streaming" | "done" | "error";

export interface MasterclassRequest {
  framework: string;
  mode: Mode;
  query: string;
  /** second stack key, sent in comparison mode — the query then only needs the use case */
  compare_to?: string;
}

export const FRAMEWORKS: Framework[] = [
  { id: "nextjs", label: "Next.js (App Router)", sub: "v15", color: "#F2F2F4" },
  { id: "fastapi", label: "FastAPI", sub: "0.115", color: "#2DD4BF" },
  { id: "neon", label: "Neon Postgres", sub: "pg17", color: "#00E599" },
  { id: "react-vite", label: "React + Vite", sub: "v19/v6", color: "#61DAFB" },
  { id: "express", label: "Node.js + Express", sub: "v5", color: "#8CC84B" },
  { id: "django", label: "Django", sub: "5.2", color: "#44B78B" },
  { id: "fastapi-vite", label: "FastAPI + Vite", sub: "combo", color: "#818CF8" },
  { id: "nextjs-fullstack", label: "Next.js + Node.js", sub: "combo", color: "#F59E0B" },
];
