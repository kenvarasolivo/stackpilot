"""Gemini services: query/document embeddings + streamed masterclass generation.

Uses the official google-genai SDK. GEMINI_API_KEY is read from the
environment (loaded from the workspace-root .env by main.py / seed.py).
"""

import json
import os
import time
from functools import lru_cache
from typing import Iterator

from google import genai
from google.genai import types

GENERATION_MODEL = "gemini-2.5-flash"
AGENT_MODEL = "gemini-2.5-flash-lite"  # small/fast: planner, grader, verifier steps
EMBEDDING_MODEL = "gemini-embedding-001"
EMBEDDING_DIMS = 768  # must match vector(768) on the framework_docs table


@lru_cache(maxsize=1)
def get_client() -> genai.Client:
    api_key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not api_key or api_key == "PASTE_YOUR_KEY_HERE":
        raise RuntimeError("GEMINI_API_KEY is not set. Add it to the .env file in the workspace root.")
    return genai.Client(api_key=api_key)


def embed_text(text: str, *, for_storage: bool = False) -> list[float]:
    """Embed one text. RETRIEVAL_DOCUMENT when seeding rows, RETRIEVAL_QUERY when searching."""
    result = get_client().models.embed_content(
        model=EMBEDDING_MODEL,
        contents=text,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_DOCUMENT" if for_storage else "RETRIEVAL_QUERY",
            output_dimensionality=EMBEDDING_DIMS,
        ),
    )
    return list(result.embeddings[0].values)


def _extract_first_json_object(text: str) -> str:
    """First balanced top-level {...} (string-aware), for responses with trailing junk."""
    start = text.find("{")
    if start == -1:
        raise ValueError("No JSON object in model response")
    depth, in_str, esc = 0, False, False
    for i in range(start, len(text)):
        ch = text[i]
        if esc:
            esc = False
            continue
        if in_str:
            if ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
        elif ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                return text[start : i + 1]
    raise ValueError("Truncated JSON in model response")


def generate_json(prompt: str, model: str = AGENT_MODEL, attempts: int = 2) -> dict:
    """Structured call used by the agent's plan/grade/verify steps.

    Retries once on transient failures (free-tier 429/503 bursts are common)."""
    last_exc: Exception | None = None
    for attempt in range(attempts):
        try:
            res = get_client().models.generate_content(
                model=model,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0.2,
                ),
            )
            text = res.text or ""
            try:
                data = json.loads(text)
            except ValueError:
                data = json.loads(_extract_first_json_object(text))
            if not isinstance(data, dict):
                raise ValueError("Model returned non-object JSON")
            return data
        except Exception as exc:
            last_exc = exc
            if attempt + 1 < attempts:
                time.sleep(1.5)
    raise last_exc if last_exc else RuntimeError("generate_json failed")


def _build_prompt(query: str, framework: str, mode: str, docs: list[dict]) -> str:
    context = "\n\n".join(
        f"[{i + 1}] \"{d['section_title']}\" ({d['doc_url']})\n{d['raw_content']}"
        for i, d in enumerate(docs)
    )
    mode_hint = (
        "Code-First Tutorial: lead with complete, runnable code blocks; keep prose terse and practical."
        if mode == "code-first"
        else "Architectural Deep-Dive: explain concepts, tradeoffs and failure modes; use code to illustrate."
    )
    return f"""You are StackPilot, an AI framework masterclass engine. You answer ONLY from
the retrieved documentation context below and cite it with footnote markers.

## Retrieved documentation context
{context}

## Task
Framework: {framework}
Mode: {mode_hint}
Learning goal: {query}

Write a masterclass tutorial in GitHub-flavored Markdown:
- Start with a single `#` title line.
- Use `##` section headers, short paragraphs, and ordered lists for steps.
- Include fenced code blocks with language tags (```sql, ```ts, ```python, ```bash).
- Cite the context inline with bare footnote markers like [1] or [2] immediately
  after the claim they support. Every context chunk above must be cited at least once.
- Use a `>` blockquote for one or two short "Architecture Note:" callouts.
- If the context does not cover part of the goal, say so briefly rather than inventing APIs.
- Do NOT add a references/footnotes section at the end; the UI renders sources separately."""


def stream_masterclass(query: str, framework: str, mode: str, docs: list[dict]) -> Iterator[str]:
    """Yields markdown text chunks as Gemini generates them."""
    stream = get_client().models.generate_content_stream(
        model=GENERATION_MODEL,
        contents=_build_prompt(query, framework, mode, docs),
        config=types.GenerateContentConfig(temperature=0.6),
    )
    for chunk in stream:
        if chunk.text:
            yield chunk.text
