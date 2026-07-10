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
    # ---------------- React + Vite ----------------
    {
        "framework_name": "react-vite",
        "section_title": "Dev Server, HMR and Fast Refresh",
        "doc_url": "https://vite.dev/guide/features",
        "raw_content": (
            "Vite serves source files over native ES modules, transforming them on demand "
            "instead of bundling the whole app up front — so dev server start is near-instant "
            "regardless of project size. Dependencies are pre-bundled once with esbuild. Hot "
            "Module Replacement swaps edited modules in place, and the React plugin adds Fast "
            "Refresh so component edits apply without losing component state. Production "
            "builds go through Rollup instead, so dev and prod use different pipelines: "
            "always smoke-test the built output with vite preview before shipping, since "
            "dev-only behavior (like unbundled import order) can differ."
        ),
    },
    {
        "framework_name": "react-vite",
        "section_title": "Env Variables and Modes",
        "doc_url": "https://vite.dev/guide/env-and-mode",
        "raw_content": (
            "Vite loads .env, .env.local and .env.[mode] files and exposes variables to "
            "client code via import.meta.env — but only those prefixed with VITE_. Values "
            "are statically replaced at build time, so changing them requires a rebuild. "
            "Because a Vite SPA ships entirely to the browser, there is no server-only "
            "place for secrets: API keys and database URLs must live in a backend service, "
            "and the frontend should only hold public configuration like VITE_API_URL "
            "pointing at that backend. Built-in constants import.meta.env.DEV and .PROD "
            "distinguish dev server from production build."
        ),
    },
    {
        "framework_name": "react-vite",
        "section_title": "Proxying API Requests in Development",
        "doc_url": "https://vite.dev/config/server-options.html#server-proxy",
        "raw_content": (
            "server.proxy in vite.config.ts forwards matching dev-server paths to a backend, "
            "e.g. proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: true } }. "
            "The browser then only ever talks to the Vite origin (localhost:5173), so no CORS "
            "configuration is needed during development. rewrite can strip or remap the path "
            "prefix if the backend routes differ. The proxy exists only in the dev server: in "
            "production the same effect needs either a reverse proxy serving frontend and API "
            "from one origin, or CORS headers on the API for the frontend's deployed origin."
        ),
    },
    {
        "framework_name": "react-vite",
        "section_title": "Building for Production and SPA Fallback",
        "doc_url": "https://vite.dev/guide/build",
        "raw_content": (
            "vite build emits an optimized static bundle to dist/ using Rollup: code-split "
            "chunks, hashed filenames for long-term caching, and CSS extraction. The result "
            "is plain static files deployable to any static host or CDN — no Node server "
            "required. For apps using client-side routing (React Router), the host must "
            "rewrite unknown paths to index.html, otherwise deep links 404 on refresh. The "
            "base config option sets the public path when deploying under a sub-path. Use "
            "vite preview to serve the production build locally for a final check."
        ),
    },
    # ---------------- Node.js + Express ----------------
    {
        "framework_name": "express",
        "section_title": "Routing and Routers",
        "doc_url": "https://expressjs.com/en/guide/routing.html",
        "raw_content": (
            "Express maps HTTP methods and paths to handler functions: app.get('/users/:id', "
            "handler) captures path segments in req.params, with query strings parsed into "
            "req.query. Routes match in registration order, so put specific routes before "
            "catch-alls. express.Router() creates modular, mountable route groups — define "
            "user routes in their own router and attach it with app.use('/api/users', "
            "router), keeping large APIs organized by resource. A handler that neither sends "
            "a response nor calls next() leaves the request hanging; always end with res.json, "
            "res.send, res.status().end() or next()."
        ),
    },
    {
        "framework_name": "express",
        "section_title": "Middleware Pipeline",
        "doc_url": "https://expressjs.com/en/guide/using-middleware.html",
        "raw_content": (
            "Nearly everything in Express is middleware: functions (req, res, next) executed "
            "in the order they are registered with app.use or on individual routes. Built-in "
            "express.json() parses JSON bodies into req.body and must be registered before "
            "routes that read it. Cross-origin browsers need the cors package: "
            "app.use(cors({ origin: 'http://localhost:5173' })) for a Vite frontend. "
            "Middleware either ends the response or calls next() to pass control on; "
            "ordering bugs (auth after routes, body parser after handlers) are the most "
            "common Express mistakes. Router-level middleware scopes concerns like auth "
            "to one mounted router."
        ),
    },
    {
        "framework_name": "express",
        "section_title": "Error Handling",
        "doc_url": "https://expressjs.com/en/guide/error-handling.html",
        "raw_content": (
            "Express error handlers are middleware with four arguments: (err, req, res, "
            "next), registered after all routes. Synchronous throws are caught "
            "automatically; in Express 5, rejected promises from async handlers are also "
            "forwarded to error middleware automatically, while Express 4 required calling "
            "next(err) manually or a wrapper like express-async-errors. A central error "
            "handler should map known error types to status codes, log the full error "
            "server-side, and return a sanitized JSON body — never leak stack traces in "
            "production. If headers were already sent, delegate to the default handler "
            "with next(err)."
        ),
    },
    {
        "framework_name": "express",
        "section_title": "Production Best Practices",
        "doc_url": "https://expressjs.com/en/advanced/best-practice-performance.html",
        "raw_content": (
            "Run with NODE_ENV=production: it enables view caching and faster behavior "
            "worth roughly 3x throughput in Express itself. Never block the single-threaded "
            "event loop — avoid synchronous fs/crypto APIs in handlers. Use a process "
            "manager (PM2, systemd) or the cluster module to use all CPU cores and restart "
            "on crashes. Offload gzip compression and TLS to a reverse proxy like Nginx "
            "when possible. Handle uncaught rejections by crashing and restarting rather "
            "than continuing in an unknown state, and add security headers with helmet."
        ),
    },
    # ---------------- Django ----------------
    {
        "framework_name": "django",
        "section_title": "URL Dispatcher and Views",
        "doc_url": "https://docs.djangoproject.com/en/5.2/topics/http/urls/",
        "raw_content": (
            "Django routes requests through URLconf modules: urlpatterns lists of path() "
            "entries mapping URL patterns to view callables, with typed converters like "
            "<int:pk> passed as keyword arguments to the view. include() composes per-app "
            "URLconfs into the project URLconf, keeping apps reusable. Views take an "
            "HttpRequest and return an HttpResponse (or JsonResponse for APIs); "
            "class-based views like ListView and DetailView package common patterns. "
            "Naming routes with name= and reversing them with reverse()/url template tags "
            "keeps URLs refactorable — hardcoded paths are the thing to avoid."
        ),
    },
    {
        "framework_name": "django",
        "section_title": "The ORM and QuerySets",
        "doc_url": "https://docs.djangoproject.com/en/5.2/topics/db/queries/",
        "raw_content": (
            "Django models are Python classes mapped to tables; Model.objects returns a "
            "manager whose filter(), exclude() and get() build QuerySets. QuerySets are "
            "lazy — no SQL runs until iteration, slicing or len() — and chainable, so views "
            "can compose filters conditionally. Field lookups use double underscores: "
            "filter(author__name__icontains='ada'), spanning relations with joins. The "
            "classic performance trap is N+1 queries when looping over related objects: "
            "select_related() (SQL join for foreign keys) and prefetch_related() (separate "
            "query for many-to-many) fetch relations up front. Aggregation uses annotate() "
            "and aggregate() with Count, Sum and friends."
        ),
    },
    {
        "framework_name": "django",
        "section_title": "Migrations",
        "doc_url": "https://docs.djangoproject.com/en/5.2/topics/migrations/",
        "raw_content": (
            "Django derives schema changes from model code: makemigrations diffs models "
            "against migration history and writes migration files; migrate applies them to "
            "the database, recording state in the django_migrations table. Migration files "
            "are code — commit them to version control and review them like any other "
            "change. RunPython operations handle data migrations (backfills) alongside "
            "schema changes. Because each migration depends on its predecessors, parallel "
            "branches can conflict; makemigrations --merge resolves divergent histories. "
            "Test destructive migrations against realistic data (a database branch or "
            "staging copy) before running them in production."
        ),
    },
    {
        "framework_name": "django",
        "section_title": "Settings and Environment Configuration",
        "doc_url": "https://docs.djangoproject.com/en/5.2/topics/settings/",
        "raw_content": (
            "All Django configuration lives in the settings module named by "
            "DJANGO_SETTINGS_MODULE. Secrets (SECRET_KEY, database credentials) should be "
            "read from environment variables rather than hardcoded, e.g. via os.environ or "
            "a .env loader, with different settings files or env overlays per environment. "
            "DEBUG=True must never ship to production: it exposes detailed error pages and "
            "disables ALLOWED_HOSTS checking. ALLOWED_HOSTS lists the domains the app may "
            "serve. Access settings via django.conf.settings instead of importing the "
            "module directly, so overrides and test settings keep working."
        ),
    },
    # ---------------- Combo: FastAPI + Vite ----------------
    {
        "framework_name": "fastapi-vite",
        "section_title": "Wiring a Vite Frontend to a FastAPI Backend",
        "doc_url": "https://fastapi.tiangolo.com/tutorial/cors/",
        "raw_content": (
            "The FastAPI + Vite stack runs two dev servers: Vite on localhost:5173 serving "
            "the React app, uvicorn on localhost:8000 serving the API. Bridge them one of "
            "two ways: add CORSMiddleware to FastAPI allowing the Vite origin, or configure "
            "Vite's server.proxy to forward /api requests to :8000 so the browser sees a "
            "single origin. The frontend reads the deployed API base URL from a VITE_API_URL "
            "env variable; secrets stay on the FastAPI side. FastAPI's automatic OpenAPI "
            "schema at /openapi.json doubles as the API contract — TypeScript client types "
            "can be generated from it so both codebases stay in sync."
        ),
    },
    {
        "framework_name": "fastapi-vite",
        "section_title": "Serving the Vite Build from FastAPI",
        "doc_url": "https://fastapi.tiangolo.com/tutorial/static-files/",
        "raw_content": (
            "For single-origin deployments, FastAPI can serve the compiled frontend: mount "
            "StaticFiles(directory='dist', html=True) at '/' AFTER registering API routes, "
            "so /api/* keeps resolving to endpoints while everything else falls through to "
            "the SPA's index.html. html=True makes the mount serve index.html for the root; "
            "client-side routes still need a catch-all that returns index.html so deep "
            "links survive refresh. This collapses the deployment to one process and "
            "removes CORS entirely — the trade-off is coupling frontend releases to "
            "backend deploys and giving up CDN edge caching for static assets."
        ),
    },
    {
        "framework_name": "fastapi-vite",
        "section_title": "When to Choose FastAPI + Vite: Strengths and Trade-offs",
        "doc_url": "https://fastapi.tiangolo.com/alternatives/",
        "raw_content": (
            "FastAPI + Vite is a decoupled SPA-plus-API architecture. Strengths: the backend "
            "gets Python's ecosystem (ML, data science, async SQL), Pydantic validation and "
            "auto-generated OpenAPI docs; the frontend gets Vite's fastest-in-class dev "
            "loop; the two deploy and scale independently, and the API is reusable by "
            "mobile or third-party clients from day one. Trade-offs: two codebases in two "
            "languages with duplicated types unless you generate clients from OpenAPI; "
            "CORS and auth (cookie vs bearer-token) complexity; and no server-side "
            "rendering — first paint waits for the JS bundle and SEO needs extra work, "
            "which is where full-stack SSR frameworks like Next.js have the edge."
        ),
    },
    {
        "framework_name": "fastapi-vite",
        "section_title": "Deploying the Decoupled Pair",
        "doc_url": "https://fastapi.tiangolo.com/deployment/concepts/",
        "raw_content": (
            "The natural deployment splits the pair: the Vite build's dist/ goes to a "
            "static host or CDN (Vercel, Netlify, Cloudflare Pages) while FastAPI runs as a "
            "server process — uvicorn behind a process manager or gunicorn with uvicorn "
            "workers — on a host like Render, Fly.io or a container platform. The frontend "
            "build bakes in VITE_API_URL pointing at the API's public URL, and the API's "
            "CORS allowlist must include the frontend's deployed origin. Give the API a "
            "/health endpoint for the platform's checks, terminate HTTPS at the platform "
            "proxy, and remember replication: run multiple workers or instances since one "
            "async process still has one event loop."
        ),
    },
    # ---------------- Combo: Next.js + Node.js (full-stack) ----------------
    {
        "framework_name": "nextjs-fullstack",
        "section_title": "One Codebase, Two Halves: Server Actions and Route Handlers",
        "doc_url": "https://nextjs.org/docs/app/getting-started/mutating-data",
        "raw_content": (
            "Next.js makes Node.js the backend without a separate server project. Server "
            "Actions — async functions marked 'use server' — are called from components "
            "like ordinary functions but execute on the server, covering form submissions "
            "and mutations without hand-writing fetch calls or API endpoints; Next.js "
            "handles the wire format and revalidation (revalidatePath/revalidateTag). "
            "Route Handlers remain the tool for public HTTP APIs consumed by external "
            "clients. Because frontend and backend share one TypeScript project, request "
            "and response types flow end-to-end with no OpenAPI generation step — the "
            "compiler is the API contract."
        ),
    },
    {
        "framework_name": "nextjs-fullstack",
        "section_title": "Running Next.js on a Node.js Server",
        "doc_url": "https://nextjs.org/docs/app/getting-started/deploying",
        "raw_content": (
            "Next.js deploys two main ways. On serverless platforms like Vercel, each "
            "route becomes an isolated function — zero-ops scaling, but execution time "
            "limits and cold starts constrain long-running work. Self-hosting runs next "
            "build then next start as a persistent Node.js server; output: 'standalone' "
            "emits a minimal server bundle ideal for Docker images. A persistent Node "
            "process supports long-lived connections and background work that serverless "
            "cannot, at the cost of managing scaling yourself. Either way the same "
            "codebase serves SSR pages, Server Actions and API routes — one deploy "
            "artifact for the whole app."
        ),
    },
    {
        "framework_name": "nextjs-fullstack",
        "section_title": "When to Choose Next.js Full-Stack: Strengths and Trade-offs",
        "doc_url": "https://nextjs.org/docs/app",
        "raw_content": (
            "Next.js as a full-stack framework means one language, one repository and one "
            "deployment for UI and API. Strengths: server-side rendering and streaming "
            "give fast first paint and strong SEO out of the box; no CORS since frontend "
            "and API share an origin; TypeScript types shared end-to-end; Server "
            "Components keep data access and secrets off the client. Trade-offs: the "
            "backend is locked to the JavaScript runtime — CPU-heavy or Python-ecosystem "
            "work (ML inference, data pipelines) fits a dedicated service better; the API "
            "is not naturally reusable by mobile or third-party clients the way a "
            "standalone REST service is; and you are committed to React and to the App "
            "Router's caching model, which has a real learning curve."
        ),
    },
    {
        "framework_name": "nextjs-fullstack",
        "section_title": "Pairing Next.js with a Separate Node.js API via Rewrites",
        "doc_url": "https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites",
        "raw_content": (
            "When the backend outgrows Route Handlers — WebSockets, heavy background jobs, "
            "or a team that wants an independent API service — Next.js pairs cleanly with "
            "a separate Node.js server (Express or Fastify). rewrites() in next.config "
            "proxies paths like /api/:path* to the external API's URL, so the browser "
            "still sees a single origin and no CORS setup is needed, while the API "
            "deploys and scales on its own. This is the incremental escape hatch: start "
            "full-stack in one Next.js app, then extract hot endpoints to the standalone "
            "service without changing frontend code. Rewrites are invisible to the "
            "client, unlike redirects, and can also route by header or cookie."
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
                print(f"  [{i:2}/{len(DOCS)}] {doc['framework_name']:16} - {doc['section_title']}")
        conn.commit()
    print("Done. The /api/masterclass endpoint is ready to retrieve.")


if __name__ == "__main__":
    main()
