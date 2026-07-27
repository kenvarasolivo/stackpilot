"""Unit tests for the scoring primitives.

Every threshold in this harness is only as trustworthy as the arithmetic behind
it, so the metrics get their own tests with hand-checked expected values.
"""

from __future__ import annotations

import json

import pytest

from tests.metrics import (
    EvalReport,
    agreement,
    binary_prf,
    mean,
    precision_at_k,
    r_precision,
    recall_at_k,
    reciprocal_rank,
)

RANKED = ["a", "b", "c", "d"]
RELEVANT = {"b", "d", "e"}


def test_precision_at_k_counts_hits_in_the_top_k() -> None:
    assert precision_at_k(RANKED, RELEVANT, 1) == 0.0
    assert precision_at_k(RANKED, RELEVANT, 2) == 0.5
    assert precision_at_k(RANKED, RELEVANT, 4) == 0.5


def test_precision_divides_by_what_was_returned_not_by_k() -> None:
    assert precision_at_k(["b"], RELEVANT, 3) == 1.0


def test_precision_of_an_empty_result_is_zero() -> None:
    assert precision_at_k([], RELEVANT, 3) == 0.0


def test_recall_at_k_measures_coverage_of_the_labels() -> None:
    assert recall_at_k(RANKED, RELEVANT, 2) == pytest.approx(1 / 3)
    assert recall_at_k(RANKED, RELEVANT, 4) == pytest.approx(2 / 3)
    assert recall_at_k(RANKED, set(), 4) == 0.0


def test_r_precision_sizes_the_cutoff_to_the_label_count() -> None:
    # 3 labels, 2 of them inside the top 3.
    assert r_precision(RANKED, RELEVANT) == pytest.approx(1 / 3)
    # A single-label query with the right answer first scores a clean 1.0,
    # where precision@3 would have been capped at 0.33.
    assert r_precision(RANKED, {"a"}) == 1.0
    assert r_precision(RANKED, set()) == 0.0


def test_reciprocal_rank_uses_the_first_hit() -> None:
    assert reciprocal_rank(RANKED, RELEVANT) == 0.5
    assert reciprocal_rank(["b"], RELEVANT) == 1.0
    assert reciprocal_rank(["x", "y"], RELEVANT) == 0.0


@pytest.mark.parametrize("k", [0, -1])
def test_k_must_be_positive(k: int) -> None:
    with pytest.raises(ValueError):
        precision_at_k(RANKED, RELEVANT, k)
    with pytest.raises(ValueError):
        recall_at_k(RANKED, RELEVANT, k)


def test_binary_prf_on_a_hand_checked_confusion_matrix() -> None:
    # tp=2, fp=1, fn=1, tn=1
    score = binary_prf([True, True, False, False, True], [True, True, True, False, False])
    assert score.precision == pytest.approx(2 / 3)
    assert score.recall == pytest.approx(2 / 3)
    assert score.f1 == pytest.approx(2 / 3)
    assert score.accuracy == pytest.approx(3 / 5)
    assert score.support == 5


def test_binary_prf_handles_a_grader_that_keeps_nothing() -> None:
    score = binary_prf([True, False], [False, False])
    assert (score.precision, score.recall, score.f1) == (0.0, 0.0, 0.0)
    assert score.accuracy == 0.5


def test_binary_prf_rejects_misaligned_inputs() -> None:
    with pytest.raises(ValueError):
        binary_prf([True], [True, False])


def test_agreement_is_exact_match_rate() -> None:
    assert agreement(["supported", "partial"], ["supported", "unsupported"]) == 0.5
    assert agreement([], []) == 0.0
    with pytest.raises(ValueError):
        agreement(["a"], [])


def test_mean_of_nothing_is_zero() -> None:
    assert mean([]) == 0.0
    assert mean([1.0, 2.0]) == 1.5


# ------------------------------------------------------------------- report

def test_report_flags_metrics_below_their_floor() -> None:
    report = EvalReport()
    report.check("retrieval", "precision@1", 0.9, 0.8)
    report.check("grading", "f1", 0.4, 0.7)
    report.check("citations", "coverage", 1.0)
    assert [r.metric for r in report.failures] == ["f1"]


def test_report_round_trips_to_markdown_and_json(tmp_path) -> None:
    report = EvalReport()
    report.check("retrieval", "precision@1", 0.875, 0.8, "24 goals")
    md_path, json_path = report.write(tmp_path)

    markdown = md_path.read_text(encoding="utf-8")
    assert "| retrieval | precision@1 | 0.875 | 0.80 | ✅ | 24 goals |" in markdown

    payload = json.loads(json_path.read_text(encoding="utf-8"))
    assert payload["metrics"] == [
        {
            "suite": "retrieval",
            "metric": "precision@1",
            "value": 0.875,
            "threshold": 0.8,
            "passed": True,
            "note": "24 goals",
        }
    ]
