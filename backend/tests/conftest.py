"""Fixtures and reporting hooks for the StackPilot eval harness.

Two tiers share one set of datasets:

* **offline** (default, runs in CI on every push) — Gemini and Neon are replaced
  by the deterministic stand-ins in `tests.fakes`, so the suite needs no API key,
  no database and no network, and produces identical numbers everywhere.
* **live** (`pytest -m live`) — the same golden sets scored against the real
  `gemini-embedding-001` + Neon retrieval path and the real flash-lite judges.
  Skipped automatically when the credentials are absent.
"""

from __future__ import annotations

import os
import time
from pathlib import Path

import pytest
from dotenv import load_dotenv

import db
import seed
from tests.fakes import InMemoryDocStore
from tests.metrics import EvalReport

REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = Path(__file__).resolve().parents[1]

# Collected across the whole session, then written out and printed at the end.
_REPORT = EvalReport()


# ------------------------------------------------------------------- corpus

@pytest.fixture(scope="session")
def corpus() -> list[dict]:
    """The curated documentation chunks that `seed.py` loads into Neon."""
    return seed.DOCS


@pytest.fixture(scope="session")
def store(corpus: list[dict]) -> InMemoryDocStore:
    """Offline vector store over the same corpus that is seeded to Neon."""
    return InMemoryDocStore(corpus)


@pytest.fixture()
def offline_store(monkeypatch: pytest.MonkeyPatch, store: InMemoryDocStore) -> InMemoryDocStore:
    """Point `db.get_relevant_docs` at the in-memory store for this test."""
    store.reset_log()
    monkeypatch.setattr(db, "get_relevant_docs", store.get_relevant_docs)
    return store


@pytest.fixture()
def report() -> EvalReport:
    return _REPORT


@pytest.fixture(autouse=True)
def no_network(request: pytest.FixtureRequest, monkeypatch: pytest.MonkeyPatch) -> None:
    """Hard-fail any outbound connection from a test not marked `live`.

    The offline tier being free to run is what lets CI run it on every push, so
    that property is enforced rather than trusted: a stub that stops covering
    some call path fails loudly here instead of quietly reaching for the network
    and spending API quota on a CI runner.
    """
    if request.node.get_closest_marker("live"):
        return

    import socket

    def blocked(*args, **kwargs):
        raise RuntimeError(
            "the offline tier attempted a network connection — something is no "
            "longer stubbed. Mark the test `live` if it is meant to hit the "
            "real Gemini API or Neon."
        )

    monkeypatch.setattr(socket.socket, "connect", blocked)
    monkeypatch.setattr(socket.socket, "connect_ex", blocked)
    monkeypatch.setattr(socket, "create_connection", blocked)


# --------------------------------------------------------------------- live

@pytest.fixture(scope="session")
def live_env() -> None:
    """Load the workspace-root .env and skip the test unless both creds exist."""
    load_dotenv(REPO_ROOT / ".env")
    load_dotenv(BACKEND_ROOT / ".env")
    missing = [
        name
        for name in ("GEMINI_API_KEY", "DATABASE_URL")
        if not os.environ.get(name, "").strip()
    ]
    if missing:
        pytest.skip(f"live tier needs {', '.join(missing)}")


# The free tier caps gemini-2.5-flash-lite twice over: 10 requests/minute AND
# 20 requests/day. Pacing only helps with the first. A full live run costs 12
# judge calls (6 grading + 6 citations) out of that daily 20 — so it is one run
# per day, and a wasted run costs a day.
FREE_TIER_INTERVAL = 60.0 / 10 + 0.5

# Set once a per-day 429 is seen, so the remaining live tests skip instantly
# instead of spending two more requests each to rediscover it.
_QUOTA_BLOCK: dict[str, str | None] = {"reason": None}


def _quota_violation(exc: Exception) -> tuple[str, str, str] | None:
    """(quotaId, limit, model) from a Gemini 429, or None if it isn't one."""
    details = getattr(exc, "details", None)
    if not isinstance(details, dict):
        return None
    for detail in details.get("error", {}).get("details", []):
        if "QuotaFailure" not in detail.get("@type", ""):
            continue
        for violation in detail.get("violations", []):
            return (
                violation.get("quotaId", "unknown"),
                str(violation.get("quotaValue", "?")),
                (violation.get("quotaDimensions") or {}).get("model", "?"),
            )
    return None


@pytest.fixture(scope="session")
def live_sample():
    """Trims a golden set for the live tier so a run fits the daily budget.

    `EVAL_LIVE_CASES=3 pytest -m live` spends 3 judge calls per suite instead of
    6. The offline tier always scores the full set, so nothing is lost from the
    gate that actually runs on every push.
    """
    limit = int(os.environ.get("EVAL_LIVE_CASES", "0") or 0)

    def take(cases: tuple):
        return cases[:limit] if limit > 0 else cases

    return take


@pytest.fixture(scope="session")
def live_call():
    """Paces real model calls and turns quota walls into precise skips.

    Running out of quota is not an eval result, so it skips rather than fails —
    a red build must mean the pipeline got worse, not that the day's requests
    ran out. The skip says *which* quota and how long it is gone for, because
    "retry in 12s" on a daily cap is actively misleading. Session-scoped so the
    grading and citation suites share one budget.
    """
    state = {"last": 0.0}

    def call(fn, *args, pace: bool = True, **kwargs):
        if _QUOTA_BLOCK["reason"]:
            pytest.skip(_QUOTA_BLOCK["reason"])
        if pace:
            wait = FREE_TIER_INTERVAL - (time.monotonic() - state["last"])
            if wait > 0:
                time.sleep(wait)
        try:
            return fn(*args, **kwargs)
        except Exception as exc:
            violation = _quota_violation(exc)
            if violation:
                quota_id, limit, model = violation
                if "PerDay" in quota_id:
                    # The API's RetryInfo suggests seconds even here; ignore it.
                    reason = (
                        f"free-tier daily quota exhausted: {limit} requests/day for "
                        f"{model}, resets at midnight Pacific. A full live run costs "
                        f"12 judge calls — budget accordingly."
                    )
                    _QUOTA_BLOCK["reason"] = reason
                else:
                    reason = (
                        f"free-tier rate limit hit: {limit} requests/minute for "
                        f"{model} ({quota_id}) — rerun in a minute."
                    )
                pytest.skip(reason)
            if "429" in str(exc) or "RESOURCE_EXHAUSTED" in str(exc):
                pytest.skip(f"Gemini quota exhausted: {str(exc)[:200]}")
            raise
        finally:
            state["last"] = time.monotonic()

    return call


# ---------------------------------------------------------------- reporting

def pytest_sessionfinish(session: pytest.Session, exitstatus: int) -> None:
    if not _REPORT.rows:
        return
    output_dir = Path(os.environ.get("EVAL_REPORT_DIR", BACKEND_ROOT))
    _REPORT.write(output_dir)


def pytest_terminal_summary(terminalreporter, exitstatus, config) -> None:
    if not _REPORT.rows:
        return
    terminalreporter.section("eval metrics")
    width = max(len(f"{r.suite}/{r.metric}") for r in _REPORT.rows)
    for row in _REPORT.rows:
        floor = "" if row.threshold is None else f"  (floor {row.threshold:.2f})"
        status = "PASS" if row.passed else "FAIL"
        label = f"{row.suite}/{row.metric}".ljust(width)
        terminalreporter.write_line(f"  {status}  {label}  {row.value:.3f}{floor}")
