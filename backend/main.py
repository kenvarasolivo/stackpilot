"""StackPilot API — FastAPI app wiring Neon RAG retrieval to Gemini generation.

Run from /backend:  uvicorn main:app --reload --port 8000
"""

import json
from pathlib import Path

from dotenv import load_dotenv

# Workspace-root .env holds GEMINI_API_KEY and DATABASE_URL (see README).
load_dotenv(Path(__file__).resolve().parent.parent / ".env")
load_dotenv()  # also honor backend/.env if someone prefers a local one

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

import agent
import gemini_service
from schemas import MasterclassRequest

app = FastAPI(title="StackPilot API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"ok": True, "model": gemini_service.GENERATION_MODEL}


@app.post("/api/masterclass")
def masterclass(req: MasterclassRequest) -> StreamingResponse:
    """NDJSON stream of agent pipeline events:
    `agent` (stage start/done) · `sources` (graded Neon retrieval) ·
    `delta` (streamed markdown) · `verification` (citation audit) ·
    terminated by `done` or an in-band `error`."""

    def ndjson():
        try:
            for event in agent.run_masterclass_agent(req.framework, req.mode, req.query):
                yield json.dumps(event) + "\n"
        except Exception as exc:  # surfaced verbatim in the UI's error card
            yield json.dumps({"type": "error", "message": str(exc)}) + "\n"

    return StreamingResponse(ndjson(), media_type="application/x-ndjson")
