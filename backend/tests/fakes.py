"""Deterministic stand-ins for Gemini and Neon.

The offline tier of the harness must produce the same numbers on every machine
and inside CI, where there is no `GEMINI_API_KEY` and no database. So:

* `LexicalEmbedder` replaces `gemini-embedding-001` with a tf-idf vector over
  the seed corpus. It is a genuinely weaker embedder than Gemini's, but it is a
  real one — cosine ranking still reflects term evidence, so retrieval precision
  over the golden set measures ranking behaviour rather than a hardcoded answer.
* `InMemoryDocStore` replaces `db.get_relevant_docs`, mirroring its scope
  semantics (single key / list of keys / None = all) and its cosine ordering,
  and logging every query so tests can assert on the agent's re-query loop.
* `ScriptedLLM` replaces `gemini_service.generate_json`, routing by the stage
  sentence in the prompt so one object can drive plan, grade and verify — and
  raise on any of them to exercise the graceful-degradation paths.
"""

from __future__ import annotations

import math
import re
from collections import Counter
from typing import Callable, Iterator, Sequence

TOKEN_RE = re.compile(r"[a-z0-9_]+(?:\.[a-z0-9_]+)*")


def tokenize(text: str) -> list[str]:
    return TOKEN_RE.findall(text.lower())


def doc_key(row: dict) -> str:
    """Stable identity for a corpus chunk.

    Section titles are not unique across stacks ("Settings and Environment
    Configuration" exists for both FastAPI and Django), so datasets key on
    framework + title. Works for in-memory rows and real Neon rows alike.
    """
    return f"{row['framework_name']}/{row['section_title']}"


# ---------------------------------------------------------------- embeddings

class LexicalEmbedder:
    """L2-normalised tf-idf embedder fitted on the corpus."""

    def __init__(self, documents: Sequence[str]) -> None:
        tokenized = [tokenize(d) for d in documents]
        df: Counter[str] = Counter()
        for tokens in tokenized:
            df.update(set(tokens))
        n = max(1, len(tokenized))
        self.idf = {term: math.log((n + 1) / (freq + 1)) + 1.0 for term, freq in df.items()}
        self.vocab = {term: i for i, term in enumerate(sorted(self.idf))}
        # Terms absent from the corpus (invented APIs, typos) are the strongest
        # possible evidence of "not in the docs" — score them above every real term.
        self.oov_idf = max(self.idf.values(), default=1.0) + 1.0

    def embed(self, text: str) -> list[float]:
        vector = [0.0] * len(self.vocab)
        for term, count in Counter(tokenize(text)).items():
            index = self.vocab.get(term)
            if index is None:
                continue
            vector[index] = (1.0 + math.log(count)) * self.idf[term]
        norm = math.sqrt(sum(v * v for v in vector))
        return [v / norm for v in vector] if norm else vector

    def cosine_distance(self, a: Sequence[float], b: Sequence[float]) -> float:
        """Matches pgvector's `<=>`: 1 - cosine similarity, range [0, 2]."""
        return max(0.0, min(2.0, 1.0 - sum(x * y for x, y in zip(a, b))))

    def support_score(self, claim: str, source_text: str) -> float:
        """Share of a claim's idf mass that the source text actually covers.

        Weighting by idf (with out-of-vocabulary terms weighted highest) means an
        invented API name drags the score down far harder than a shared filler
        word props it up. Used by the offline stand-in verifier.
        """
        claim_terms = set(tokenize(claim))
        if not claim_terms:
            return 0.0
        source_terms = set(tokenize(source_text))
        total = sum(self.idf.get(t, self.oov_idf) for t in claim_terms)
        covered = sum(self.idf.get(t, self.oov_idf) for t in claim_terms if t in source_terms)
        return covered / total if total else 0.0


# ------------------------------------------------------------------ doc store

class InMemoryDocStore:
    """Drop-in replacement for `db.get_relevant_docs` backed by the seed corpus."""

    def __init__(self, documents: Sequence[dict]) -> None:
        self.rows = [
            {
                "id": i,
                "framework_name": d["framework_name"],
                "section_title": d["section_title"],
                "doc_url": d["doc_url"],
                "raw_content": d["raw_content"],
            }
            for i, d in enumerate(documents, start=1)
        ]
        self.embedder = LexicalEmbedder(
            [f"{r['section_title']}\n\n{r['raw_content']}" for r in self.rows]
        )
        self._vectors = {
            r["id"]: self.embedder.embed(f"{r['section_title']}\n\n{r['raw_content']}")
            for r in self.rows
        }
        self.queries: list[tuple[str | list[str] | None, str, int]] = []

    def get_relevant_docs(
        self, framework: str | list[str] | None, query_text: str, limit: int = 4
    ) -> list[dict]:
        self.queries.append((framework, query_text, limit))
        if framework is None:
            candidates = self.rows
        elif isinstance(framework, str):
            candidates = [r for r in self.rows if r["framework_name"] == framework]
        else:
            allowed = set(framework)
            candidates = [r for r in self.rows if r["framework_name"] in allowed]

        query_vector = self.embedder.embed(query_text)
        scored = [
            {**row, "distance": self.embedder.cosine_distance(query_vector, self._vectors[row["id"]])}
            for row in candidates
        ]
        scored.sort(key=lambda r: (r["distance"], r["id"]))
        return scored[:limit]

    def by_key(self, key: str) -> dict:
        for row in self.rows:
            if doc_key(row) == key:
                return dict(row)
        raise KeyError(f"no corpus chunk named {key!r}")

    def reset_log(self) -> None:
        self.queries.clear()


# ------------------------------------------------------------------- fake LLM

class ScriptedLLM:
    """Stands in for `gemini_service.generate_json`.

    Each stage takes a dict (returned as-is), a callable(prompt) -> dict, or an
    Exception instance (raised, to exercise degradation). Unset stages fall back
    to a benign empty response so tests only script what they care about.
    """

    _STAGE_MARKERS = (
        ("retrieval planner", "plan"),
        ("retrieval grader", "grade"),
        ("citation verifier", "verify"),
    )
    _DEFAULTS = {
        "plan": {"search_queries": []},
        "grade": {"scores": []},
        "verify": {"citations": []},
    }

    Response = dict | Callable[[str], dict] | Exception

    def __init__(
        self,
        *,
        plan: Response | None = None,
        grade: Response | None = None,
        verify: Response | None = None,
    ) -> None:
        self._scripted = {"plan": plan, "grade": grade, "verify": verify}
        self.calls: list[tuple[str, str]] = []

    @classmethod
    def stage_of(cls, prompt: str) -> str:
        for marker, stage in cls._STAGE_MARKERS:
            if marker in prompt:
                return stage
        raise AssertionError(f"prompt does not match a known agent stage:\n{prompt[:200]}")

    def __call__(self, prompt: str, model: str | None = None, attempts: int = 2) -> dict:
        stage = self.stage_of(prompt)
        self.calls.append((stage, prompt))
        scripted = self._scripted.get(stage)
        if scripted is None:
            return dict(self._DEFAULTS[stage])
        if isinstance(scripted, Exception):
            raise scripted
        if callable(scripted):
            return scripted(prompt)
        return scripted

    def prompts_for(self, stage: str) -> list[str]:
        return [prompt for called, prompt in self.calls if called == stage]


def scripted_stream(text: str, chunk_size: int = 60) -> Callable[..., Iterator[str]]:
    """Stands in for `gemini_service.stream_masterclass`, yielding `text` in chunks."""

    def _stream(query: str, framework: str, mode: str, docs: list[dict]) -> Iterator[str]:
        for i in range(0, len(text), chunk_size):
            yield text[i : i + chunk_size]

    return _stream


def failing_stream(exc: Exception) -> Callable[..., Iterator[str]]:
    def _stream(*args, **kwargs) -> Iterator[str]:
        raise exc
        yield  # pragma: no cover - makes this a generator function

    return _stream
