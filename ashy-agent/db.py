import os
import psycopg2
import psycopg2.extras
from dotenv import load_dotenv
from urllib.parse import urlparse, unquote

load_dotenv()

def get_connection():
    raw_url = os.getenv("DATABASE_URL", "")
    if not raw_url:
        raise ValueError("DATABASE_URL is not set in .env")

    parsed = urlparse(raw_url)
    return psycopg2.connect(
        host=parsed.hostname,
        port=parsed.port or 5432,
        dbname=parsed.path.lstrip("/"),
        user=parsed.username,
        password=unquote(parsed.password or ""),
        sslmode="require",
        cursor_factory=psycopg2.extras.RealDictCursor,
    )

def query(sql: str, params: tuple = ()) -> list[dict]:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            return [dict(row) for row in cur.fetchall()]
    finally:
        conn.close()

def execute(sql: str, params: tuple = ()) -> None:
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute(sql, params)
        conn.commit()
    finally:
        conn.close()
