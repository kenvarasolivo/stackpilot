# StackPilot ⚡

An agentic AI documentation masterclass dashboard for developers: pick a framework (Next.js, FastAPI, or Neon), describe what you want to learn, and StackPilot plans, retrieves, grades, and streams a fully cited tutorial built from real documentation.

---

## 🚀 Features

*   **Agentic RAG Pipeline:** A five-stage, self-correcting agent — `plan → retrieve → grade → write → verify` — decomposes your learning goal into targeted searches, drops irrelevant chunks, refines queries on coverage gaps (CRAG-style), and audits every citation against its source.
*   **Live Streaming Workspace:** Agent stage progress, graded source cards, and the markdown tutorial all stream to the browser in real time over NDJSON — code blocks with copy buttons, clickable `[n]` citations that flash the matching source card.
*   **Verified Citations:** Every citation gets a `supported` / `partial` / `unsupported` verdict badge, so you can trust what the tutorial claims.
*   **Two Learning Modes:** *Deep-dive* for conceptual depth or *code-first* for example-driven tutorials.
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
