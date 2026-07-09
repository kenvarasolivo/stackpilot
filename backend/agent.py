"""StackPilot agentic RAG orchestrator.

Pipeline (each stage streamed to the UI as an `agent` event):

  plan     -> decompose the learning goal into up to 3 targeted search queries
  retrieve -> multi-query pgvector search on Neon, deduped by row id
  grade    -> LLM grades chunk relevance; drops junk; on a coverage gap it
              refines the query and retrieves again (bounded self-correction)
  write    -> gemini-2.5-flash streams the tutorial from the graded context
  verify   -> LLM checks every [n] citation against its source chunk

Design notes:
- plan / grade / verify run on gemini-2.5-flash-lite (fast, cheap, separate
  free-tier rate bucket from the writer model).
- Every agent stage degrades gracefully: if its model call fails, the
  pipeline falls back to the naive RAG path instead of failing the request.
"""

import re
from typing import Iterator

import db
import gemini_service

MAX_SOURCES = 5
RETRIEVE_PER_QUERY = 3


def _why(exc: Exception) -> str:
    """Short human-readable failure reason for the agent trace."""
    msg = str(exc)
    if "429" in msg or "RESOURCE_EXHAUSTED" in msg:
        return "rate limited"
    if "503" in msg or "UNAVAILABLE" in msg or "overloaded" in msg.lower():
        return "model overloaded"
    return (msg[:60] + "…") if len(msg) > 60 else (msg or type(exc).__name__)


def _agent(stage: str, status: str, detail: str = "", data: dict | None = None) -> dict:
    evt: dict = {"type": "agent", "stage": stage, "status": status}
    if detail:
        evt["detail"] = detail
    if data:
        evt["data"] = data
    return evt


# ---------------------------------------------------------------- plan

def _plan_queries(query: str, framework: str) -> list[str]:
    plan = gemini_service.generate_json(
        f"""You are the retrieval planner of an agentic RAG system for developer
documentation about "{framework}".

Learning goal: {query}

Decompose the goal into 1-3 short, focused documentation search queries that
together cover it. Queries must be phrased like doc section topics (e.g.
"connection pooling transaction mode"), not questions.

Return STRICT JSON: {{"search_queries": ["...", "..."]}}"""
    )
    queries = [
        q.strip()
        for q in plan.get("search_queries", [])
        if isinstance(q, str) and q.strip()
    ]
    return queries[:3]


# ---------------------------------------------------------------- grade

def _grade_chunks(query: str, docs: list[dict]) -> dict:
    listing = "\n\n".join(
        f"chunk_id={d['id']} title=\"{d['section_title']}\"\n{d['raw_content'][:450]}"
        for d in docs
    )
    return gemini_service.generate_json(
        f"""You are the retrieval grader of an agentic RAG system.

Learning goal: {query}

Retrieved documentation chunks:
{listing}

Score each chunk's relevance to the goal: 2 = directly relevant,
1 = partially useful background, 0 = irrelevant. Then decide whether an important
aspect of the goal is NOT covered by the relevant chunks; if so, propose ONE
refined documentation search query for it, else null.

Return STRICT JSON:
{{"scores": [{{"id": <chunk_id>, "score": 0|1|2}}],
  "refined_query": "..." | null}}"""
    )


# ---------------------------------------------------------------- verify

def _verify_citations(text: str, sources: list[dict]) -> list[dict]:
    used_ids = sorted({int(n) for n in re.findall(r"\[(\d{1,2})\]", text)})
    valid = {s["id"] for s in sources}
    used_ids = [i for i in used_ids if i in valid]
    if not used_ids:
        return []

    listing = "\n\n".join(
        f"[{s['id']}] \"{s['section_title']}\"\n{s['raw_content'][:700]}"
        for s in sources
        if s["id"] in used_ids
    )
    result = gemini_service.generate_json(
        f"""You are the citation verifier of an agentic RAG system. The tutorial
below cites sources with markers like [1]. For each cited source id, judge
whether the claims made near its markers are actually supported by that
source's text.

Verdicts: "supported" (claims match the source), "partial" (loosely related /
extrapolated), "unsupported" (source does not back the claims).

## Sources
{listing}

## Tutorial (truncated)
{text[:6000]}

Return STRICT JSON:
{{"citations": [{{"id": <source id>, "verdict": "supported"|"partial"|"unsupported", "note": "<max 12 words>"}}]}}"""
    )
    out = []
    for c in result.get("citations", []):
        try:
            cid = int(c["id"])
        except (KeyError, TypeError, ValueError):
            continue
        if cid in valid and c.get("verdict") in ("supported", "partial", "unsupported"):
            out.append({"id": cid, "verdict": c["verdict"], "note": str(c.get("note", ""))[:120]})
    return out


# ---------------------------------------------------------------- orchestrator

def run_masterclass_agent(framework: str, mode: str, query: str) -> Iterator[dict]:
    # ---- plan ----
    yield _agent("plan", "start")
    try:
        queries = _plan_queries(query, framework) or [query]
        plan_detail = f"{len(queries)} search quer{'y' if len(queries) == 1 else 'ies'}"
    except Exception as exc:
        queries = [query]
        plan_detail = f"planner unavailable ({_why(exc)}) — using raw goal"
    yield _agent("plan", "done", plan_detail, {"queries": queries})

    # ---- retrieve ----
    yield _agent("retrieve", "start")
    by_id: dict[int, dict] = {}
    for q in queries:
        for row in db.get_relevant_docs(framework, q, limit=RETRIEVE_PER_QUERY):
            prev = by_id.get(row["id"])
            if prev is None or row["distance"] < prev["distance"]:
                by_id[row["id"]] = row
    docs = sorted(by_id.values(), key=lambda r: r["distance"])
    if not docs:
        yield {
            "type": "error",
            "message": (
                f"No documentation rows found for framework '{framework}'. "
                "Run `python seed.py` in /backend to create and populate the framework_docs table."
            ),
        }
        return
    yield _agent("retrieve", "done", f"{len(docs)} unique chunks from Neon")

    # ---- grade (with one bounded self-correction loop) ----
    yield _agent("grade", "start")
    kept = docs
    grade_detail = "grader unavailable — kept all chunks"
    try:
        grade = _grade_chunks(query, docs)
        scores = {}
        for s in grade.get("scores", []):
            try:
                scores[int(s["id"])] = int(s["score"])
            except (KeyError, TypeError, ValueError):
                continue
        kept = [d for d in docs if scores.get(d["id"], 1) > 0] or docs
        grade_detail = f"kept {len(kept)}/{len(docs)} chunks"

        refined = grade.get("refined_query")
        if isinstance(refined, str) and refined.strip() and len(kept) < MAX_SOURCES:
            extra = db.get_relevant_docs(framework, refined.strip(), limit=2)
            known = {d["id"] for d in kept}
            added = [row for row in extra if row["id"] not in known]
            if added:
                kept = sorted(kept + added, key=lambda r: r["distance"])
                grade_detail += f' · re-queried gap: "{refined.strip()[:60]}" (+{len(added)})'
    except Exception as exc:
        grade_detail = f"grader unavailable ({_why(exc)}) — kept all chunks"
    kept = kept[:MAX_SOURCES]
    yield _agent("grade", "done", grade_detail)

    # ---- sources out (renumbered 1..n for citations) ----
    sources = [
        {
            "id": i + 1,
            "section_title": d["section_title"],
            "doc_url": d["doc_url"],
            "raw_content": d["raw_content"],
            "relevance": max(0.0, min(1.0, 1.0 - float(d["distance"]))),
        }
        for i, d in enumerate(kept)
    ]
    yield {"type": "sources", "sources": sources}

    # ---- write ----
    yield _agent("write", "start")
    parts: list[str] = []
    for chunk in gemini_service.stream_masterclass(query, framework, mode, kept):
        parts.append(chunk)
        yield {"type": "delta", "text": chunk}
    text = "".join(parts)
    yield _agent("write", "done", f"{len(text):,} chars streamed")

    # ---- verify ----
    yield _agent("verify", "start")
    try:
        citations = _verify_citations(text, sources)
        if citations:
            yield {"type": "verification", "citations": citations}
            supported = sum(1 for c in citations if c["verdict"] == "supported")
            yield _agent("verify", "done", f"{supported}/{len(citations)} citations fully supported")
        else:
            yield _agent("verify", "done", "no citations found to verify")
    except Exception as exc:
        yield _agent("verify", "done", f"verifier unavailable ({_why(exc)}) — skipped")

    yield {"type": "done"}
