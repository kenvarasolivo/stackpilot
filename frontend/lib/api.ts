import type { AgentStage, AgentStageState, CitationCheck, MasterclassRequest, SourceDoc } from "./types";

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface StreamHandlers {
  onSources: (sources: SourceDoc[]) => void;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
  onAgent?: (stage: AgentStage, state: AgentStageState) => void;
  onVerification?: (citations: CitationCheck[]) => void;
}

/**
 * POSTs to the FastAPI /api/masterclass endpoint and consumes its NDJSON
 * stream: one `sources` line (Neon retrieval metadata), then `delta` lines
 * as Gemini streams markdown, terminated by `done` or an in-band `error`.
 */
export async function streamMasterclass(req: MasterclassRequest, h: StreamHandlers): Promise<void> {
  let res: Response;
  try {
    res = await fetch(`${API_URL}/api/masterclass`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
  } catch {
    h.onError(`Could not reach the backend at ${API_URL}. Is FastAPI running? (uvicorn main:app --reload --port 8000 in /backend)`);
    return;
  }

  if (!res.ok || !res.body) {
    h.onError(`Backend returned HTTP ${res.status}.`);
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      let nl: number;
      while ((nl = buffer.indexOf("\n")) !== -1) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;

        const evt = JSON.parse(line);
        switch (evt.type) {
          case "agent":
            h.onAgent?.(evt.stage as AgentStage, {
              status: evt.status === "start" ? "running" : "done",
              detail: evt.detail,
              data: evt.data,
            });
            break;
          case "sources":
            h.onSources(evt.sources as SourceDoc[]);
            break;
          case "delta":
            h.onDelta(evt.text as string);
            break;
          case "verification":
            h.onVerification?.(evt.citations as CitationCheck[]);
            break;
          case "done":
            h.onDone();
            return;
          case "error":
            h.onError(evt.message as string);
            return;
        }
      }
    }
    // Stream ended without an explicit done/error line.
    h.onDone();
  } catch (err) {
    h.onError(err instanceof Error ? err.message : "Stream parsing failed.");
  }
}
