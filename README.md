# StackPilot ⚡

A minimalist, developer-focused **AI Documentation & Framework Masterclass** dashboard.

Full stack: **Next.js (App Router) + Tailwind** frontend · **FastAPI** backend ·
**Neon Serverless Postgres** (pgvector RAG retrieval) · **Google Gemini** (embeddings + streamed generation).

```
frontend/  Next.js 15 + TypeScript + Tailwind — three-panel dark dashboard (localhost:3000)
backend/   FastAPI + psycopg + google-genai — RAG + streaming API (localhost:8000)
.env       GEMINI_API_KEY + DATABASE_URL (workspace root, git-ignored)
```

## 1. Configure `.env`

Copy [.env.example](.env.example) to `.env` in the **workspace root** and fill in both values:

```ini
# https://aistudio.google.com/apikey  (free tier works)
GEMINI_API_KEY=AIza...

# https://console.neon.tech -> your project -> Connect (direct connection string)
DATABASE_URL=postgresql://USER:PASSWORD@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
```

Both servers read this one file — no per-directory env files needed.

## 2. Install

**Backend** (Python 3.11+):

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1     # macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
```

**Frontend** (Node 18.18+):

```powershell
cd frontend
npm install
```

## 3. Seed the Neon database (once)

Creates the `pgvector` extension, the `framework_docs` table (768-dim embeddings,
HNSW cosine index) and inserts 12 curated documentation chunks, embedding each
one with Gemini:

```powershell
cd backend
python seed.py
```

Re-running is safe — it drops and rebuilds the table.

## 4. Run both servers

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

Then open **http://localhost:3000**. The footer of the left panel shows a live
FastAPI connectivity indicator; interactive API docs are at http://localhost:8000/docs.

## How a request flows

1. **Generate Masterclass Path** POSTs `{framework, mode, query}` to `http://localhost:8000/api/masterclass`.
2. FastAPI embeds the query with `gemini-embedding-001` and runs a cosine
   similarity search (`embedding <=> query ORDER BY … LIMIT 4`) against
   `framework_docs` on Neon, filtered by framework.
3. The endpoint streams NDJSON: first a `sources` line with the retrieved rows,
   then `delta` lines as **gemini-2.5-flash** streams the markdown tutorial,
   then `done` (errors arrive in-band as an `error` line).
4. The middle panel renders the markdown live (code blocks with copy buttons,
   clickable `[n]` citations); the right panel shows the Neon source cards —
   clicking a citation flashes the matching card, and **View Full Docs** opens
   the raw retrieved context in an overlay.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Left-panel footer says "API offline" | Start the backend: `uvicorn main:app --reload --port 8000` in `/backend` |
| Error card: `DATABASE_URL is not set` | Fill `.env` in the workspace root, restart uvicorn |
| Error card: `No documentation rows found` | Run `python seed.py` in `/backend` |
| Gemini 429/503 errors | Free-tier rate limit / load spike — retry after ~60s |
| Frontend can't fetch (CORS) | Backend allows `localhost:3000`; if you changed the port, update `main.py` CORS origins |

`prototype-static/` contains the earlier zero-build static prototype; it is not
part of the running system.
