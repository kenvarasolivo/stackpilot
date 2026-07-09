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


def get_relevant_docs(framework: str, query_text: str, limit: int = 4) -> list[dict]:
    """Embed the query with Gemini, then cosine-search framework_docs on Neon.

    Rows include the table id and the cosine distance so the agent can
    dedupe across multiple search queries and report relevance scores.
    """
    query_embedding = embed_text(query_text)
    vector = to_vector_literal(query_embedding)
    with get_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, section_title, doc_url, raw_content,
                   embedding <=> %s::vector AS distance
            FROM framework_docs
            WHERE framework_name = %s
            ORDER BY embedding <=> %s::vector
            LIMIT %s;
            """,
            (vector, framework, vector, limit),
        )
        return cur.fetchall()
