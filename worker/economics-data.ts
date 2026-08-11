type DatabaseEnv = { TFHUB_SUPABASE_URL: string; TFHUB_SUPABASE_SECRET_KEY: string };
type Row = Record<string, unknown>;

export type EconomicsConfig = {
  imposto_percentual: number;
  royalties_percentual: number;
  cluster_small_ate: number;
  cluster_medium_ate: number;
  cluster_large_ate: number;
  meta_csp: number;
  meta_rpco: number;
  meta_mc: number;
  meta_nrr: number;
};

export const DEFAULT_ECONOMICS_CONFIG: EconomicsConfig = {
  imposto_percentual: 9,
  royalties_percentual: 15,
  cluster_small_ate: 5000,
  cluster_medium_ate: 10000,
  cluster_large_ate: 20000,
  meta_csp: 0.5,
  meta_rpco: 12000,
  meta_mc: 0.5,
  meta_nrr: 1,
};

async function fetchTable(env: DatabaseEnv, table: string, columns: string, optional = false) {
  const rows: Row[] = [];
  for (let offset = 0; ; offset += 1000) {
    const url = new URL(`/rest/v1/${table}`, env.TFHUB_SUPABASE_URL);
    url.searchParams.set("select", columns);
    const response = await fetch(url, { headers: { apikey: env.TFHUB_SUPABASE_SECRET_KEY, Authorization: `Bearer ${env.TFHUB_SUPABASE_SECRET_KEY}`, Range: `${offset}-${offset + 999}`, "Range-Unit": "items" } });
    if (!response.ok) {
      if (optional && response.status === 404) return [];
      throw new Error(`Supabase REST ${table} failed with status ${response.status}`);
    }
    const page = await response.json() as Row[];
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

const number = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const date = (value: unknown) => value ? new Date(`${String(value).slice(0, 10)}T12:00:00Z`) : null;
const day = (value: Date) => value.toISOString().slice(0, 10);

function recurringValue(contract: Row) {
  const booked = number(contract.valor_bookado);
  const months = number(contract.meses);
  return booked > 0 ? (months > 0 ? booked / months : 0) : number(contract.fee_mensal);
}

function activeAt(contract: Row, reference: Date, current = false) {
  if (current && !contract.ativo) return false;
  const start = date(contract.data_contrato || contract.data_assinatura);
  const end = date(contract.data_fim_contrato);
  const referenceDay = day(reference);
  return (!start || day(start) <= referenceDay) && (!end || day(end) >= referenceDay);
}

export async function getEconomicsData(env: DatabaseEnv) {
  const [clientes, contratos, investidores, equipe, contratoEquipe, planos, contratoPlanos, squads, funcoes, remuneracoes, configRows] = await Promise.all([
    fetchTable(env, "clientes", "cliente_id,nome,ativo,data_entrada,data_churn,squad_responsavel_id"),
    fetchTable(env, "contratos", "contrato_id,cliente_id,fee_mensal,valor_bookado,meses,data_assinatura,data_contrato,data_fim_contrato,ativo"),
    fetchTable(env, "investidores", "investidor_id,nome,squad_id,funcao_id,ativo"),
    fetchTable(env, "cliente_equipe", "equipe_id,cliente_id,investidor_id,servico_id"),
    fetchTable(env, "contrato_equipe", "contrato_id,investidor_id,servico_id"),
    fetchTable(env, "planos", "plano_id,servico_id"),
    fetchTable(env, "contrato_planos", "contrato_id,plano_id"),
    fetchTable(env, "squads", "squad_id,nome"),
    fetchTable(env, "funcoes", "funcao_id,nome"),
    fetchTable(env, "investidor_remuneracao", "id,investidor_id,remuneracao,data_inicio_vigencia,data_fim_vigencia"),
    fetchTable(env, "economics_config", "*", true),
  ]);

  const config = Object.fromEntries(Object.entries({ ...DEFAULT_ECONOMICS_CONFIG, ...(configRows[0] || {}) }).map(([key, value]) => [key, key === "id" || key === "updated_at" ? value : number(value)])) as EconomicsConfig;
  const today = new Date();
  const todayText = day(today);
  const squadById = new Map(squads.map(row => [String(row.squad_id), String(row.nome || "Indefinido")]));
  const functionById = new Map(funcoes.map(row => [String(row.funcao_id), String(row.nome || "Não definida")]));
  const clientById = new Map(clientes.map(row => [String(row.cliente_id), row]));
  const contractById = new Map(contratos.map(row => [String(row.contrato_id), row]));
  const activeContracts = contratos.filter(contract => activeAt(contract, today, true));
  const activeContractIds = new Set(activeContracts.map(row => String(row.contrato_id)));
  const planService = new Map(planos.map(row => [String(row.plano_id), String(row.servico_id)]));
  const servicesByContract = new Map<string, Set<string>>();
  const ensureServices = (contractId: string) => { if (!servicesByContract.has(contractId)) servicesByContract.set(contractId, new Set()); return servicesByContract.get(contractId)!; };
  for (const link of contratoPlanos) { const service = planService.get(String(link.plano_id)); if (service) ensureServices(String(link.contrato_id)).add(service); }
  for (const link of contratoEquipe) ensureServices(String(link.contrato_id)).add(String(link.servico_id));

  const exactAssignments = new Set<string>();
  const inferredClientServices = new Set<string>();
  const assignedContractIds = new Set(contratoEquipe.map(row => String(row.contrato_id)));
  for (const link of contratoEquipe) {
    if (!activeContractIds.has(String(link.contrato_id))) continue;
    const contract = contractById.get(String(link.contrato_id));
    if (contract) exactAssignments.add(`${contract.cliente_id}:${link.investidor_id}:${link.servico_id}`);
  }
  for (const contract of activeContracts) {
    if (assignedContractIds.has(String(contract.contrato_id))) continue;
    for (const service of servicesByContract.get(String(contract.contrato_id)) || []) inferredClientServices.add(`${contract.cliente_id}:${service}`);
  }

  const validPairs = new Set<string>();
  for (const link of equipe) {
    const client = clientById.get(String(link.cliente_id));
    if (!client || !client.ativo) continue;
    const exact = exactAssignments.has(`${link.cliente_id}:${link.investidor_id}:${link.servico_id}`);
    const inferred = inferredClientServices.has(`${link.cliente_id}:${link.servico_id}`);
    if (exact || inferred) validPairs.add(`${link.investidor_id}:${link.cliente_id}`);
  }

  const currentRemuneration = new Map<string, Row>();
  for (const row of remuneracoes) {
    const starts = String(row.data_inicio_vigencia || "");
    const ends = String(row.data_fim_vigencia || "");
    if (starts > todayText || (ends && ends < todayText)) continue;
    const key = String(row.investidor_id);
    const previous = currentRemuneration.get(key);
    if (!previous || String(previous.data_inicio_vigencia) < starts) currentRemuneration.set(key, row);
  }

  const clientsByInvestor = new Map<string, Set<string>>();
  const investorsByClient = new Map<string, Set<string>>();
  for (const pair of validPairs) {
    const [investorId, clientId] = pair.split(":");
    if (!clientsByInvestor.has(investorId)) clientsByInvestor.set(investorId, new Set());
    if (!investorsByClient.has(clientId)) investorsByClient.set(clientId, new Set());
    clientsByInvestor.get(investorId)!.add(clientId);
    investorsByClient.get(clientId)!.add(investorId);
  }

  const activeContractsByClient = new Map<string, Row[]>();
  for (const contract of activeContracts) {
    const key = String(contract.cliente_id);
    if (!activeContractsByClient.has(key)) activeContractsByClient.set(key, []);
    activeContractsByClient.get(key)!.push(contract);
  }
  const cluster = (revenue: number) => revenue <= config.cluster_small_ate ? "SMALL" : revenue <= config.cluster_medium_ate ? "MEDIUM" : revenue <= config.cluster_large_ate ? "LARGE" : "ENTERPRISE";
  const clientRows = clientes.filter(client => client.ativo && activeContractsByClient.has(String(client.cliente_id))).map(client => {
    const clientContracts = activeContractsByClient.get(String(client.cliente_id)) || [];
    const grossRevenue = clientContracts.reduce((sum, contract) => sum + recurringValue(contract), 0);
    const allocatedPeople = [...(investorsByClient.get(String(client.cliente_id)) || [])];
    const costAllocations = allocatedPeople.map(investorId => {
      const salary = number(currentRemuneration.get(investorId)?.remuneracao);
      const count = clientsByInvestor.get(investorId)?.size || 0;
      const investor = investidores.find(row => String(row.investidor_id) === investorId);
      return { investorId: Number(investorId), investorName: String(investor?.nome || "Sem nome"), cost: count ? salary / count : 0 };
    });
    const personnelCost = costAllocations.reduce((sum, allocation) => sum + allocation.cost, 0);
    const netRevenue = grossRevenue * (1 - (config.imposto_percentual + config.royalties_percentual) / 100);
    const grossProfit = netRevenue - personnelCost;
    const starts = clientContracts.map(row => date(row.data_contrato || row.data_assinatura)).filter(Boolean) as Date[];
    const start = starts.length ? new Date(Math.min(...starts.map(value => value.getTime()))) : date(client.data_entrada) || today;
    const end = client.ativo ? today : date(client.data_churn) || today;
    const lifetime = Math.max(0, (end.getTime() - start.getTime()) / 86400000 / 30.41);
    return { id: client.cliente_id, nome: client.nome, squad: squadById.get(String(client.squad_responsavel_id)) || "Indefinido", grossRevenue, netRevenue, personnelCost, grossProfit, margin: netRevenue ? grossProfit / netRevenue : 0, lifetime, cluster: cluster(grossRevenue), people: allocatedPeople.length, costAllocations };
  }).sort((a, b) => b.grossRevenue - a.grossRevenue);

  const peopleRows = investidores.map(investor => {
    const investorId = String(investor.investidor_id);
    const clientsCount = clientsByInvestor.get(investorId)?.size || 0;
    const monthlyCost = number(currentRemuneration.get(investorId)?.remuneracao);
    const clientIds = [...(clientsByInvestor.get(investorId) || [])];
    const clientSquads = [...new Set(clientIds.map(clientId => squadById.get(String(clientById.get(clientId)?.squad_responsavel_id)) || "Indefinido"))];
    return { id: investor.investidor_id, nome: investor.nome, ativo: Boolean(investor.ativo), squad: squadById.get(String(investor.squad_id)) || "Indefinido", funcao: functionById.get(String(investor.funcao_id)) || "Não definida", monthlyCost, clientsCount, costPerClient: clientsCount ? monthlyCost / clientsCount : 0, clientIds, clientSquads };
  }).filter(row => row.monthlyCost > 0 || row.clientsCount > 0).sort((a, b) => b.monthlyCost - a.monthlyCost);

  const previousEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 0, 12));
  const currentEnd = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0, 12));
  const revenueByClientAt = (reference: Date) => {
    const map = new Map<string, number>();
    for (const contract of contratos.filter(row => activeAt(row, reference))) map.set(String(contract.cliente_id), (map.get(String(contract.cliente_id)) || 0) + recurringValue(contract));
    return map;
  };
  const previousRevenue = revenueByClientAt(previousEnd);
  const currentRevenue = revenueByClientAt(currentEnd);
  const previousCohort = [...previousRevenue.entries()].filter(([, value]) => value > 0);
  const previousTotal = previousCohort.reduce((sum, [, value]) => sum + value, 0);
  const retainedCurrent = previousCohort.reduce((sum, [clientId]) => sum + (currentRevenue.get(clientId) || 0), 0);
  const nrr = previousTotal ? retainedCurrent / previousTotal : 0;

  return { config, clientRows, peopleRows, nrr, coverage: { allocations: validPairs.size, remuneratedPeople: currentRemuneration.size, clientsWithoutAllocation: clientRows.filter(row => !row.people).length }, extractedAt: new Date().toISOString() };
}
