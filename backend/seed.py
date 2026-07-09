"""One-shot seeder for the Neon framework_docs table.

Creates the pgvector extension + table + HNSW index, then inserts curated
documentation chunks for each framework, embedding every chunk with
Gemini's embedding model.

Run from /backend (with .env configured):  python seed.py
Idempotent: drops and recreates the table each run.
"""

from pathlib import Path

from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent.parent / ".env")
load_dotenv()

import db
from gemini_service import EMBEDDING_DIMS, embed_text

# framework_name keys must match the frontend's framework selector values.
DOCS: list[dict] = [
    # ---------------- Next.js (App Router) ----------------
    {
        "framework_name": "nextjs",
        "section_title": "Route Handlers — Next.js App Router",
        "doc_url": "https://nextjs.org/docs/app/building-your-application/routing/route-handlers",
        "raw_content": (
            "Route Handlers let you create custom request handlers for a route using the Web "
            "Request and Response APIs. They are defined in a route.ts file inside the app "
            "directory, e.g. app/api/search/route.ts exporting async functions named after HTTP "
            "methods (GET, POST). Route Handlers run exclusively on the server: environment "
            "variables, database URLs and API keys referenced there never reach the client "
            "bundle, which makes them the right place for privileged database connections. "
            "A route.ts file cannot live at the same segment level as page.tsx. Route Handlers "
            "are not cached by default; only GET handlers can opt into caching. To read the "
            "body, call await request.json(); return responses with Response.json(data) or a "
            "streamed Response."
        ),
    },
    {
        "framework_name": "nextjs",
        "section_title": "Server Components and Data Fetching",
        "doc_url": "https://nextjs.org/docs/app/building-your-application/data-fetching",
        "raw_content": (
            "In the App Router, components are React Server Components by default. Server "
            "Components can be async and fetch data directly — including from a database — "
            "without shipping the fetching code or credentials to the browser. Client "
            "Components are opted into with the 'use client' directive and are needed for "
            "state, effects, and event handlers. A common pattern is a server layout that "
            "fetches data and passes it to interactive client leaf components as props. "
            "fetch() calls in Server Components can be deduplicated and cached; per-request "
            "dynamic data uses cache: 'no-store'. Mixing the two: a Client Component cannot "
            "import a Server Component, but can receive one as children."
        ),
    },
    {
        "framework_name": "nextjs",
        "section_title": "Streaming with Suspense and loading.tsx",
        "doc_url": "https://nextjs.org/docs/app/building-your-application/routing/loading-ui-and-streaming",
        "raw_content": (
            "The App Router supports streaming server-rendered UI. A loading.tsx file at any "
            "route segment automatically wraps the page in a React Suspense boundary and shows "
            "the fallback instantly while the segment's data resolves. Finer-grained streaming "
            "wraps individual slow components in <Suspense fallback={...}>. On the client, "
            "fetch responses can also be consumed incrementally with response.body.getReader() "
            "to render tokens as they arrive — useful for AI text streaming — accumulating "
            "chunks into state so React re-renders progressively. Combine skeleton fallbacks "
            "with streamed content to keep first paint fast while long AI generations finish."
        ),
    },
    {
        "framework_name": "nextjs",
        "section_title": "Environment Variables and the Client Boundary",
        "doc_url": "https://nextjs.org/docs/app/building-your-application/configuring/environment-variables",
        "raw_content": (
            "Next.js loads .env.local (and .env) at build and dev time. Variables are only "
            "exposed to browser code when prefixed with NEXT_PUBLIC_; everything else stays "
            "server-only. Secrets like database connection strings must never be prefixed. "
            "When the browser needs to reach a separate backend service, put the backend's "
            "public URL in NEXT_PUBLIC_API_URL and keep credentials on the backend, which "
            "should enforce CORS for the frontend origin. Restart the dev server after "
            "changing env files; values are inlined at build time for client code."
        ),
    },
    # ---------------- FastAPI ----------------
    {
        "framework_name": "fastapi",
        "section_title": "Path Operations and Pydantic Models",
        "doc_url": "https://fastapi.tiangolo.com/tutorial/body/",
        "raw_content": (
            "FastAPI declares endpoints with decorators like @app.post('/items'). Request "
            "bodies are declared as Pydantic BaseModel subclasses; FastAPI parses the JSON "
            "body, validates types and constraints (Field(min_length=1), etc.), and returns "
            "a 422 with per-field errors when validation fails. The model instance arrives as "
            "a typed function argument. Response data is serialized from returned dicts or "
            "models, and every endpoint is automatically documented in the interactive "
            "OpenAPI docs at /docs. Use separate request and response models to avoid "
            "leaking internal fields, and prefer explicit response_model on the decorator "
            "when the return type is not obvious."
        ),
    },
    {
        "framework_name": "fastapi",
        "section_title": "StreamingResponse for Incremental Output",
        "doc_url": "https://fastapi.tiangolo.com/advanced/custom-response/#streamingresponse",
        "raw_content": (
            "StreamingResponse takes a sync or async generator and writes each yielded chunk "
            "to the HTTP response as it is produced, letting clients consume long-running "
            "output (like LLM token streams) incrementally instead of waiting for the full "
            "body. Set an appropriate media_type, e.g. text/event-stream for SSE or "
            "application/x-ndjson for newline-delimited JSON, where each line is one JSON "
            "object the client can parse independently. Exceptions raised before the first "
            "yield surface as HTTP errors, but once streaming has begun the status code is "
            "already sent — so protocols should include an in-band error message format."
        ),
    },
    {
        "framework_name": "fastapi",
        "section_title": "CORS Middleware",
        "doc_url": "https://fastapi.tiangolo.com/tutorial/cors/",
        "raw_content": (
            "Browsers block cross-origin requests unless the server opts in via CORS headers. "
            "A frontend on http://localhost:3000 calling an API on http://localhost:8000 is "
            "cross-origin. FastAPI ships CORSMiddleware: app.add_middleware(CORSMiddleware, "
            "allow_origins=[...], allow_methods=[...], allow_headers=[...]). List explicit "
            "origins rather than '*' when credentials are involved. Preflight OPTIONS "
            "requests are answered automatically by the middleware. Missing CORS setup "
            "appears in the browser as a failed fetch with a console CORS error, while "
            "curl requests succeed — a classic debugging asymmetry."
        ),
    },
    {
        "framework_name": "fastapi",
        "section_title": "Settings and Environment Configuration",
        "doc_url": "https://fastapi.tiangolo.com/advanced/settings/",
        "raw_content": (
            "Configuration such as API keys and database URLs should come from environment "
            "variables, not code. python-dotenv's load_dotenv() reads a .env file into "
            "os.environ at startup; call it before importing modules that read the "
            "environment at import time. For larger apps, pydantic-settings offers typed "
            "Settings classes. Keep .env out of version control and provide a .env.example. "
            "Fail fast with a clear error message when a required variable is missing — a "
            "RuntimeError naming the variable beats a cryptic downstream connection failure."
        ),
    },
    # ---------------- Neon Postgres ----------------
    {
        "framework_name": "neon",
        "section_title": "pgvector on Neon: Storing and Searching Embeddings",
        "doc_url": "https://neon.tech/docs/extensions/pgvector",
        "raw_content": (
            "The pgvector extension adds a vector column type to Postgres for storing "
            "embeddings next to relational data. Enable it per-database with CREATE EXTENSION "
            "IF NOT EXISTS vector. Declare dimensionality explicitly, e.g. vector(768), and "
            "make sure every inserted embedding matches it. pgvector provides three distance "
            "operators: <-> (L2), <#> (negative inner product), and <=> (cosine distance). "
            "For semantic search, ORDER BY embedding <=> $query_vector LIMIT k returns the k "
            "nearest chunks. Vectors can be passed as text literals like '[0.1,0.2,...]' cast "
            "with ::vector. An HNSW index (USING hnsw (embedding vector_cosine_ops)) "
            "accelerates approximate nearest-neighbor search with high recall."
        ),
    },
    {
        "framework_name": "neon",
        "section_title": "Serverless Connections and Pooling",
        "doc_url": "https://neon.tech/docs/connect/connection-pooling",
        "raw_content": (
            "Neon separates storage and compute; compute can scale to zero, so the first "
            "connection after idle may see a cold-start delay. Neon offers two connection "
            "strings: direct, and pooled (via PgBouncer in transaction mode, host suffix "
            "-pooler). Pooled connections multiplex many clients over few Postgres backends "
            "— ideal for serverless functions — but transaction pooling does not preserve "
            "session state (SET, prepared statements, LISTEN) across transactions. Use the "
            "direct string for schema migrations and long-lived processes, and always use "
            "sslmode=require. Keep connections short-lived in request handlers: open, query, "
            "close, letting the pooler do the heavy lifting."
        ),
    },
    {
        "framework_name": "neon",
        "section_title": "Database Branching for Safe Iteration",
        "doc_url": "https://neon.tech/docs/introduction/branching",
        "raw_content": (
            "Neon branches a database the way git branches code: a branch is an instant "
            "copy-on-write fork of both schema and data. Create a branch per feature, per "
            "developer, or per CI run; each branch gets its own connection string and can be "
            "reset or deleted without touching the parent. This is the safe way to test "
            "destructive migrations, seed scripts, or embedding-model changes against "
            "realistic data before applying them to main. Branch creation is near-instant "
            "regardless of database size because unchanged pages are shared between parent "
            "and child until modified."
        ),
    },
    {
        "framework_name": "neon",
        "section_title": "Row-Level Security for Multi-Tenant Data",
        "doc_url": "https://neon.tech/docs/guides/row-level-security",
        "raw_content": (
            "Row-Level Security makes Postgres itself enforce tenant isolation. After ALTER "
            "TABLE t ENABLE ROW LEVEL SECURITY, a default-deny policy applies: no rows are "
            "visible until a CREATE POLICY grants access. Policies attach USING expressions "
            "(row visibility) and WITH CHECK expressions (write validation), commonly "
            "comparing a tenant_id column to a session setting: tenant_id = "
            "current_setting('app.tenant_id')::uuid. Set the value with SET LOCAL inside a "
            "transaction so it cannot leak across pooled connections. RLS fails closed: a "
            "forgotten filter returns zero rows instead of another tenant's data, which is "
            "the failure mode you want in a multi-tenant system."
        ),
    },
]


DDL = f"""
CREATE EXTENSION IF NOT EXISTS vector;

DROP TABLE IF EXISTS framework_docs;

CREATE TABLE framework_docs (
    id             serial PRIMARY KEY,
    framework_name text NOT NULL,
    section_title  text NOT NULL,
    doc_url        text NOT NULL,
    raw_content    text NOT NULL,
    embedding      vector({EMBEDDING_DIMS}) NOT NULL
);

CREATE INDEX framework_docs_embedding_idx
    ON framework_docs USING hnsw (embedding vector_cosine_ops);

CREATE INDEX framework_docs_framework_idx
    ON framework_docs (framework_name);
"""


def main() -> None:
    print(f"Seeding framework_docs ({len(DOCS)} chunks, {EMBEDDING_DIMS}-dim embeddings)...")
    with db.get_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(DDL)
            for i, doc in enumerate(DOCS, start=1):
                text = f"{doc['section_title']}\n\n{doc['raw_content']}"
                embedding = embed_text(text, for_storage=True)
                cur.execute(
                    """
                    INSERT INTO framework_docs
                        (framework_name, section_title, doc_url, raw_content, embedding)
                    VALUES (%s, %s, %s, %s, %s::vector);
                    """,
                    (
                        doc["framework_name"],
                        doc["section_title"],
                        doc["doc_url"],
                        doc["raw_content"],
                        db.to_vector_literal(embedding),
                    ),
                )
                print(f"  [{i:2}/{len(DOCS)}] {doc['framework_name']:8} - {doc['section_title']}")
        conn.commit()
    print("Done. The /api/masterclass endpoint is ready to retrieve.")


if __name__ == "__main__":
    main()
