"""Golden citation-verification set.

Each case is a fragment of tutorial prose carrying `[n]` markers, paired with
the corpus chunks those markers point at and a gold verdict per source. The
fragments include the three failure shapes the verifier exists to catch:
claims lifted straight from the source (supported), claims that stretch the
source into territory it never covers (partial), and claims that invent APIs
outright (unsupported).
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class CitationCase:
    name: str
    sources: tuple[str, ...]  # corpus keys; position i becomes citation id i+1
    tutorial: str
    gold: dict[int, str]  # citation id -> "supported" | "partial" | "unsupported"


CITATION_CASES: tuple[CitationCase, ...] = (
    CitationCase(
        name="pgvector-grounded",
        sources=(
            "neon/pgvector on Neon: Storing and Searching Embeddings",
            "neon/Serverless Connections and Pooling",
        ),
        tutorial=(
            "# Semantic search on Neon\n\n"
            "Enable the extension with CREATE EXTENSION IF NOT EXISTS vector and declare "
            "the column dimensionality explicitly, for example vector(768) [1].\n\n"
            "Order by the cosine distance operator <=> and LIMIT k to return the k nearest "
            "chunks for a query vector [1].\n\n"
            "The pooled Neon connection string multiplexes clients through PgBouncer in "
            "transaction mode, which does not preserve session state across transactions [2].\n"
        ),
        gold={1: "supported", 2: "supported"},
    ),
    CitationCase(
        name="invented-pgvector-api",
        sources=("neon/pgvector on Neon: Storing and Searching Embeddings",),
        tutorial=(
            "Schedule maintenance by calling vector.autotune(rebuild => true), which pgvector "
            "runs nightly to recompact quantized centroids without downtime [1].\n"
        ),
        gold={1: "unsupported"},
    ),
    CitationCase(
        name="extrapolated-throughput-claim",
        sources=("neon/pgvector on Neon: Storing and Searching Embeddings",),
        tutorial=(
            "Because an HNSW index accelerates approximate nearest-neighbor search, one Neon "
            "compute comfortably serves millions of simultaneous chat users at sub-millisecond "
            "p99 latency under sustained production traffic [1].\n"
        ),
        gold={1: "partial"},
    ),
    CitationCase(
        name="fastapi-streaming-with-stray-marker",
        sources=(
            "fastapi/StreamingResponse for Incremental Output",
            "fastapi/CORS Middleware",
        ),
        tutorial=(
            "Pass a generator to StreamingResponse with media_type application/x-ndjson so each "
            "yielded chunk is written to the response as one newline-delimited JSON object the "
            "client can parse independently [1].\n\n"
            "Register CORSMiddleware with explicit allow_origins rather than '*' when "
            "credentials are involved, and preflight OPTIONS requests are answered "
            "automatically [2].\n\n"
            "StreamingResponse additionally retries failed chunks and resumes the stream after "
            "a dropped connection [9].\n"
        ),
        gold={1: "supported", 2: "supported"},
    ),
    CitationCase(
        name="express-invented-caching",
        sources=("express/Routing and Routers",),
        tutorial=(
            "Express deduplicates identical concurrent requests to the same route and memoizes "
            "the serialized payload for sixty seconds before revalidating it [1].\n"
        ),
        gold={1: "unsupported"},
    ),
    CitationCase(
        name="express-middleware-grounded",
        sources=("express/Middleware Pipeline",),
        tutorial=(
            "Register the built-in express.json() body parser before any route that reads "
            "req.body, and mount the cors package for a Vite frontend origin [1].\n"
        ),
        gold={1: "supported"},
    ),
)
