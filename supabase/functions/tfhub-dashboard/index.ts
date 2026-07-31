import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const TOKEN_HASH = "f92118afc4f1030e4f56b16f10887a827f5070dc702280b9f2ba4be7b541301f";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "private, no-store",
      "x-content-type-options": "nosniff",
    },
  });

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

function number(value: unknown) {
  const parsed = Number.parseFloat(String(value ?? "0"));
  return Number.isFinite(parsed) ? parsed : 0;
}

function recurringValue(contract: Record<string, unknown>) {
  const bookedValue = contract.valor_bookado;
  const months = number(contract.meses);
  const hasBookedValue =
    bookedValue !== null &&
    bookedValue !== undefined &&
    String(bookedValue).trim() !== "";

  return hasBookedValue && months > 0
    ? number(bookedValue) / months
    : number(contract.fee_mensal);
}

function date(value: unknown): Date | null {
  if (!value) return null;
  const text = String(value).trim();
  const br = text.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  const parsed = br
    ? new Date(Date.UTC(Number(br[3]), Number(br[2]) - 1, Number(br[1])))
    : new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function monthKey(value: unknown) {
  const parsed = date(value);
  return parsed ? `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}` : null;
}

function formatBr(value: unknown) {
  const parsed = date(value);
  return parsed
    ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(parsed)
    : "—";
}

function addMonths(value: Date, months: number) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth() + months, value.getUTCDate()));
}

Deno.serve(async (request) => {
  if (request.method !== "GET") return json({ error: "Método não permitido" }, 405);

  const token = request.headers.get("x-tfhub-token") ?? "";
  if (!token || !safeEqual(await sha256(token), TOKEN_HASH)) {
    return json({ error: "Não autorizado" }, 401);
  }

  const secretKeys = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") ?? "{}");
  const secretKey = secretKeys.default ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  if (!secretKey || !supabaseUrl) return json({ error: "Configuração indisponível" }, 500);

  const db = createClient(supabaseUrl, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const queries = await Promise.all([
    db.from("clientes").select("cliente_id,nome,gmv,ativo,investidor_id,segmento_id,origem_id,data_entrada,data_churn,squad_responsavel_id"),
    db.from("contratos").select("contrato_id,cliente_id,investidor_id,squad_id,valor_contrato,fee_mensal,valor_bookado,data_assinatura,data_contrato,data_fim_contrato,ativo,renovavel,meses,tipo"),
    db.from("squads").select("squad_id,nome,ativo"),
    db.from("investidores").select("investidor_id,nome,squad_id,funcao_id,ativo"),
    db.from("cliente_equipe").select("equipe_id,cliente_id,investidor_id,servico_id"),
    db.from("funcoes").select("funcao_id,nome,ativo"),
    db.from("servicos").select("servico_id,nome,ativo"),
    db.from("segmentos").select("segmento_id,nome"),
  ]);

  const failed = queries.find((query) => query.error);
  if (failed?.error) {
    console.error("TFHub query failed", failed.error.message);
    return json({ error: "Não foi possível consultar os dados atuais" }, 500);
  }

  const [clientes, contratos, squads, investidores, equipe, funcoes, servicos, segmentos] =
    queries.map((query) => query.data ?? []);

  const squadById = new Map(squads.map((row) => [String(row.squad_id), row.nome]));
  const investorById = new Map(investidores.map((row) => [String(row.investidor_id), row]));
  const functionById = new Map(funcoes.map((row) => [String(row.funcao_id), row.nome]));
  const serviceById = new Map(servicos.map((row) => [String(row.servico_id), row.nome]));
  const segmentById = new Map(segmentos.map((row) => [String(row.segmento_id), row.nome]));

  const contractsByClient = new Map<string, typeof contratos>();
  for (const contract of contratos) {
    const key = String(contract.cliente_id);
    if (!contractsByClient.has(key)) contractsByClient.set(key, []);
    contractsByClient.get(key)!.push(contract);
  }

  const clients = clientes.map((client) => {
    const clientContracts = contractsByClient.get(String(client.cliente_id)) ?? [];
    const activeContracts = clientContracts.filter((contract) => contract.ativo);
    const mrr = activeContracts.reduce((sum, contract) => sum + recurringValue(contract), 0);
    const ltv = clientContracts.reduce(
      (sum, contract) => sum + number(contract.valor_contrato) + number(contract.fee_mensal) * number(contract.meses),
      0,
    );
    const investor = investorById.get(String(client.investidor_id));
    return {
      id: client.cliente_id,
      nome: client.nome || "Cliente sem nome",
      squad: squadById.get(String(client.squad_responsavel_id)) || "Indefinido",
      responsavel: investor?.nome || "Sem responsável",
      ativo: Boolean(client.ativo),
      gmv: number(client.gmv),
      mrr,
      ltv,
      contratos: activeContracts.length,
      segmento: segmentById.get(String(client.segmento_id)) || (client.segmento_id ? `#${client.segmento_id}` : "—"),
      origem: client.origem_id ? `#${client.origem_id}` : "—",
      entrada: formatBr(client.data_entrada),
    };
  });

  const squadMetrics = squads.map((squad) => {
    const squadClients = clientes.filter((client) => String(client.squad_responsavel_id) === String(squad.squad_id));
    const ativos = squadClients.filter((client) => client.ativo).length;
    const churned = squadClients.length - ativos;
    const squadClientIds = new Set(squadClients.map((client) => String(client.cliente_id)));
    const squadContracts = contratos.filter((contract) => squadClientIds.has(String(contract.cliente_id)));
    return {
      id: squad.squad_id,
      nome: squad.nome,
      ativos,
      churned,
      churn: squadClients.length ? (churned / squadClients.length) * 100 : 0,
      gmv: squadClients.filter((client) => client.ativo).reduce((sum, client) => sum + number(client.gmv), 0),
      mrr: squadContracts.filter((contract) => contract.ativo).reduce((sum, contract) => sum + recurringValue(contract), 0),
      ltv: squadContracts.reduce(
        (sum, contract) => sum + number(contract.valor_contrato) + number(contract.fee_mensal) * number(contract.meses),
        0,
      ),
    };
  }).filter((row) => row.ativos || row.churned || row.mrr);

  const monthMap = new Map<string, { mes: string; entradas: number; churns: number; contratos: number; mrr: number }>();
  const ensureMonth = (mes: string) => {
    if (!monthMap.has(mes)) monthMap.set(mes, { mes, entradas: 0, churns: 0, contratos: 0, mrr: 0 });
    return monthMap.get(mes)!;
  };
  for (const client of clientes) {
    const entryMonth = monthKey(client.data_entrada);
    const churnMonth = monthKey(client.data_churn);
    if (entryMonth) ensureMonth(entryMonth).entradas += 1;
    if (churnMonth) ensureMonth(churnMonth).churns += 1;
  }
  for (const contract of contratos) {
    const signedMonth = monthKey(contract.data_assinatura || contract.data_contrato);
    if (signedMonth) {
      ensureMonth(signedMonth).contratos += 1;
      ensureMonth(signedMonth).mrr += recurringValue(contract);
    }
  }
  const monthly = [...monthMap.values()].sort((a, b) => a.mes.localeCompare(b.mes));

  const cohortGroups = new Map<string, typeof clientes>();
  for (const client of clientes) {
    const key = monthKey(client.data_entrada);
    if (!key) continue;
    if (!cohortGroups.has(key)) cohortGroups.set(key, []);
    cohortGroups.get(key)!.push(client);
  }
  const now = new Date();
  const cohorts = [...cohortGroups.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([coorte, rows]) => {
    const retained = (months: number) => {
      const eligible = rows.filter((row) => {
        const start = date(row.data_entrada);
        return start && addMonths(start, months) <= now;
      });
      if (!eligible.length) return null;
      const active = eligible.filter((row) => {
        const start = date(row.data_entrada)!;
        const churn = date(row.data_churn);
        return !churn || churn >= addMonths(start, months);
      }).length;
      return Number(((active / eligible.length) * 100).toFixed(1));
    };
    return { coorte, tamanho: rows.length, m1: retained(1), m3: retained(3), m6: retained(6), m12: retained(12) };
  });

  const owners = investidores.map((investor) => {
    const ownerClients = clientes.filter((client) => String(client.investidor_id) === String(investor.investidor_id));
    const ownerContracts = contratos.filter((contract) => String(contract.investidor_id) === String(investor.investidor_id));
    const renewable = ownerContracts.filter((contract) => contract.renovavel);
    return {
      nome: investor.nome || "Sem nome",
      squad: squadById.get(String(investor.squad_id)) || "Indefinido",
      ativos: ownerClients.filter((client) => client.ativo).length,
      churned: ownerClients.filter((client) => !client.ativo).length,
      mrr: ownerContracts.filter((contract) => contract.ativo).reduce((sum, contract) => sum + recurringValue(contract), 0),
      renovacao: ownerContracts.length ? Number(((renewable.length / ownerContracts.length) * 100).toFixed(1)) : 0,
    };
  }).filter((owner) => owner.ativos || owner.churned || owner.mrr)
    .sort((a, b) => b.mrr - a.mrr);

  const activeFeeByClient = new Map<string, number>();
  for (const contract of contratos.filter((contract) => contract.ativo)) {
    const key = String(contract.cliente_id);
    activeFeeByClient.set(key, (activeFeeByClient.get(key) ?? 0) + recurringValue(contract));
  }
  const clientById = new Map(clientes.map((row) => [String(row.cliente_id), row]));
  const teamRows = equipe.flatMap((link) => {
    const client = clientById.get(String(link.cliente_id));
    const investor = investorById.get(String(link.investidor_id));
    if (!client || !investor) return [];
    return [[
      functionById.get(String(investor?.funcao_id)) || "Função não definida",
      investor?.nome || "Sem responsável",
      squadById.get(String(investor?.squad_id)) || "Indefinido",
      client.nome || "Cliente sem nome",
      serviceById.get(String(link.servico_id)) || "Serviço não definido",
      activeFeeByClient.get(String(link.cliente_id)) ?? 0,
      Boolean(client.ativo),
      Boolean(investor.ativo),
    ]];
  });

  return json({
    extractedAt: new Date().toISOString(),
    squads: squadMetrics,
    monthly,
    cohorts,
    owners,
    clients,
    teamRows,
  });
});
