import postgres from "postgres";

export type DatabaseEnv = {
  TFHUB_SUPABASE_URL?: string;
  TFHUB_SUPABASE_SECRET_KEY?: string;
  PG_HOST?: string;
  PG_PORT?: string;
  PG_DB?: string;
  PG_USER?: string;
  PG_PASSWORD?: string;
  PG_SCHEMA?: string;
  PG_SSLMODE?: string;
  PG_REQUEST_ID?: string;
};

type Row = Record<string, unknown>;

export function databaseEnv(): DatabaseEnv | null {
  const pg = { PG_HOST: process.env.PG_HOST, PG_PORT: process.env.PG_PORT, PG_DB: process.env.PG_DB, PG_USER: process.env.PG_USER, PG_PASSWORD: process.env.PG_PASSWORD, PG_SCHEMA: process.env.PG_SCHEMA, PG_SSLMODE: process.env.PG_SSLMODE };
  if (pg.PG_HOST && pg.PG_DB && pg.PG_USER && pg.PG_PASSWORD) return pg;
  const rest = { TFHUB_SUPABASE_URL: process.env.TFHUB_SUPABASE_URL, TFHUB_SUPABASE_SECRET_KEY: process.env.TFHUB_SUPABASE_SECRET_KEY };
  return rest.TFHUB_SUPABASE_URL && rest.TFHUB_SUPABASE_SECRET_KEY ? rest : null;
}

function client(env: DatabaseEnv) {
  return postgres({ host: env.PG_HOST, port: Number(env.PG_PORT || 5432), database: env.PG_DB, username: env.PG_USER, password: env.PG_PASSWORD, ssl: env.PG_SSLMODE === "disable" ? false : "require", max: 1, idle_timeout: 5, connect_timeout: 15 });
}

export async function releaseDatabase(_env: DatabaseEnv) {}

function identifier(value: string) {
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(value)) throw new Error("Identificador de banco inválido");
  return `"${value}"`;
}

export async function fetchTable(env: DatabaseEnv, table: string, columns: string, optional = false): Promise<Row[]> {
  if (env.PG_HOST) {
    const schema = env.PG_SCHEMA || "public";
    const select = columns === "*" ? "*" : columns.split(",").map(column => identifier(column.trim())).join(",");
    const sql = client(env);
    try { return await sql.unsafe(`select ${select} from ${identifier(schema)}.${identifier(table)}`) as Row[]; }
    catch (error) { if (optional && (error as { code?: string }).code === "42P01") return []; throw error; }
    finally { await sql.end({ timeout: 5 }); }
  }
  const rows: Row[] = [];
  for (let offset = 0; ; offset += 1000) {
    const url = new URL(`/rest/v1/${encodeURIComponent(table)}`, env.TFHUB_SUPABASE_URL); url.searchParams.set("select", columns);
    const response = await fetch(url, { headers: { apikey: env.TFHUB_SUPABASE_SECRET_KEY!, Authorization: `Bearer ${env.TFHUB_SUPABASE_SECRET_KEY}`, Range: `${offset}-${offset + 999}`, "Range-Unit": "items" } });
    if (!response.ok) { if (optional && response.status === 404) return []; throw new Error(`Supabase REST ${table} failed with status ${response.status}`); }
    const page = await response.json() as Row[]; rows.push(...page); if (page.length < 1000) return rows;
  }
}

export async function queryRows(env: DatabaseEnv, statement: string, parameters: unknown[] = []) {
  if (!env.PG_HOST) throw new Error("Consulta PostgreSQL indisponível");
  const sql = client(env);
  try { return await sql.unsafe(statement, parameters as never[]) as Row[]; }
  finally { await sql.end({ timeout: 5 }); }
}
