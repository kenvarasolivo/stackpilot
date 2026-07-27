"""Citation-verification evals.

The verify stage is what lets the UI put a `supported` / `partial` /
`unsupported` badge on every source, so two things matter and are measured
separately: exact verdict agreement with the labelled set, and — the one that
actually protects the reader — how reliably a claim the source does not back
gets flagged as something other than `supported`.

The rest of the module pins the parsing contract: markers pointing at sources
that were never sent, ids the model invents, and verdict strings outside the
allowed set must never reach the client.
"""

from __future__ import annotations

import pytest

import agent
import gemini_service
from tests.datasets.citations import CITATION_CASES, CitationCase
from tests.fakes import InMemoryDocStore
from tests.heuristics import heuristic_verdicts
from tests.metrics import EvalReport, agreement, mean

pytestmark = pytest.mark.citations

# Exact three-way agreement is the strict metric; unsupported-flag recall is the
# safety metric and is expected to stay at 1.0 in both tiers — a fabricated
# claim badged `supported` is the worst output this pipeline can produce.
OFFLINE_FLOORS = {"verdict agreement": 0.70, "unsupported flagged": 1.00}
LIVE_FLOORS = {"verdict agreement": 0.75, "unsupported flagged": 1.00}


def _sources(store: InMemoryDocStore, case: CitationCase) -> list[dict]:
    """Renumber the case's corpus chunks 1..n exactly as the orchestrator does."""
    sources = []
    for i, key in enumerate(case.sources, start=1):
        row = store.by_key(key)
        row["id"] = i
        sources.append(row)
    return sources


def _score(verifier, store: InMemoryDocStore, cases=CITATION_CASES) -> tuple[dict[str, float], list[str]]:
    expected: list[str] = []
    actual: list[str] = []
    flagged: list[float] = []
    mistakes: list[str] = []
    for case in cases:
        sources = _sources(store, case)
        verdicts = {v["id"]: v["verdict"] for v in verifier(case, sources)}
        for citation_id, gold in sorted(case.gold.items()):
            predicted = verdicts.get(citation_id, "missing")
            expected.append(gold)
            actual.append(predicted)
            if gold != "supported":
                flagged.append(1.0 if predicted != "supported" else 0.0)
            if gold != predicted:
                mistakes.append(f"{case.name}[{citation_id}]: want {gold}, got {predicted}")
    return (
        {
            "verdict agreement": agreement(expected, actual),
            "unsupported flagged": mean(flagged) if flagged else 1.0,
        },
        mistakes,
    )


def _assert_floors(scores, floors, mistakes, report: EvalReport, tier: str, cases=CITATION_CASES) -> None:
    note = f"{sum(len(c.gold) for c in cases)} labelled citations"
    for metric, floor in floors.items():
        report.check("citations", f"{metric} ({tier})", scores[metric], floor, note)
    failed = {m: scores[m] for m, floor in floors.items() if scores[m] < floor}
    assert not failed, (
        f"citation verification below floor ({tier}): "
        + ", ".join(f"{m}={v:.3f} < {floors[m]:.2f}" for m, v in failed.items())
        + "\nmistakes:\n  "
        + "\n  ".join(mistakes)
    )


def test_citation_verdicts_offline(store: InMemoryDocStore, report: EvalReport) -> None:
    def verifier(case: CitationCase, sources: list[dict]) -> list[dict]:
        return heuristic_verdicts(case.tutorial, sources, store.embedder)

    scores, mistakes = _score(verifier, store)
    _assert_floors(scores, OFFLINE_FLOORS, mistakes, report, "offline stand-in")


@pytest.mark.live
def test_citation_verdicts_live(
    live_env, live_call, live_sample, store: InMemoryDocStore, report: EvalReport
) -> None:
    def verifier(case: CitationCase, sources: list[dict]) -> list[dict]:
        return live_call(agent._verify_citations, case.tutorial, sources)

    cases = live_sample(CITATION_CASES)  # one model call per case
    scores, mistakes = _score(verifier, store, cases)
    _assert_floors(scores, LIVE_FLOORS, mistakes, report, "live", cases)


# -------------------------------------------------- verifier parsing contract

@pytest.fixture()
def stray_marker_case(store: InMemoryDocStore) -> tuple[CitationCase, list[dict]]:
    case = next(c for c in CITATION_CASES if c.name == "fastapi-streaming-with-stray-marker")
    return case, _sources(store, case)


def test_markers_without_a_source_are_not_sent_to_the_verifier(
    monkeypatch: pytest.MonkeyPatch, stray_marker_case
) -> None:
    case, sources = stray_marker_case
    seen: dict[str, str] = {}

    def capture(prompt: str, model: str | None = None, attempts: int = 2) -> dict:
        seen["prompt"] = prompt
        return {"citations": []}

    monkeypatch.setattr(gemini_service, "generate_json", capture)
    agent._verify_citations(case.tutorial, sources)

    assert "[1]" in seen["prompt"] and "[2]" in seen["prompt"]
    listing = seen["prompt"].split("## Tutorial", 1)[0]
    assert "[9]" not in listing, "a marker with no matching source must not be verified"


def test_verdicts_for_unknown_ids_are_dropped(
    monkeypatch: pytest.MonkeyPatch, stray_marker_case
) -> None:
    case, sources = stray_marker_case
    monkeypatch.setattr(
        gemini_service,
        "generate_json",
        lambda *a, **k: {
            "citations": [
                {"id": 1, "verdict": "supported", "note": "ok"},
                {"id": 9, "verdict": "unsupported", "note": "hallucinated id"},
            ]
        },
    )
    assert [c["id"] for c in agent._verify_citations(case.tutorial, sources)] == [1]


def test_verdicts_outside_the_allowed_set_are_dropped(
    monkeypatch: pytest.MonkeyPatch, stray_marker_case
) -> None:
    case, sources = stray_marker_case
    monkeypatch.setattr(
        gemini_service,
        "generate_json",
        lambda *a, **k: {
            "citations": [
                {"id": 1, "verdict": "mostly fine"},
                {"id": 2, "verdict": "partial"},
                {"verdict": "supported"},
                {"id": "not-a-number", "verdict": "supported"},
            ]
        },
    )
    assert agent._verify_citations(case.tutorial, sources) == [
        {"id": 2, "verdict": "partial", "note": ""}
    ]


def test_notes_are_truncated_before_reaching_the_client(
    monkeypatch: pytest.MonkeyPatch, stray_marker_case
) -> None:
    case, sources = stray_marker_case
    monkeypatch.setattr(
        gemini_service,
        "generate_json",
        lambda *a, **k: {"citations": [{"id": 1, "verdict": "partial", "note": "x" * 500}]},
    )
    assert len(agent._verify_citations(case.tutorial, sources)[0]["note"]) == 120


def test_text_without_citations_skips_the_model_entirely(
    monkeypatch: pytest.MonkeyPatch, stray_marker_case
) -> None:
    _, sources = stray_marker_case

    def explode(*args, **kwargs):
        raise AssertionError("verifier must not be called when nothing is cited")

    monkeypatch.setattr(gemini_service, "generate_json", explode)
    assert agent._verify_citations("A tutorial with no markers at all.", sources) == []
