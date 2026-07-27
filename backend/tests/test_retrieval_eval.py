"""Retrieval precision evals.

Scores `db.get_relevant_docs` against the golden set in
`tests/datasets/retrieval.py`: for each labelled learning goal, how much of the
top-k it gets right (precision), whether it finds every labelled chunk
(recall), and how high the first correct one lands (MRR).
"""

from __future__ import annotations

import pytest

import db
from tests.datasets.retrieval import RETRIEVAL_CASES, RetrievalCase
from tests.fakes import doc_key
from tests.metrics import (
    EvalReport,
    mean,
    precision_at_k,
    r_precision,
    recall_at_k,
    reciprocal_rank,
)

pytestmark = pytest.mark.retrieval

K = 3

# Floors for the offline tf-idf retriever. It is deliberately weaker than
# gemini-embedding-001, so these sit below the live floors; both are set just
# under the measured baseline, low enough not to flake and high enough that a
# real ranking regression trips them.
OFFLINE_FLOORS = {"precision@1": 0.90, "r-precision": 0.85, "recall@3": 0.90, "mrr": 0.90}
LIVE_FLOORS = {"precision@1": 0.90, "r-precision": 0.85, "recall@3": 0.90, "mrr": 0.92}


def _score(cases: tuple[RetrievalCase, ...], call=None) -> tuple[dict[str, float], list[str]]:
    run = call or (lambda fn, *args, **kwargs: fn(*args, **kwargs))
    p1, rprec, r3, rr = [], [], [], []
    misses: list[str] = []
    for case in cases:
        # Enough rows to compute R-precision for the multi-label cases too.
        limit = max(K, len(case.relevant))
        rows = run(db.get_relevant_docs, case.db_scope, case.query, limit=limit)
        ranked = [doc_key(row) for row in rows]
        p1.append(precision_at_k(ranked, case.relevant, 1))
        rprec.append(r_precision(ranked, case.relevant))
        r3.append(recall_at_k(ranked, case.relevant, K))
        rr.append(reciprocal_rank(ranked, case.relevant))
        if rr[-1] < 1.0:
            misses.append(f"{case.query[:48]!r} -> {ranked[:1]}")
    scores = {
        "precision@1": mean(p1),
        "r-precision": mean(rprec),
        "recall@3": mean(r3),
        "mrr": mean(rr),
    }
    return scores, misses


def _assert_floors(
    scores: dict[str, float],
    floors: dict[str, float],
    misses: list[str],
    report: EvalReport,
    tier: str,
) -> None:
    note = f"{len(RETRIEVAL_CASES)} goals, k={K}"
    for metric, floor in floors.items():
        report.check("retrieval", f"{metric} ({tier})", scores[metric], floor, note)
    failed = {m: scores[m] for m, floor in floors.items() if scores[m] < floor}
    assert not failed, (
        f"retrieval below floor ({tier}): "
        + ", ".join(f"{m}={v:.3f} < {floors[m]:.2f}" for m, v in failed.items())
        + "\nrank-1 misses:\n  "
        + "\n  ".join(misses)
    )


def test_retrieval_precision_offline(offline_store, report: EvalReport) -> None:
    scores, misses = _score(RETRIEVAL_CASES)
    _assert_floors(scores, OFFLINE_FLOORS, misses, report, "offline")


@pytest.mark.live
def test_retrieval_precision_live(live_env, live_call, report: EvalReport) -> None:
    # Embeddings sit in a different, far roomier quota bucket than the judge
    # models, so these run unpaced — but still skip cleanly if quota runs out.
    def unpaced(fn, *args, **kwargs):
        return live_call(fn, *args, pace=False, **kwargs)

    scores, misses = _score(RETRIEVAL_CASES, call=unpaced)
    _assert_floors(scores, LIVE_FLOORS, misses, report, "live")


# ------------------------------------------------- retrieval contract checks

def test_single_stack_scope_filters_to_that_stack(offline_store) -> None:
    rows = db.get_relevant_docs("neon", "connection pooling", limit=4)
    assert rows, "expected rows for the neon scope"
    assert {row["framework_name"] for row in rows} == {"neon"}


def test_list_scope_covers_exactly_the_listed_stacks(offline_store) -> None:
    rows = db.get_relevant_docs(
        ["fastapi", "react-vite"], "development server and API wiring", limit=8
    )
    assert {row["framework_name"] for row in rows} <= {"fastapi", "react-vite"}
    assert {row["framework_name"] for row in rows} == {"fastapi", "react-vite"}, (
        "a comparison-mode scope must be able to surface both sides"
    )


def test_null_scope_searches_every_stack(offline_store, corpus) -> None:
    rows = db.get_relevant_docs(None, "deployment", limit=len(corpus))
    assert len(rows) == len(corpus)


def test_rows_are_ordered_by_ascending_distance(offline_store) -> None:
    rows = db.get_relevant_docs(None, "streaming responses to the browser", limit=6)
    distances = [row["distance"] for row in rows]
    assert distances == sorted(distances)
    assert all(0.0 <= d <= 2.0 for d in distances), "cosine distance must stay in [0, 2]"


def test_limit_is_respected(offline_store) -> None:
    assert len(db.get_relevant_docs(None, "migrations", limit=2)) == 2


def test_rows_carry_every_field_the_agent_reads(offline_store) -> None:
    row = db.get_relevant_docs("django", "queryset lookups", limit=1)[0]
    assert set(row) >= {
        "id",
        "framework_name",
        "section_title",
        "doc_url",
        "raw_content",
        "distance",
    }
