"""End-to-end evals for the agent orchestrator.

`run_masterclass_agent` is a generator of NDJSON events, and the frontend is a
state machine over that event stream — so these tests drive the whole pipeline
with the deterministic fakes and assert on the events, including the paths that
only appear when a model call fails.
"""

from __future__ import annotations

import pytest

import agent
import gemini_service
from tests.fakes import ScriptedLLM, failing_stream, scripted_stream

pytestmark = pytest.mark.pipeline

TUTORIAL = (
    "# Semantic search on Neon\n\n"
    "Enable pgvector and declare the column as vector(768) [1].\n\n"
    "Order by the cosine distance operator to find the nearest chunks [2].\n"
)


@pytest.fixture()
def pipeline(monkeypatch: pytest.MonkeyPatch, offline_store):
    """Runs the agent against the in-memory store and a scripted model."""

    def _run(
        *,
        framework: str = "neon",
        mode: str = "deep-dive",
        query: str = "store and search embeddings in postgres",
        compare_to: str | None = None,
        plan=None,
        grade=None,
        verify=None,
        stream=None,
    ) -> tuple[list[dict], ScriptedLLM]:
        llm = ScriptedLLM(plan=plan, grade=grade, verify=verify)
        monkeypatch.setattr(gemini_service, "generate_json", llm)
        monkeypatch.setattr(
            gemini_service, "stream_masterclass", stream or scripted_stream(TUTORIAL)
        )
        events = list(agent.run_masterclass_agent(framework, mode, query, compare_to))
        return events, llm

    return _run


def stages(events: list[dict]) -> list[tuple[str, str]]:
    return [(e["stage"], e["status"]) for e in events if e["type"] == "agent"]


def first(events: list[dict], event_type: str) -> dict:
    return next(e for e in events if e["type"] == event_type)


def detail(events: list[dict], stage: str) -> str:
    return next(
        e.get("detail", "")
        for e in events
        if e["type"] == "agent" and e["stage"] == stage and e["status"] == "done"
    )


# ------------------------------------------------------------- happy path

def test_full_pipeline_emits_every_stage_in_order(pipeline) -> None:
    events, _ = pipeline(
        plan={"search_queries": ["pgvector cosine search", "hnsw index"]},
        verify={"citations": [{"id": 1, "verdict": "supported", "note": "matches"}]},
    )
    assert stages(events) == [
        ("plan", "start"),
        ("plan", "done"),
        ("retrieve", "start"),
        ("retrieve", "done"),
        ("grade", "start"),
        ("grade", "done"),
        ("write", "start"),
        ("write", "done"),
        ("verify", "start"),
        ("verify", "done"),
    ]
    assert events[-1] == {"type": "done"}


def test_streamed_deltas_reassemble_into_the_tutorial(pipeline) -> None:
    events, _ = pipeline()
    assert "".join(e["text"] for e in events if e["type"] == "delta") == TUTORIAL


def test_sources_are_renumbered_and_carry_what_the_ui_renders(pipeline) -> None:
    events, _ = pipeline()
    sources = first(events, "sources")["sources"]
    assert [s["id"] for s in sources] == list(range(1, len(sources) + 1))
    for source in sources:
        assert source["framework_name"] == "neon"
        assert source["doc_url"].startswith("https://")
        assert source["section_title"] and source["raw_content"]
        assert 0.0 <= source["relevance"] <= 1.0


def test_repeated_hits_across_planned_queries_are_deduped(pipeline) -> None:
    events, _ = pipeline(
        plan={
            "search_queries": [
                "pgvector cosine distance operator",
                "pgvector hnsw index for embeddings",
                "vector column dimensionality",
            ]
        }
    )
    sources = first(events, "sources")["sources"]
    titles = [s["section_title"] for s in sources]
    assert len(titles) == len(set(titles)), "overlapping queries must not duplicate a chunk"


def test_planned_queries_are_capped_at_three(pipeline) -> None:
    events, _ = pipeline(plan={"search_queries": [f"query {i}" for i in range(7)]})
    planned = next(e for e in events if e["type"] == "agent" and e["stage"] == "plan" and "data" in e)
    assert len(planned["data"]["queries"]) == 3


# ----------------------------------------------------------------- grading

def test_zero_scored_chunks_are_dropped_from_the_context(pipeline, offline_store) -> None:
    def grade(prompt: str) -> dict:
        ids = [int(line.split("chunk_id=")[1].split()[0]) for line in prompt.splitlines() if "chunk_id=" in line]
        # Keep only the first retrieved chunk.
        return {"scores": [{"id": i, "score": 2 if i == ids[0] else 0} for i in ids]}

    events, _ = pipeline(plan={"search_queries": ["pgvector cosine search"]}, grade=grade)
    assert len(first(events, "sources")["sources"]) == 1
    assert detail(events, "grade").startswith("kept 1/")


def test_all_zero_scores_fall_back_to_keeping_every_chunk(pipeline) -> None:
    def grade(prompt: str) -> dict:
        ids = [int(line.split("chunk_id=")[1].split()[0]) for line in prompt.splitlines() if "chunk_id=" in line]
        return {"scores": [{"id": i, "score": 0} for i in ids]}

    events, _ = pipeline(plan={"search_queries": ["pgvector cosine search"]}, grade=grade)
    assert first(events, "sources")["sources"], "starving the writer is worse than keeping junk"


def test_malformed_score_entries_are_skipped_not_fatal(pipeline) -> None:
    events, _ = pipeline(
        plan={"search_queries": ["pgvector cosine search"]},
        grade={
            "scores": [
                {"id": "abc", "score": 2},
                {"score": 1},
                {"id": 1},
                None,
            ]
        },
    )
    assert first(events, "sources")["sources"]
    assert events[-1] == {"type": "done"}


def test_coverage_gap_triggers_one_extra_retrieval(pipeline, offline_store) -> None:
    events, _ = pipeline(
        plan={"search_queries": ["pgvector cosine search"]},
        grade={"scores": [], "refined_query": "row level security tenant policy"},
    )
    issued = [query for _, query, _ in offline_store.queries]
    assert "row level security tenant policy" in issued
    assert "re-queried gap" in detail(events, "grade")
    titles = {s["section_title"] for s in first(events, "sources")["sources"]}
    assert "Row-Level Security for Multi-Tenant Data" in titles


def test_context_is_capped_at_max_sources(pipeline) -> None:
    events, _ = pipeline(
        framework="neon",
        mode="comparison",
        query="compare everything",
        plan={
            "search_queries": [
                "streaming responses to the browser",
                "environment variables and secrets",
                "database connection pooling",
            ]
        },
    )
    assert len(first(events, "sources")["sources"]) <= agent.MAX_SOURCES


# ------------------------------------------------------------ comparison mode

def test_comparison_mode_scopes_retrieval_to_both_stacks(pipeline, offline_store) -> None:
    events, _ = pipeline(
        framework="fastapi-vite",
        mode="comparison",
        query="a dashboard that needs SEO",
        compare_to="nextjs-fullstack",
        plan={"search_queries": ["strengths and trade-offs"]},
    )
    scope = offline_store.queries[0][0]
    assert set(scope) == {
        "fastapi-vite",
        "nextjs-fullstack",
        "fastapi",
        "react-vite",
        "nextjs",
        "express",
    }, "a combo stack must also draw on its building blocks"


def test_comparison_mode_folds_the_matchup_into_the_goal(pipeline) -> None:
    _, llm = pipeline(
        framework="fastapi-vite",
        mode="comparison",
        query="a dashboard that needs SEO",
        compare_to="nextjs-fullstack",
    )
    planner_prompt = llm.prompts_for("plan")[0]
    assert "FastAPI + Vite (Stack A)" in planner_prompt
    assert "Next.js + Node.js (full-stack) (Stack B)" in planner_prompt
    assert "a dashboard that needs SEO" in planner_prompt


def test_comparison_mode_without_a_challenger_searches_every_stack(pipeline, offline_store) -> None:
    pipeline(
        framework="nextjs",
        mode="comparison",
        query="Next.js vs Django for a content site",
        plan={"search_queries": ["server side rendering and SEO"]},
    )
    assert offline_store.queries[0][0] is None


# ------------------------------------------------------- graceful degradation

def test_planner_failure_falls_back_to_the_raw_goal(pipeline, offline_store) -> None:
    events, _ = pipeline(plan=RuntimeError("429 RESOURCE_EXHAUSTED"))
    assert "planner unavailable (rate limited)" in detail(events, "plan")
    assert offline_store.queries[0][1] == "store and search embeddings in postgres"
    assert events[-1] == {"type": "done"}


def test_grader_failure_keeps_every_retrieved_chunk(pipeline) -> None:
    events, _ = pipeline(
        plan={"search_queries": ["pgvector cosine search"]},
        grade=RuntimeError("503 UNAVAILABLE"),
    )
    assert "grader unavailable (model overloaded)" in detail(events, "grade")
    assert first(events, "sources")["sources"]
    assert events[-1] == {"type": "done"}


def test_verifier_failure_still_completes_the_response(pipeline) -> None:
    events, _ = pipeline(verify=RuntimeError("boom"))
    assert "verifier unavailable" in detail(events, "verify")
    assert not [e for e in events if e["type"] == "verification"]
    assert events[-1] == {"type": "done"}


def test_uncited_tutorial_reports_nothing_to_verify(pipeline) -> None:
    events, _ = pipeline(stream=scripted_stream("A tutorial with no markers."))
    assert detail(events, "verify") == "no citations found to verify"


def test_empty_retrieval_emits_an_actionable_error_and_stops(pipeline) -> None:
    events, _ = pipeline(framework="unknown-stack")
    assert [e["type"] for e in events][-1] == "error"
    message = events[-1]["message"]
    assert "unknown-stack" in message and "seed.py" in message
    assert not [e for e in events if e["type"] == "done"]


def test_writer_failure_propagates_rather_than_faking_a_tutorial(pipeline) -> None:
    with pytest.raises(RuntimeError):
        pipeline(stream=failing_stream(RuntimeError("writer down")))


@pytest.mark.parametrize(
    "message, expected",
    [
        ("429 RESOURCE_EXHAUSTED", "rate limited"),
        ("RESOURCE_EXHAUSTED: quota", "rate limited"),
        ("503 Service Unavailable", "model overloaded"),
        ("The model is overloaded", "model overloaded"),
        ("connection reset", "connection reset"),
    ],
)
def test_failure_reasons_are_summarised_for_the_trace(message: str, expected: str) -> None:
    assert agent._why(RuntimeError(message)) == expected


def test_long_failure_reasons_are_truncated() -> None:
    assert agent._why(RuntimeError("x" * 200)).endswith("…")
    assert len(agent._why(RuntimeError("x" * 200))) == 61
