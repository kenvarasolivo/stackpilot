# StackPilot ⚡

[![Evals](https://github.com/kenvarasolivo/stackpilot-workspace/actions/workflows/evals.yml/badge.svg)](https://github.com/kenvarasolivo/stackpilot-workspace/actions/workflows/evals.yml)

An agentic AI documentation masterclass dashboard for developers: pick a stack (Next.js, FastAPI, Neon, React + Vite, Node.js + Express, Django — or a combo like FastAPI + Vite or Next.js + Node.js), describe what you want to learn, and StackPilot plans, retrieves, grades, and streams a fully cited tutorial built from real documentation.

---

## 🚀 Features

*   **Agentic RAG Pipeline:** A five-stage, self-correcting agent — `plan → retrieve → grade → write → verify` — decomposes your learning goal into targeted searches, drops irrelevant chunks, refines queries on coverage gaps (CRAG-style), and audits every citation against its source.
*   **Live Streaming Workspace:** Agent stage progress, graded source cards, and the markdown tutorial all stream to the browser in real time over NDJSON — code blocks with copy buttons, clickable `[n]` citations that flash the matching source card.
*   **Verified Citations:** Every citation gets a `supported` / `partial` / `unsupported` verdict badge, so you can trust what the tutorial claims.
*   **Three Learning Modes:** *Deep-dive* for conceptual depth, *code-first* for example-driven tutorials, or *comparison* for a head-to-head pros/cons verdict between stacks (e.g. FastAPI + Vite vs Next.js + Node.js) — comparison mode searches every stack's docs so both sides are backed by sources.
*   **Graceful Degradation:** If any agent stage's model call fails (rate limit, overload), the pipeline falls back to the naive RAG path instead of failing the request — the trace shows why.

---

## 🛠️ Tech Stack

*   **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS
*   **Backend:** FastAPI, psycopg, `google-genai` — Gemini 2.5 Flash (writer), Flash-Lite (planner/grader/verifier), `gemini-embedding-001` (768-dim embeddings)
*   **Database:** Neon Serverless Postgres with pgvector + HNSW cosine index
*   **Deployment:** Vercel (frontend) + Render (backend)

---

## ⚙️ Local Development

Follow these steps to get a local development server running on your machine.

### Prerequisites

Make sure you have Node.js 18.18+ and Python 3.11+ installed.

```bash
node -v
npm -v
python --version
```

You will also need:

*   A **Gemini API key** (free tier works): https://aistudio.google.com/apikey
*   A **Neon** connection string: https://console.neon.tech → your project → Connect

### 1. Configure `.env`

Copy [.env.example](.env.example) to `.env` in the **workspace root** and fill in both values:

```ini
GEMINI_API_KEY=AIza...
DATABASE_URL=postgresql://USER:PASSWORD@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
```

Both servers read this one file — no per-directory env files needed.

### 2. Install dependencies

**Backend:**

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1     # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
```

**Frontend:**

```powershell
cd frontend
npm install
```

### 3. Seed the Neon database (once)

Creates the `pgvector` extension, the `framework_docs` table, and inserts curated documentation chunks, embedding each one with Gemini. Re-running is safe — it drops and rebuilds the table.

```powershell
cd backend
python seed.py
```

### 4. Run both servers

**Option A — one command (opens two terminal windows):**

```powershell
.\dev.ps1
```

**Option B — manually, in two terminals:**

```powershell
# Terminal 1
cd backend
.\.venv\Scripts\Activate.ps1
uvicorn main:app --reload --port 8000

# Terminal 2
cd frontend
npm run dev
```

Then open **http://localhost:3000**. The left-panel footer shows a live FastAPI connectivity indicator; interactive API docs are at http://localhost:8000/docs.

---

## 🧠 How the Agentic Pipeline Works

`POST /api/masterclass` runs a five-stage agent ([backend/agent.py](backend/agent.py)); every stage streams to the UI as an NDJSON `agent` event:

```
plan ──▶ retrieve ──▶ grade ──▶ write ──▶ verify
```

1. **Plan** (`gemini-2.5-flash-lite`) — decomposes the learning goal into up to 3 targeted documentation search queries.
2. **Retrieve** — each query is embedded and run as a pgvector cosine search against `framework_docs` on Neon; results are deduped and ranked by distance.
3. **Grade** (`flash-lite`) — an LLM scores each chunk's relevance, drops junk, and retrieves again with a refined query if it detects a coverage gap.
4. **Write** (`gemini-2.5-flash`) — streams the markdown tutorial from the graded context with inline `[n]` citations.
5. **Verify** (`flash-lite`) — audits every citation against its source chunk and emits per-source verdicts.

---

## 🧪 Eval Harness

A RAG pipeline can stay green on unit tests while quietly getting worse at its actual job, so the quality of each agent stage is measured, not assumed. [backend/tests/](backend/tests/) is a Pytest harness that scores retrieval, grading and citation verification against labelled golden sets and fails the build when a metric drops below its floor. Every run also writes `eval-report.md` / `eval-report.json`.

| Suite | What it measures | Golden set |
|---|---|---|
| **Retrieval** | precision@1, R-precision, recall@3, MRR of the pgvector search | 24 learning goals labelled with the chunks that should come back ([datasets/retrieval.py](backend/tests/datasets/retrieval.py)) |
| **Grading** | precision / recall / F1 / accuracy of the keep-vs-drop decision | 6 goals × mixed relevant and off-topic candidates ([datasets/grading.py](backend/tests/datasets/grading.py)) |
| **Citations** | three-way verdict agreement, plus how reliably an unsupported claim is flagged | 6 tutorial fragments with grounded, extrapolated and invented claims ([datasets/citations.py](backend/tests/datasets/citations.py)) |
| **Pipeline** | the NDJSON event contract the frontend consumes, and every graceful-degradation path | scripted plan/grade/verify failures ([test_pipeline_eval.py](backend/tests/test_pipeline_eval.py)) |
| **Harness** | that the offline tier really is credential-free and network-free | [test_harness.py](backend/tests/test_harness.py) |

The harness runs in two tiers over the same datasets:

*   **Offline (default, runs in CI).** Gemini and Neon are replaced by deterministic stand-ins — a tf-idf embedder over the seed corpus and an in-memory vector store ([tests/fakes.py](backend/tests/fakes.py)). No API key, no database, no network, same numbers on every machine, **zero API spend**. That last property is enforced, not assumed: an autouse guard fails any outbound connection from a test not marked `live`, so a stub that stops covering some call path breaks the build instead of quietly billing a CI runner. This tier gates retrieval ranking, the datasets themselves, and all of the agent's parsing and failure handling.
*   **Live (`pytest -m live`).** The same golden sets scored against real `gemini-embedding-001` retrieval from Neon and the real flash-lite grader and verifier — the tier that measures the models. It is skipped automatically when `GEMINI_API_KEY` / `DATABASE_URL` are absent, which is why CI never runs it.

> **Live tier budget.** The Gemini free tier caps `gemini-2.5-flash-lite` at **10 requests/minute and 20 requests/day**. A full live run spends 12 judge calls (6 grading + 6 citations), so it is roughly one run per day. Calls are paced for the per-minute limit, and hitting either wall skips rather than fails — with a message naming the quota, because the API's own "retry in 12s" hint is wrong for the daily cap. To spend less, cap the cases per suite:
>
> ```powershell
> $env:EVAL_LIVE_CASES=3; pytest -m live      # 3 calls per suite instead of 6
> ```

```powershell
cd backend
.\.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt

pytest                                  # offline tier (the default — never spends API quota)
pytest -m live                          # live tier, against real Gemini + Neon
pytest -m "retrieval and not live"      # one suite: retrieval | grading | citations | pipeline
```

[.github/workflows/evals.yml](.github/workflows/evals.yml) runs the offline tier on every push and pull request across Python 3.11 and 3.12, publishes the metrics table to the job summary, and uploads the report as a build artifact.

---

## 🌐 Deployment

*   **Frontend → Vercel:** deploy `frontend/` and set `NEXT_PUBLIC_API_URL` to your backend's public URL.
*   **Backend → Render:** deploy `backend/` with `GEMINI_API_KEY`, `DATABASE_URL`, and `ALLOWED_ORIGINS` (comma-separated, e.g. `https://your-app.vercel.app`) set as environment variables.

---

## 🔧 Troubleshooting

| Symptom | Fix |
|---|---|
| Left-panel footer says "API offline" | Start the backend: `uvicorn main:app --reload --port 8000` in `/backend` |
| Error card: `DATABASE_URL is not set` | Fill `.env` in the workspace root, restart uvicorn |
| Error card: `No documentation rows found` | Run `python seed.py` in `/backend` |
| Gemini 429/503 errors | Free-tier rate limit / load spike — retry after ~60s |
| Frontend can't fetch (CORS) | Backend allows `localhost:3000` by default; add other origins via `ALLOWED_ORIGINS` |

`prototype-static/` contains the earlier zero-build static prototype; it is not part of the running system.
