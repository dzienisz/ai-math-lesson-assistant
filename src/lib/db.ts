import { Pool } from "@neondatabase/serverless";

// Neon serverless Postgres client (Pool supports parameterized queries)
function getPool(): Pool {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL environment variable is not set");
  }
  return new Pool({ connectionString: url });
}

let _pool: Pool | null = null;

export function pool(): Pool {
  if (!_pool) {
    _pool = getPool();
  }
  return _pool;
}

// Helper: execute a parameterized query and return typed rows
export async function query<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const { rows } = await pool().query(text, params);
  return rows as T[];
}

// Helper: execute a query and return the first row or null
export async function queryOne<T = Record<string, unknown>>(
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
