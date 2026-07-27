"""Scoring primitives and the run-level report for the StackPilot eval harness.

Every eval test funnels its number through `EvalReport.check`, so a run produces
one machine-readable table of metric -> value -> threshold -> pass/fail
(`eval-report.json` / `eval-report.md`) instead of only a green/red exit code.
CI publishes that table to the job summary.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable, Sequence


# ------------------------------------------------------------------ ranking

def precision_at_k(ranked: Sequence[str], relevant: Iterable[str], k: int) -> float:
    """Fraction of the top-k retrieved items that are relevant.

    Divided by the number of items actually returned (not by k), so a retriever
    that returns 2 rows for k=3 is not penalised for the missing slot — recall
    is what measures that.
    """
    if k <= 0:
        raise ValueError("k must be >= 1")
    top = list(ranked)[:k]
    if not top:
        return 0.0
    relevant = set(relevant)
    return sum(1 for item in top if item in relevant) / len(top)


def recall_at_k(ranked: Sequence[str], relevant: Iterable[str], k: int) -> float:
    """Fraction of the relevant items that appear in the top k."""
    if k <= 0:
        raise ValueError("k must be >= 1")
    relevant = set(relevant)
    if not relevant:
        return 0.0
    top = set(list(ranked)[:k])
    return len(top & relevant) / len(relevant)


def r_precision(ranked: Sequence[str], relevant: Iterable[str]) -> float:
    """Precision at k = the number of labelled items for this query.

    Plain precision@3 is meaningless on a set where most goals have exactly one
    correct chunk — it is capped at 0.33 no matter how good the retriever is.
    R-precision sizes the cut-off to each query's label count, so a perfect
    ranking scores 1.0 whether the goal has one right answer or four.
    """
    relevant = set(relevant)
    if not relevant:
        return 0.0
    return precision_at_k(ranked, relevant, len(relevant))


def reciprocal_rank(ranked: Sequence[str], relevant: Iterable[str]) -> float:
    """1 / rank of the first relevant item; 0.0 if none was retrieved."""
    relevant = set(relevant)
    for i, item in enumerate(ranked, start=1):
        if item in relevant:
            return 1.0 / i
    return 0.0


# ------------------------------------------------------------ classification

@dataclass(frozen=True)
class ClassificationScore:
    precision: float
    recall: float
    f1: float
    accuracy: float
    support: int


def binary_prf(y_true: Sequence[bool], y_pred: Sequence[bool]) -> ClassificationScore:
    """Precision/recall/F1/accuracy for a binary decision (e.g. "keep this chunk")."""
    if len(y_true) != len(y_pred):
        raise ValueError("y_true and y_pred must be the same length")
    if not y_true:
        return ClassificationScore(0.0, 0.0, 0.0, 0.0, 0)
    tp = sum(1 for t, p in zip(y_true, y_pred) if t and p)
    fp = sum(1 for t, p in zip(y_true, y_pred) if not t and p)
    fn = sum(1 for t, p in zip(y_true, y_pred) if t and not p)
    correct = sum(1 for t, p in zip(y_true, y_pred) if t == p)
    precision = tp / (tp + fp) if tp + fp else 0.0
    recall = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * precision * recall / (precision + recall) if precision + recall else 0.0
    return ClassificationScore(precision, recall, f1, correct / len(y_true), len(y_true))


def agreement(expected: Sequence[str], actual: Sequence[str]) -> float:
    """Exact-match rate over aligned label sequences (used for citation verdicts)."""
    if len(expected) != len(actual):
        raise ValueError("label sequences must be the same length")
    if not expected:
        return 0.0
    return sum(1 for e, a in zip(expected, actual) if e == a) / len(expected)


def mean(values: Iterable[float]) -> float:
    values = list(values)
    return sum(values) / len(values) if values else 0.0


# ----------------------------------------------------------------- reporting

@dataclass
class MetricRow:
    suite: str
    metric: str
    value: float
    threshold: float | None
    passed: bool
    note: str = ""

    def as_dict(self) -> dict:
        return {
            "suite": self.suite,
            "metric": self.metric,
            "value": round(self.value, 4),
            "threshold": self.threshold,
            "passed": self.passed,
            "note": self.note,
        }


@dataclass
class EvalReport:
    rows: list[MetricRow] = field(default_factory=list)

    def check(
        self,
        suite: str,
        metric: str,
        value: float,
        minimum: float | None = None,
        note: str = "",
    ) -> float:
        """Record a metric (and whether it cleared its floor). Returns the value
        so callers can assert on it directly."""
        passed = True if minimum is None else value >= minimum
        self.rows.append(MetricRow(suite, metric, value, minimum, passed, note))
        return value

    @property
    def failures(self) -> list[MetricRow]:
        return [r for r in self.rows if not r.passed]

    def to_markdown(self) -> str:
        lines = [
            "## StackPilot eval harness",
            "",
            "| Suite | Metric | Value | Floor | Status | Notes |",
            "| --- | --- | ---: | ---: | :---: | --- |",
        ]
        for r in self.rows:
            floor = "—" if r.threshold is None else f"{r.threshold:.2f}"
            status = "✅" if r.passed else "❌"
            lines.append(
                f"| {r.suite} | {r.metric} | {r.value:.3f} | {floor} | {status} | {r.note} |"
            )
        if not self.rows:
            lines.append("| — | no metrics recorded | 0.000 | — | — | |")
        return "\n".join(lines) + "\n"

    def write(self, directory: Path) -> tuple[Path, Path]:
        directory.mkdir(parents=True, exist_ok=True)
        md_path = directory / "eval-report.md"
        json_path = directory / "eval-report.json"
        md_path.write_text(self.to_markdown(), encoding="utf-8")
        json_path.write_text(
            json.dumps({"metrics": [r.as_dict() for r in self.rows]}, indent=2),
            encoding="utf-8",
        )
        return md_path, json_path
