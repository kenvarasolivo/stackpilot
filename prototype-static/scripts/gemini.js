/* ============================================================
   StackPilot — live generation via the Gemini API (free tier)

   Model chain (verified against ai.google.dev/gemini-api/docs/models,
   July 2026): gemini-3.5-flash is the newest stable Flash model with
   a free tier. If Google retires/renames an id (404), we fall back
   down the chain automatically.
   ============================================================ */

const GEMINI_MODELS = ["gemini-3.5-flash", "gemini-3.1-flash-lite", "gemini-2.5-flash"];
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

function buildPrompt({ stack, mode, goal }) {
  return `You are StackPilot, an AI documentation masterclass engine that answers
from retrieved documentation (RAG) and cites its sources.

Stack: ${stack}
Mode: ${mode === "code-first" ? "Code-First Tutorial (code-heavy, terse prose)" : "Architectural Deep-Dive (concept-heavy, explains tradeoffs)"}
Learning goal: ${goal || "Explain how to set up multi-tenant row-level security using Neon pgvector and Next.js."}

Produce a masterclass as STRICT JSON matching exactly this shape (no markdown fences, no extra keys):

{
  "meta": { "title": string, "subtitle": string },
  "sources": [
    { "id": 1, "title": string, "tag": "MD"|"SQL"|"TS"|"API",
      "origin": string (a plausible docs URL path),
      "snippet": string (~2 lines of the doc that matches the answer),
      "doc": string (a 200-400 word plausible markdown excerpt of that doc) }
    // 3 to 5 sources, ids sequential from 1
  ],
  "blocks": [
    // 10-16 blocks mixing these types, in reading order:
    { "type": "h2", "text": string },
    { "type": "h3", "text": string },
    { "type": "p", "text": string },      // may embed citations as [[1]], inline code as \`x\`, bold as **x**
    { "type": "list", "ordered": boolean, "items": [string] },
    { "type": "code", "lang": "sql"|"ts"|"js"|"bash", "label": string (filename), "code": string },
    { "type": "callout", "title": string (e.g. "Architecture Note · <concept>"), "text": string }
  ]
}

Every source id MUST be cited at least once in the blocks via [[id]].
Include at least 2 code blocks and at least 1 callout.`;
}

/** Returns the first balanced top-level {...} in text (string-aware),
    for responses that append junk after the JSON payload. */
function extractFirstJsonObject(text) {
  const start = text.indexOf("{");
  if (start === -1) throw new Error("No JSON object in Gemini response");
  let depth = 0, inStr = false, esc = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (esc) { esc = false; continue; }
    if (inStr) {
      if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  throw new Error("Truncated JSON in Gemini response");
}

async function callGeminiModel(model, apiKey, opts) {
  const res = await fetch(`${GEMINI_API_BASE}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: buildPrompt(opts) }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
        maxOutputTokens: 8192,
      },
    }),
  });

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const err = await res.json();
      if (err?.error?.message) detail = err.error.message.slice(0, 160);
    } catch (_) { /* keep status text */ }
    const error = new Error(detail);
    error.status = res.status;
    throw error;
  }

  const json = await res.json();
  // Long outputs can span multiple parts; thinking models may prepend
  // "thought" parts — join the real text parts only.
  const parts = json?.candidates?.[0]?.content?.parts || [];
  const text = parts
    .filter((p) => typeof p.text === "string" && !p.thought)
    .map((p) => p.text)
    .join("");
  if (!text) throw new Error("Gemini returned an empty response");

  let data;
  try {
    data = JSON.parse(text);
  } catch (_) {
    // Some responses carry trailing junk after the JSON object —
    // parse the first balanced object instead.
    data = JSON.parse(extractFirstJsonObject(text));
  }
  if (!Array.isArray(data.blocks) || !Array.isArray(data.sources) || !data.sources.length) {
    throw new Error("Gemini returned an unexpected shape");
  }
  data.meta = data.meta || { title: "Generated Masterclass", subtitle: "" };
  return data;
}

/** Tries each model in GEMINI_MODELS. Falls through to the next model on
    404 (retired model id), 429 (per-model rate limit), and 500/503
    (overload — free-tier models frequently report "high demand").
    Hard errors like 400/403 (bad key) are thrown immediately.
    Resolves to { data, model }. */
const FALLTHROUGH_STATUSES = new Set([404, 429, 500, 503]);

async function generateWithGemini(apiKey, opts) {
  let lastErr;
  for (const model of GEMINI_MODELS) {
    try {
      const data = await callGeminiModel(model, apiKey, opts);
      return { data, model };
    } catch (err) {
      if (FALLTHROUGH_STATUSES.has(err.status)) { lastErr = err; continue; }
      throw err;
    }
  }
  throw lastErr || new Error("No Gemini model available");
}
