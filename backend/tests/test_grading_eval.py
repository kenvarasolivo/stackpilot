"""Relevance-grading evals.

The grade stage decides which retrieved chunks survive into the writer's
context, so its failure modes are asymmetric: dropping a needed chunk silently
removes evidence from the tutorial, while keeping junk dilutes it. This module
scores the keep/drop decision against the labelled set in
`tests/datasets/grading.py` and checks the response-parsing contract the
orchestrator relies on.
"""

from __future__ import annotations

import pytest

import agent
import gemini_service
from tests.datasets.grading import GRADING_CASES, GradingCase
from tests.fakes import InMemoryDocStore, doc_key
from tests.heuristics import heuristic_relevance_scores
from tests.metrics import EvalReport, binary_prf

pytestmark = pytest.mark.grading

# The offline floors gate the stand-in grader (see tests/heuristics.py): they
# guard the datasets and the keep/drop plumbing, not Gemini's judgement. The
# live floors are the ones that measure the model.
OFFLINE_FLOORS = {"f1": 0.70, "accuracy": 0.70, "recall": 0.85}
LIVE_FLOORS = {"f1": 0.80, "accuracy": 0.80, "recall": 0.90}


def _candidates(store: InMemoryDocStore, case: GradingCase) -> list[dict]:
    return [store.by_key(key) for key in case.candidates]


def _kept_keys(docs: list[dict], scores: dict[int, int]) -> set[str]:
    """Replicates the orchestrator's keep rule: unscored chunks survive, and an
    all-zero verdict falls back to keeping everything rather than starving the
    writer."""
    kept = [d for d in docs if scores.get(d["id"], 1) > 0] or docs
    return {doc_key(d) for d in kept}


def _score(scorer, store: InMemoryDocStore, cases=GRADING_CASES) -> tuple[dict[str, float], list[str]]:
    y_true: list[bool] = []
    y_pred: list[bool] = []
    mistakes: list[str] = []
    for case in cases:
        docs = _candidates(store, case)
        kept = _kept_keys(docs, scorer(case, docs))
        for doc in docs:
            key = doc_key(doc)
            gold, predicted = case.gold(key), key in kept
            y_true.append(gold)
            y_pred.append(predicted)
            if gold != predicted:
                verb = "dropped needed" if gold else "kept junk"
                mistakes.append(f"{verb} {key} for {case.goal[:44]!r}")
    result = binary_prf(y_true, y_pred)
    return (
        {
            "f1": result.f1,
            "accuracy": result.accuracy,
            "precision": result.precision,
            "recall": result.recall,
        },
        mistakes,
    )


def _assert_floors(scores, floors, mistakes, report: EvalReport, tier: str, cases=GRADING_CASES) -> None:
    note = f"{len(cases)} goals"
    for metric in ("f1", "accuracy", "precision", "recall"):
        report.check(
            "grading",
            f"{metric} ({tier})",
            scores[metric],
            floors.get(metric),
            note,
        )
    failed = {m: scores[m] for m, floor in floors.items() if scores[m] < floor}
    assert not failed, (
        f"grading below floor ({tier}): "
        + ", ".join(f"{m}={v:.3f} < {floors[m]:.2f}" for m, v in failed.items())
        + "\nmistakes:\n  "
        + "\n  ".join(mistakes)
    )


def test_grading_accuracy_offline(store: InMemoryDocStore, report: EvalReport) -> None:
    def scorer(case: GradingCase, docs: list[dict]) -> dict[int, int]:
        return heuristic_relevance_scores(case.goal, docs, store.embedder)

    scores, mistakes = _score(scorer, store)
    _assert_floors(scores, OFFLINE_FLOORS, mistakes, report, "offline stand-in")


@pytest.mark.live
def test_grading_accuracy_live(
    live_env, live_call, live_sample, store: InMemoryDocStore, report: EvalReport
) -> None:
    def scorer(case: GradingCase, docs: list[dict]) -> dict[int, int]:
        graded = live_call(agent._grade_chunks, case.goal, docs)
        scores: dict[int, int] = {}
        for entry in graded.get("scores", []):
            try:
                scores[int(entry["id"])] = int(entry["score"])
            except (KeyError, TypeError, ValueError):
                continue
        return scores

    cases = live_sample(GRADING_CASES)  # one model call per case
    scores, mistakes = _score(scorer, store, cases)
    _assert_floors(scores, LIVE_FLOORS, mistakes, report, "live", cases)


# ---------------------------------------------------- grader prompt contract

def test_grader_prompt_carries_goal_and_addressable_chunks(
    monkeypatch: pytest.MonkeyPatch, store: InMemoryDocStore
) -> None:
    """The grader can only return usable scores if every chunk it sees is
    addressable by the same id the orchestrator will look up."""
    seen: dict[str, str] = {}

    def capture(prompt: str, model: str | None = None, attempts: int = 2) -> dict:
        seen["prompt"] = prompt
        return {"scores": [], "refined_query": None}

    monkeypatch.setattr(gemini_service, "generate_json", capture)
    docs = _candidates(store, GRADING_CASES[0])
    agent._grade_chunks("stream tokens from FastAPI", docs)

    prompt = seen["prompt"]
    assert "stream tokens from FastAPI" in prompt
    for doc in docs:
        assert f"chunk_id={doc['id']}" in prompt
        assert doc["section_title"] in prompt


def test_grader_response_is_returned_verbatim(
    monkeypatch: pytest.MonkeyPatch, store: InMemoryDocStore
) -> None:
    payload = {"scores": [{"id": 1, "score": 2}], "refined_query": "hnsw index build"}
    monkeypatch.setattr(gemini_service, "generate_json", lambda *a, **k: payload)
    assert agent._grade_chunks("goal", _candidates(store, GRADING_CASES[0])) == payload
