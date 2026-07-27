"""Offline stand-ins for the two LLM judges in the pipeline.

These are lexical approximations of `agent._grade_chunks` and
`agent._verify_citations`, and they exist so the offline tier can score the
golden grading/citation sets without an API key. They are NOT a measurement of
Gemini's judgement — they are a regression guard on the datasets, the metric
plumbing, and the response shapes the agent has to consume. The same datasets
are scored against the real models by the `live` tier.
"""

from __future__ import annotations

import re

from tests.fakes import LexicalEmbedder

SENTENCE_SPLIT_RE = re.compile(r"(?<=[.!?])\s+|\n{2,}")
MARKER_RE = re.compile(r"\[(\d{1,2})\]")

# Cosine-similarity bands for the stand-in grader (fitted on the golden set;
# a tf-idf retriever separates on-topic from off-topic chunks around here).
GRADE_DIRECT = 0.20
GRADE_BACKGROUND = 0.10

# idf-coverage bands for the stand-in verifier.
VERDICT_SUPPORTED = 0.62
VERDICT_PARTIAL = 0.42


def heuristic_relevance_scores(
    goal: str, docs: list[dict], embedder: LexicalEmbedder
) -> dict[int, int]:
    """Score each chunk 0/1/2 against the goal, mirroring the grader's contract."""
    goal_vector = embedder.embed(goal)
    scores: dict[int, int] = {}
    for doc in docs:
        text = f"{doc['section_title']}\n\n{doc['raw_content']}"
        similarity = 1.0 - embedder.cosine_distance(goal_vector, embedder.embed(text))
        if similarity >= GRADE_DIRECT:
            scores[doc["id"]] = 2
        elif similarity >= GRADE_BACKGROUND:
            scores[doc["id"]] = 1
        else:
            scores[doc["id"]] = 0
    return scores


def claims_near_markers(text: str, citation_id: int) -> str:
    """The sentences carrying `[citation_id]`, with all markers stripped."""
    sentences = [s for s in SENTENCE_SPLIT_RE.split(text) if s.strip()]
    hits = [s for s in sentences if citation_id in (int(n) for n in MARKER_RE.findall(s))]
    return MARKER_RE.sub("", " ".join(hits)).strip()


def heuristic_verdicts(
    text: str, sources: list[dict], embedder: LexicalEmbedder
) -> list[dict]:
    """Judge every cited source, returning the verifier's response shape."""
    by_id = {s["id"]: s for s in sources}
    cited = sorted({int(n) for n in MARKER_RE.findall(text)})
    verdicts = []
    for citation_id in cited:
        source = by_id.get(citation_id)
        if source is None:
            continue  # marker points at a source that was never sent
        claim = claims_near_markers(text, citation_id)
        coverage = embedder.support_score(claim, source["raw_content"])
        if coverage >= VERDICT_SUPPORTED:
            verdict = "supported"
        elif coverage >= VERDICT_PARTIAL:
            verdict = "partial"
        else:
            verdict = "unsupported"
        verdicts.append(
            {"id": citation_id, "verdict": verdict, "note": f"idf coverage {coverage:.2f}"}
        )
    return verdicts
