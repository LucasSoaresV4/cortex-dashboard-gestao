import { DEFAULT_ECONOMICS_CONFIG, getEconomicsData, type EconomicsConfig } from "../../../worker/economics-data";
import { databaseEnv, queryRows } from "../../../worker/database";

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

function config() {
  return databaseEnv();
}

function denied(request: Request) {
  if (authorized(request)) return null;
  return json({ error: process.env.REMUNERACAO_ADMIN_TOKEN ? "Acesso administrativo inválido" : "Configure REMUNERACAO_ADMIN_TOKEN para liberar o Economics fora do ambiente local" }, process.env.REMUNERACAO_ADMIN_TOKEN ? 401 : 503);
}

export async function GET(request: Request) {
  const access = denied(request); if (access) return access;
  const env = config(); if (!env) return json({ error: "Integração não configurada" }, 503);
  const period = new URL(request.url).searchParams.get("period") || undefined;
  if (period && !/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) return json({ error: "Período inválido" }, 400);
  try { return json(await getEconomicsData(env, period)); }
  catch (error) { console.error("Economics query failed", error); return json({ error: "Não foi possível calcular os indicadores de Economics" }, 502); }
}

export async function PATCH(request: Request) {
  const access = denied(request); if (access) return access;
  const env = config(); if (!env) return json({ error: "Integração não configurada" }, 503);
  try {
    const body = await request.json() as Partial<EconomicsConfig>;
    const values = Object.fromEntries(Object.keys(DEFAULT_ECONOMICS_CONFIG).map(key => [key, Number(body[key as keyof EconomicsConfig])]));
    if (Object.values(values).some(value => !Number.isFinite(value) || value < 0)) return json({ error: "Todos os parâmetros devem ser números positivos" }, 400);
    if (values.imposto_percentual + values.royalties_percentual >= 100) return json({ error: "Impostos e royalties devem somar menos de 100%" }, 400);
    if (!(values.cluster_small_ate <= values.cluster_medium_ate && values.cluster_medium_ate <= values.cluster_large_ate)) return json({ error: "As faixas dos clusters precisam estar em ordem crescente" }, 400);
    if (env.PG_HOST) {
      const keys = Object.keys(DEFAULT_ECONOMICS_CONFIG);
      const parameters = keys.map(key => values[key]);
      const assignments = keys.map((key, index) => `"${key}" = $${index + 1}`).join(", ");
      const updates = keys.map(key => `"${key}" = excluded."${key}"`).join(", ");
      const rows = await queryRows(env, `insert into "${env.PG_SCHEMA || "public"}"."economics_config" (id, ${keys.map(key => `"${key}"`).join(", ")}, updated_at) values (1, ${parameters.map((_, index) => `$${index + 1}`).join(", ")}, now()) on conflict (id) do update set ${updates}, updated_at = now() returning *`, parameters);
      return json({ config: rows[0] });
    }
    const response = await fetch(new URL("/rest/v1/economics_config?on_conflict=id", env.TFHUB_SUPABASE_URL), { method: "POST", headers: { apikey: env.TFHUB_SUPABASE_SECRET_KEY!, Authorization: `Bearer ${env.TFHUB_SUPABASE_SECRET_KEY}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify({ id: 1, ...values, updated_at: new Date().toISOString() }) });
    if (!response.ok) throw new Error(`Supabase config failed with ${response.status}`);
    return json({ config: (await response.json())[0] });
  } catch (error) { console.error("Economics config update failed", error); return json({ error: "Não foi possível salvar os parâmetros do Economics. Confirme se a migration foi aplicada." }, 502); }
}
