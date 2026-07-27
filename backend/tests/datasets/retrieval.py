"""Golden retrieval set: learning goals labelled with the corpus chunks that
should come back for them.

Labels are `framework_name/section_title` keys into the seed corpus. Each case
is phrased the way the agent's planner phrases things — doc-section topics
rather than questions — because that is what actually reaches the retriever.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class RetrievalCase:
    query: str
    scope: str | tuple[str, ...] | None
    relevant: tuple[str, ...]
    note: str = ""

    @property
    def db_scope(self) -> str | list[str] | None:
        return list(self.scope) if isinstance(self.scope, tuple) else self.scope


RETRIEVAL_CASES: tuple[RetrievalCase, ...] = (
    # ---- Neon ----
    RetrievalCase(
        query="pgvector cosine distance operator and HNSW index for embeddings",
        scope="neon",
        relevant=("neon/pgvector on Neon: Storing and Searching Embeddings",),
    ),
    RetrievalCase(
        query="connection pooling pgbouncer transaction mode serverless compute",
        scope="neon",
        relevant=("neon/Serverless Connections and Pooling",),
    ),
    RetrievalCase(
        query="row level security policy tenant isolation current_setting",
        scope="neon",
        relevant=("neon/Row-Level Security for Multi-Tenant Data",),
    ),
    RetrievalCase(
        query="database branching copy-on-write fork per CI run",
        scope="neon",
        relevant=("neon/Database Branching for Safe Iteration",),
    ),
    # ---- FastAPI ----
    RetrievalCase(
        query="StreamingResponse generator ndjson incremental output",
        scope="fastapi",
        relevant=("fastapi/StreamingResponse for Incremental Output",),
    ),
    RetrievalCase(
        query="CORSMiddleware allow_origins preflight OPTIONS browser",
        scope="fastapi",
        relevant=("fastapi/CORS Middleware",),
    ),
    RetrievalCase(
        query="pydantic BaseModel request body validation 422 errors",
        scope="fastapi",
        relevant=("fastapi/Path Operations and Pydantic Models",),
    ),
    RetrievalCase(
        query="load_dotenv environment variables settings configuration",
        scope="fastapi",
        relevant=("fastapi/Settings and Environment Configuration",),
    ),
    # ---- Next.js ----
    RetrievalCase(
        query="route handlers route.ts server-only request handlers",
        scope="nextjs",
        relevant=("nextjs/Route Handlers — Next.js App Router",),
    ),
    RetrievalCase(
        query="NEXT_PUBLIC_ prefix env variables client boundary secrets",
        scope="nextjs",
        relevant=("nextjs/Environment Variables and the Client Boundary",),
    ),
    RetrievalCase(
        query="Suspense boundary loading.tsx streaming server rendered UI",
        scope="nextjs",
        relevant=("nextjs/Streaming with Suspense and loading.tsx",),
    ),
    RetrievalCase(
        query="react server components async data fetching use client directive",
        scope="nextjs",
        relevant=("nextjs/Server Components and Data Fetching",),
    ),
    # ---- React + Vite ----
    RetrievalCase(
        query="server.proxy vite.config forward /api to backend in development",
        scope="react-vite",
        relevant=("react-vite/Proxying API Requests in Development",),
    ),
    RetrievalCase(
        query="import.meta.env VITE_ prefix statically replaced at build time",
        scope="react-vite",
        relevant=("react-vite/Env Variables and Modes",),
    ),
    RetrievalCase(
        query="hot module replacement fast refresh native ES modules dev server",
        scope="react-vite",
        relevant=("react-vite/Dev Server, HMR and Fast Refresh",),
    ),
    # ---- Express ----
    RetrievalCase(
        query="error handling middleware four arguments next(err) status codes",
        scope="express",
        relevant=("express/Error Handling",),
    ),
    RetrievalCase(
        query="express.Router mountable route groups req.params path segments",
        scope="express",
        relevant=("express/Routing and Routers",),
    ),
    # ---- Django ----
    RetrievalCase(
        query="select_related prefetch_related N+1 queryset lazy evaluation",
        scope="django",
        relevant=("django/The ORM and QuerySets",),
    ),
    RetrievalCase(
        query="makemigrations migrate django_migrations schema history",
        scope="django",
        relevant=("django/Migrations",),
    ),
    # ---- Combo stacks ----
    RetrievalCase(
        query="mount StaticFiles dist html=True single origin SPA fallback",
        scope="fastapi-vite",
        relevant=("fastapi-vite/Serving the Vite Build from FastAPI",),
    ),
    RetrievalCase(
        query="server actions use server mutations revalidatePath",
        scope="nextjs-fullstack",
        relevant=("nextjs-fullstack/One Codebase, Two Halves: Server Actions and Route Handlers",),
    ),
    # ---- Multi-stack scope (comparison mode) ----
    RetrievalCase(
        query="strengths and trade-offs of a decoupled SPA plus API versus full-stack SSR",
        scope=("fastapi-vite", "nextjs-fullstack"),
        relevant=(
            "fastapi-vite/When to Choose FastAPI + Vite: Strengths and Trade-offs",
            "nextjs-fullstack/When to Choose Next.js Full-Stack: Strengths and Trade-offs",
        ),
        note="comparison mode must surface evidence from both sides",
    ),
    # ---- Unscoped search (comparison mode without an explicit challenger) ----
    RetrievalCase(
        query="pgvector embedding vector column cosine similarity search postgres",
        scope=None,
        relevant=("neon/pgvector on Neon: Storing and Searching Embeddings",),
        note="unscoped search must still rank the right stack's chunk first",
    ),
    RetrievalCase(
        query="cross-origin resource sharing headers for a browser frontend",
        scope=None,
        relevant=(
            "fastapi/CORS Middleware",
            "express/Middleware Pipeline",
            "react-vite/Proxying API Requests in Development",
            "fastapi-vite/Wiring a Vite Frontend to a FastAPI Backend",
        ),
        note="several stacks legitimately answer this one",
    ),
)
