import { fetchTable, type DatabaseEnv } from "./database";
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

const number = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;
const date = (value: unknown) => value ? new Date(`${String(value).slice(0, 10)}T12:00:00Z`) : null;

function recurringValue(contract: Row) {
  const booked = number(contract.valor_bookado);
  const months = number(contract.meses);
  return booked > 0 ? (months > 0 ? booked / months : 0) : number(contract.fee_mensal);
}

function monthRange(period: string) {
  const [year, month] = period.split("-").map(Number);
  return {
    start: new Date(Date.UTC(year, month - 1, 1, 12)),
    end: new Date(Date.UTC(year, month, 0, 12)),
  };
}

function overlapsMonth(row: Row, startField: string, endField: string, start: Date, end: Date) {
  const rowStart = date(row[startField]);
  const rowEnd = date(row[endField]);
  return (!rowStart || rowStart <= end) && (!rowEnd || rowEnd >= start);
}

async function loadEconomicsSource(env: DatabaseEnv) {
  const [clientes, contratos, investidores, equipe, contratoEquipe, planos, contratoPlanos, servicos, squads, funcoes, remuneracoes, configRows] = await Promise.all([
    fetchTable(env, "clientes", "cliente_id,nome,ativo,data_entrada,data_churn,squad_responsavel_id"),
    fetchTable(env, "contratos", "contrato_id,cliente_id,fee_mensal,valor_bookado,meses,data_assinatura,data_contrato,data_fim_contrato,ativo"),
    fetchTable(env, "investidores", "investidor_id,nome,squad_id,funcao_id,ativo,data_inicio,data_fim"),
    fetchTable(env, "cliente_equipe", "equipe_id,cliente_id,investidor_id,servico_id"),
    fetchTable(env, "contrato_equipe", "contrato_id,investidor_id,servico_id"),
    fetchTable(env, "planos", "plano_id,servico_id"),
    fetchTable(env, "contrato_planos", "contrato_id,plano_id"),
    fetchTable(env, "servicos", "servico_id,nome"),
    fetchTable(env, "squads", "squad_id,nome"),
    fetchTable(env, "funcoes", "funcao_id,nome"),
    fetchTable(env, "investidor_remuneracao", "id,investidor_id,remuneracao,data_inicio_vigencia,data_fim_vigencia"),
    fetchTable(env, "economics_config", "*", true),
  ]);

  return { clientes, contratos, investidores, equipe, contratoEquipe, planos, contratoPlanos, servicos, squads, funcoes, remuneracoes, configRows };
}

type EconomicsSource = Awaited<ReturnType<typeof loadEconomicsSource>>;

function calculateEconomicsData(source: EconomicsSource, requestedPeriod?: string) {
  const { clientes, contratos, investidores, equipe, contratoEquipe, planos, contratoPlanos, servicos, squads, funcoes, remuneracoes, configRows } = source;
  const config = Object.fromEntries(Object.entries({ ...DEFAULT_ECONOMICS_CONFIG, ...(configRows[0] || {}) }).map(([key, value]) => [key, key === "id" || key === "updated_at" ? value : number(value)])) as EconomicsConfig;
  const today = new Date();
  const currentPeriod = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(2, "0")}`;
  const period = /^\d{4}-\d{2}$/.test(requestedPeriod || "") ? requestedPeriod! : currentPeriod;
  const { start: periodStart, end: periodEnd } = monthRange(period);
  const squadById = new Map(squads.map(row => [String(row.squad_id), String(row.nome || "Indefinido")]));
  const functionById = new Map(funcoes.map(row => [String(row.funcao_id), String(row.nome || "Não definida")]));
  const serviceById = new Map(servicos.map(row => [String(row.servico_id), String(row.nome || "Serviço sem nome")]));
  const clientById = new Map(clientes.map(row => [String(row.cliente_id), row]));
  const contractById = new Map(contratos.map(row => [String(row.contrato_id), row]));
  const contractOverlapsPeriod = (contract: Row, start: Date, end: Date) => {
    const contractStart = date(contract.data_contrato);
    const client = clientById.get(String(contract.cliente_id));
    const explicitEnd = date(contract.data_fim_contrato);
    const inferredEnd = !contract.ativo ? date(client?.data_churn) : null;
    const contractEnd = explicitEnd || inferredEnd;
    if (!contractStart || (!contractEnd && !contract.ativo)) return false;
    return contractStart <= end && (!contractEnd || contractEnd >= start);
  };
  const activeContracts = contratos.filter(contract => contractOverlapsPeriod(contract, periodStart, periodEnd));
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
  const servicesByPair = new Map<string, Set<string>>();
  for (const link of equipe) {
    const client = clientById.get(String(link.cliente_id));
    if (!client) continue;
    const exact = exactAssignments.has(`${link.cliente_id}:${link.investidor_id}:${link.servico_id}`);
    const inferred = inferredClientServices.has(`${link.cliente_id}:${link.servico_id}`);
    if (exact || inferred) {
      const pair = `${link.investidor_id}:${link.cliente_id}`;
      validPairs.add(pair);
      if (!servicesByPair.has(pair)) servicesByPair.set(pair, new Set());
      servicesByPair.get(pair)!.add(String(link.servico_id));
    }
  }

  const periodRemuneration = new Map<string, Row>();
  for (const row of remuneracoes) {
    if (!overlapsMonth(row, "data_inicio_vigencia", "data_fim_vigencia", periodStart, periodEnd)) continue;
    const starts = String(row.data_inicio_vigencia || "");
    const key = String(row.investidor_id);
    const previous = periodRemuneration.get(key);
    if (!previous || String(previous.data_inicio_vigencia) < starts) periodRemuneration.set(key, row);
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
  const clientRows = clientes.filter(client => activeContractsByClient.has(String(client.cliente_id))).map(client => {
    const clientContracts = activeContractsByClient.get(String(client.cliente_id)) || [];
    const grossRevenue = clientContracts.reduce((sum, contract) => sum + recurringValue(contract), 0);
    const allocatedPeople = [...(investorsByClient.get(String(client.cliente_id)) || [])];
    const costAllocations = allocatedPeople.map(investorId => {
      const salary = number(periodRemuneration.get(investorId)?.remuneracao);
      const count = clientsByInvestor.get(investorId)?.size || 0;
      const investor = investidores.find(row => String(row.investidor_id) === investorId);
      const pair = `${investorId}:${client.cliente_id}`;
      return { investorId: Number(investorId), investorName: String(investor?.nome || "Sem nome"), cost: count ? salary / count : 0, serviceIds: [...(servicesByPair.get(pair) || [])] };
    });
    const personnelCost = costAllocations.reduce((sum, allocation) => sum + allocation.cost, 0);
    const netRevenue = grossRevenue * (1 - (config.imposto_percentual + config.royalties_percentual) / 100);
    const grossProfit = netRevenue - personnelCost;
    const starts = clientContracts.map(row => date(row.data_contrato || row.data_assinatura)).filter(Boolean) as Date[];
    const start = starts.length ? new Date(Math.min(...starts.map(value => value.getTime()))) : date(client.data_entrada) || periodStart;
    const contractEnds = clientContracts.map(row => date(row.data_fim_contrato)).filter(Boolean) as Date[];
    const latestContractEnd = contractEnds.length ? new Date(Math.max(...contractEnds.map(value => value.getTime()))) : periodEnd;
    const end = latestContractEnd < periodEnd ? latestContractEnd : periodEnd;
    const lifetime = Math.max(0, (end.getTime() - start.getTime()) / 86400000 / 30.41);
    const revenueContracts = clientContracts.map(contract => ({ contractId: contract.contrato_id, revenue: recurringValue(contract), serviceIds: [...(servicesByContract.get(String(contract.contrato_id)) || ["unassigned"])] }));
    return { id: client.cliente_id, nome: client.nome, squad: squadById.get(String(client.squad_responsavel_id)) || "Indefinido", grossRevenue, netRevenue, personnelCost, grossProfit, margin: netRevenue ? grossProfit / netRevenue : 0, lifetime, cluster: cluster(grossRevenue), people: allocatedPeople.length, costAllocations, revenueContracts };
  }).sort((a, b) => b.grossRevenue - a.grossRevenue);

  const peopleRows = investidores.map(investor => {
    const investorId = String(investor.investidor_id);
    const clientsCount = clientsByInvestor.get(investorId)?.size || 0;
    const monthlyCost = number(periodRemuneration.get(investorId)?.remuneracao);
    const clientIds = [...(clientsByInvestor.get(investorId) || [])];
    const clientSquads = [...new Set(clientIds.map(clientId => squadById.get(String(clientById.get(clientId)?.squad_responsavel_id)) || "Indefinido"))];
    const serviceIds = [...new Set(clientIds.flatMap(clientId => [...(servicesByPair.get(`${investorId}:${clientId}`) || [])]))];
    const activeInPeriod = overlapsMonth(investor, "data_inicio", "data_fim", periodStart, periodEnd);
    return { id: investor.investidor_id, nome: investor.nome, ativo: activeInPeriod, squad: squadById.get(String(investor.squad_id)) || "Indefinido", funcao: functionById.get(String(investor.funcao_id)) || "Não definida", monthlyCost, clientsCount, costPerClient: clientsCount ? monthlyCost / clientsCount : 0, clientIds, clientSquads, serviceIds };
  }).filter(row => row.monthlyCost > 0 || row.clientsCount > 0).sort((a, b) => b.monthlyCost - a.monthlyCost);

  const previousEnd = new Date(Date.UTC(periodEnd.getUTCFullYear(), periodEnd.getUTCMonth(), 0, 12));
  const previousStart = new Date(Date.UTC(previousEnd.getUTCFullYear(), previousEnd.getUTCMonth(), 1, 12));
  const revenueRowsInMonth = (start: Date, end: Date) => {
    const rows = new Map<string, { revenue: number; serviceIds: string[] }[]>();
    for (const contract of contratos.filter(row => contractOverlapsPeriod(row, start, end))) {
      const clientId = String(contract.cliente_id);
      if (!rows.has(clientId)) rows.set(clientId, []);
      rows.get(clientId)!.push({ revenue: recurringValue(contract), serviceIds: [...(servicesByContract.get(String(contract.contrato_id)) || ["unassigned"])] });
    }
    return rows;
  };
  const revenueByClientInMonth = (start: Date, end: Date) => {
    const map = new Map<string, number>();
    for (const [clientId, rows] of revenueRowsInMonth(start, end)) map.set(clientId, rows.reduce((sum, row) => sum + row.revenue, 0));
    return map;
  };
  const previousRevenue = revenueByClientInMonth(previousStart, previousEnd);
  const currentRevenue = revenueByClientInMonth(periodStart, periodEnd);
  const previousCohort = [...previousRevenue.entries()].filter(([, value]) => value > 0);
  const previousTotal = previousCohort.reduce((sum, [, value]) => sum + value, 0);
  const retainedCurrent = previousCohort.reduce((sum, [clientId]) => sum + (currentRevenue.get(clientId) || 0), 0);
  const nrr = previousTotal ? retainedCurrent / previousTotal : 0;
  const previousNrrRows = revenueRowsInMonth(previousStart, previousEnd);
  const currentNrrRows = revenueRowsInMonth(periodStart, periodEnd);
  const nrrRows = [...new Set([...previousNrrRows.keys(), ...currentNrrRows.keys()])].map(clientId => ({
    clientId,
    squad: squadById.get(String(clientById.get(clientId)?.squad_responsavel_id)) || "Indefinido",
    previous: previousNrrRows.get(clientId) || [],
    current: currentNrrRows.get(clientId) || [],
  }));
  const serviceSquads = new Map<string, Set<string>>();
  for (const row of clientRows) for (const contract of row.revenueContracts) for (const serviceId of contract.serviceIds) {
    if (!serviceSquads.has(serviceId)) serviceSquads.set(serviceId, new Set());
    serviceSquads.get(serviceId)!.add(row.squad);
  }
  const serviceRows = [...serviceSquads.entries()].map(([id, squadNames]) => ({ id, nome: id === "unassigned" ? "Sem serviço vinculado" : serviceById.get(id) || "Serviço sem nome", squads: [...squadNames] })).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const availableYears = [...new Set(contratos.map(row => date(row.data_contrato)?.getUTCFullYear()).filter((value): value is number => Boolean(value)))].sort((a, b) => b - a);

  return { period, availableYears, config, clientRows, peopleRows, serviceRows, nrr, nrrRows, coverage: { allocations: validPairs.size, remuneratedPeople: periodRemuneration.size, clientsWithoutAllocation: clientRows.filter(row => !row.people).length }, extractedAt: new Date().toISOString() };
}

export async function getEconomicsData(env: DatabaseEnv, requestedPeriod?: string) {
  return calculateEconomicsData(await loadEconomicsSource(env), requestedPeriod);
}

export async function getEconomicsYearData(env: DatabaseEnv, year: number) {
  const source = await loadEconomicsSource(env);
  return Array.from({ length: 12 }, (_, index) => calculateEconomicsData(source, `${year}-${String(index + 1).padStart(2, "0")}`));
}
