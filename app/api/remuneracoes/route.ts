import { databaseEnv, queryRows, type DatabaseEnv } from "../../../worker/database";

export const dynamic = "force-dynamic";

type RemuneracaoInput = {
  investidor_id?: unknown;
  remuneracao?: unknown;
  data_inicio_vigencia?: unknown;
  data_fim_vigencia?: unknown;
};

function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });
}

function isAuthorized(request: Request) {
  const configuredToken = process.env.REMUNERACAO_ADMIN_TOKEN;
  const hostname = new URL(request.url).hostname;
  const isLocal = ["127.0.0.1", "localhost", "::1"].includes(hostname);

  if (!configuredToken) return isLocal;
  return request.headers.get("x-remuneracao-admin-token") === configuredToken;
}

async function supabaseRequest(
  config: DatabaseEnv,
  path: string,
  init: RequestInit = {},
) {
  const response = await fetch(new URL(path, config.TFHUB_SUPABASE_URL), {
    ...init,
    headers: {
      apikey: config.TFHUB_SUPABASE_SECRET_KEY!,
      Authorization: `Bearer ${config.TFHUB_SUPABASE_SECRET_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...init.headers,
    },
  });

  if (!response.ok) {
    const details = await response.text();
    console.error("Supabase remuneration request failed", response.status, details);
    throw new Error(`Supabase request failed with status ${response.status}`);
  }

  return response.status === 204 ? [] : response.json();
}

function parseInput(input: RemuneracaoInput) {
  const investidorId = Number(input.investidor_id);
  const remuneracao = Number(input.remuneracao);
  const inicio = String(input.data_inicio_vigencia ?? "");
  const fim = input.data_fim_vigencia
    ? String(input.data_fim_vigencia)
    : null;
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;

  if (!Number.isInteger(investidorId) || investidorId <= 0) {
    throw new Error("Selecione um investidor válido");
  }
  if (!Number.isFinite(remuneracao) || remuneracao < 0) {
    throw new Error("Informe uma remuneração válida");
  }
  if (!datePattern.test(inicio) || (fim && !datePattern.test(fim))) {
    throw new Error("Informe datas válidas");
  }
  if (fim && fim < inicio) {
    throw new Error("A data final não pode ser anterior à data inicial");
  }

  return {
    investidor_id: investidorId,
    remuneracao: Number(remuneracao.toFixed(2)),
    data_inicio_vigencia: inicio,
    data_fim_vigencia: fim,
  };
}

async function inputWithInvestorName(
  config: DatabaseEnv,
  input: ReturnType<typeof parseInput>,
) {
  const investors = config.PG_HOST
    ? await queryRows(config, `select nome from "${config.PG_SCHEMA || "public"}"."investidores" where investidor_id = $1 limit 1`, [input.investidor_id])
    : (await supabaseRequest(config, `/rest/v1/investidores?select=nome&investidor_id=eq.${input.investidor_id}&limit=1`)) as Array<{ nome?: unknown }>;
  const investorName = String(investors[0]?.nome ?? "").trim();
  if (!investorName) throw new Error("Investidor não encontrado no banco de dados");
  return { ...input, investidor_nome: investorName };
}

function requireAccess(request: Request) {
  if (isAuthorized(request)) return null;
  return json(
    {
      error: process.env.REMUNERACAO_ADMIN_TOKEN
        ? "Acesso administrativo inválido"
        : "Configure REMUNERACAO_ADMIN_TOKEN para liberar esta tela fora do ambiente local",
    },
    process.env.REMUNERACAO_ADMIN_TOKEN ? 401 : 503,
  );
}

export async function GET(request: Request) {
  const denied = requireAccess(request);
  if (denied) return denied;
  const config = databaseEnv();
  if (!config) return json({ error: "Integração não configurada" }, 503);

  try {
    const [investidores, remuneracoes] = config.PG_HOST
      ? await Promise.all([
          queryRows(config, `select investidor_id,nome,ativo from "${config.PG_SCHEMA || "public"}"."investidores" order by nome asc`),
          queryRows(config, `select id,investidor_id,investidor_nome,remuneracao,data_inicio_vigencia,data_fim_vigencia,created_at,updated_at from "${config.PG_SCHEMA || "public"}"."investidor_remuneracao" order by data_inicio_vigencia desc`),
        ])
      : await Promise.all([
          supabaseRequest(config, "/rest/v1/investidores?select=investidor_id,nome,ativo&order=nome.asc"),
          supabaseRequest(config, "/rest/v1/investidor_remuneracao?select=id,investidor_id,investidor_nome,remuneracao,data_inicio_vigencia,data_fim_vigencia,created_at,updated_at&order=data_inicio_vigencia.desc"),
        ]);
    return json({ investidores, remuneracoes });
  } catch {
    return json({ error: "Não foi possível consultar as remunerações" }, 502);
  }
}

export async function POST(request: Request) {
  const denied = requireAccess(request);
  if (denied) return denied;
  const config = databaseEnv();
  if (!config) return json({ error: "Integração não configurada" }, 503);

  try {
    const input = parseInput((await request.json()) as RemuneracaoInput);
    const payload = await inputWithInvestorName(config, input);
    const rows = config.PG_HOST
      ? await queryRows(config, `insert into "${config.PG_SCHEMA || "public"}"."investidor_remuneracao" (investidor_id,investidor_nome,remuneracao,data_inicio_vigencia,data_fim_vigencia) values ($1,$2,$3,$4,$5) returning *`, [payload.investidor_id, payload.investidor_nome, payload.remuneracao, payload.data_inicio_vigencia, payload.data_fim_vigencia])
      : await supabaseRequest(config, "/rest/v1/investidor_remuneracao", { method: "POST", body: JSON.stringify(payload) });
    return json({ remuneracao: rows[0] }, 201);
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Dados inválidos" },
      400,
    );
  }
}

export async function PATCH(request: Request) {
  const denied = requireAccess(request);
  if (denied) return denied;
  const config = databaseEnv();
  if (!config) return json({ error: "Integração não configurada" }, 503);
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return json({ error: "Registro inválido" }, 400);

  try {
    const input = parseInput((await request.json()) as RemuneracaoInput);
    const payload = await inputWithInvestorName(config, input);
    const rows = config.PG_HOST
      ? await queryRows(config, `update "${config.PG_SCHEMA || "public"}"."investidor_remuneracao" set investidor_id=$1,investidor_nome=$2,remuneracao=$3,data_inicio_vigencia=$4,data_fim_vigencia=$5,updated_at=now() where id=$6 returning *`, [payload.investidor_id, payload.investidor_nome, payload.remuneracao, payload.data_inicio_vigencia, payload.data_fim_vigencia, id])
      : await supabaseRequest(config, `/rest/v1/investidor_remuneracao?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(payload) });
    if (!rows.length) return json({ error: "Registro não encontrado" }, 404);
    return json({ remuneracao: rows[0] });
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : "Dados inválidos" },
      400,
    );
  }
}

export async function DELETE(request: Request) {
  const denied = requireAccess(request);
  if (denied) return denied;
  const config = databaseEnv();
  if (!config) return json({ error: "Integração não configurada" }, 503);
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return json({ error: "Registro inválido" }, 400);

  try {
    const rows = config.PG_HOST
      ? await queryRows(config, `delete from "${config.PG_SCHEMA || "public"}"."investidor_remuneracao" where id=$1 returning id`, [id])
      : await supabaseRequest(config, `/rest/v1/investidor_remuneracao?id=eq.${id}`, { method: "DELETE" });
    if (!rows.length) return json({ error: "Registro não encontrado" }, 404);
    return json({ deleted: true });
  } catch {
    return json({ error: "Não foi possível excluir a remuneração" }, 502);
  }
}
