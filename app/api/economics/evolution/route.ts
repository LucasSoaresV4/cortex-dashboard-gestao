import { getEconomicsYearData } from "../../../../worker/economics-data";
import { databaseEnv } from "../../../../worker/database";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { "cache-control": "private, no-store", "x-content-type-options": "nosniff" } });
}

function authorized(request: Request) {
  const hostname = new URL(request.url).hostname;
  const isLocal = ["127.0.0.1", "localhost", "::1"].includes(hostname);
  const token = process.env.REMUNERACAO_ADMIN_TOKEN;
  return token ? request.headers.get("x-remuneracao-admin-token") === token : isLocal;
}

export async function GET(request: Request) {
  if (!authorized(request)) return json({ error: process.env.REMUNERACAO_ADMIN_TOKEN ? "Acesso administrativo inválido" : "Configure REMUNERACAO_ADMIN_TOKEN para liberar o Economics fora do ambiente local" }, process.env.REMUNERACAO_ADMIN_TOKEN ? 401 : 503);
  const year = Number(new URL(request.url).searchParams.get("year"));
  if (!Number.isInteger(year) || year < 2000 || year > 2100) return json({ error: "Ano inválido" }, 400);
  const env = databaseEnv();
  if (!env) return json({ error: "Integração não configurada" }, 503);
  try {
    const months = await getEconomicsYearData(env, year);
    return json({ year, months });
  } catch (error) {
    console.error("Economics evolution query failed", error);
    return json({ error: "Não foi possível calcular a evolução mensal do Economics" }, 502);
  }
}
