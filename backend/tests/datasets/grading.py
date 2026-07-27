"""Golden grading set: a learning goal plus candidate chunks labelled
keep (relevant enough to cite) or drop (off-topic for this goal).

The candidates deliberately mix near-misses from the same stack with obvious
off-stack noise — a grader that keeps everything scores well on recall and
badly on precision, which is exactly the failure this set is here to catch.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class GradingCase:
    goal: str
    keep: tuple[str, ...]
    drop: tuple[str, ...]

    @property
    def candidates(self) -> tuple[str, ...]:
        """Keep/drop interleaved so ordering carries no signal."""
        merged: list[str] = []
        for pair in zip(self.keep, self.drop):
            merged.extend(pair)
        merged.extend(self.keep[len(self.drop):])
        merged.extend(self.drop[len(self.keep):])
        return tuple(merged)

    def gold(self, key: str) -> bool:
        return key in self.keep


GRADING_CASES: tuple[GradingCase, ...] = (
    GradingCase(
        goal="Stream LLM tokens from a FastAPI endpoint to the browser as they are generated",
        keep=("fastapi/StreamingResponse for Incremental Output",),
        drop=(
            "fastapi/Settings and Environment Configuration",
            "django/Migrations",
            "neon/Database Branching for Safe Iteration",
        ),
    ),
    GradingCase(
        goal="Store and search document embeddings in Postgres with pgvector",
        keep=(
            "neon/pgvector on Neon: Storing and Searching Embeddings",
            "neon/Serverless Connections and Pooling",
        ),
        drop=(
            "neon/Row-Level Security for Multi-Tenant Data",
            "express/Production Best Practices",
        ),
    ),
    GradingCase(
        goal="Keep a database connection string out of the browser bundle in a Next.js app",
        keep=(
            "nextjs/Environment Variables and the Client Boundary",
            "nextjs/Route Handlers — Next.js App Router",
            "nextjs/Server Components and Data Fetching",
        ),
        drop=(
            "nextjs/Streaming with Suspense and loading.tsx",
            "django/URL Dispatcher and Views",
        ),
    ),
    GradingCase(
        goal="Fix N+1 queries when a Django view lists objects with their related rows",
        keep=("django/The ORM and QuerySets",),
        drop=(
            "django/Settings and Environment Configuration",
            "react-vite/Building for Production and SPA Fallback",
            "fastapi/CORS Middleware",
        ),
    ),
    GradingCase(
        goal="Call a FastAPI backend from a Vite dev server without CORS errors",
        keep=(
            "react-vite/Proxying API Requests in Development",
            "fastapi/CORS Middleware",
            "fastapi-vite/Wiring a Vite Frontend to a FastAPI Backend",
        ),
        drop=(
            "neon/Row-Level Security for Multi-Tenant Data",
            "django/Migrations",
        ),
    ),
    GradingCase(
        goal="Decide between a decoupled Vite SPA plus API and a full-stack Next.js app for SEO",
        keep=(
            "fastapi-vite/When to Choose FastAPI + Vite: Strengths and Trade-offs",
            "nextjs-fullstack/When to Choose Next.js Full-Stack: Strengths and Trade-offs",
        ),
        drop=(
            "express/Error Handling",
            "neon/Serverless Connections and Pooling",
        ),
    ),
)
