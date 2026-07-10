"""Neon Postgres access via psycopg: connection factory + RAG retrieval."""

import os

import psycopg
from psycopg.rows import dict_row

from gemini_service import embed_text


def get_connection() -> psycopg.Connection:
    url = os.environ.get("DATABASE_URL", "").strip()
    if not url:
        raise RuntimeError(
            "DATABASE_URL is not set. Add your Neon connection string to the .env "
            "file in the workspace root, then run `python seed.py` once."
        )
    return psycopg.connect(url, row_factory=dict_row)


def to_vector_literal(embedding: list[float]) -> str:
    """pgvector accepts a '[f1,f2,...]' text literal cast with ::vector."""
    return "[" + ",".join(f"{v:.8f}" for v in embedding) + "]"


def get_relevant_docs(
    framework: str | list[str] | None, query_text: str, limit: int = 4
) -> list[dict]:
    """Embed the query with Gemini, then cosine-search framework_docs on Neon.

    framework scopes the search: a single stack key, a list of keys (comparison
    mode — evidence needed from both sides, e.g. FastAPI + Vite vs Next.js), or
    None to search ALL stacks. Rows include the table id and the cosine distance
    so the agent can dedupe across multiple search queries and report scores.
    """
    query_embedding = embed_text(query_text)
    vector = to_vector_literal(query_embedding)
    if framework is None:
        where = ""
    elif isinstance(framework, str):
        where = "WHERE framework_name = %(framework)s"
    else:
        where = "WHERE framework_name = ANY(%(framework)s)"
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT id, framework_name, section_title, doc_url, raw_content,
                   embedding <=> %(vector)s::vector AS distance
            FROM framework_docs
            {where}
            ORDER BY embedding <=> %(vector)s::vector
            LIMIT %(limit)s;
            """,
            {"vector": vector, "framework": framework, "limit": limit},
        )
        return cur.fetchall()
