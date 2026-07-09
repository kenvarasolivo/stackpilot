export interface SourceDoc {
  id: number;
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

export type Mode = "deep-dive" | "code-first";

export type Status = "idle" | "loading" | "streaming" | "done" | "error";

export interface MasterclassRequest {
  framework: string;
  mode: Mode;
  query: string;
}

export const FRAMEWORKS: Framework[] = [
  { id: "nextjs", label: "Next.js (App Router)", sub: "v15", color: "#E6EDF3" },
  { id: "fastapi", label: "FastAPI", sub: "0.115", color: "#2DD4BF" },
  { id: "neon", label: "Neon Postgres", sub: "pg17", color: "#00FFFF" },
];
