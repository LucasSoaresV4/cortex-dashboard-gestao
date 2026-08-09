type DatabaseEnv = {
  TFHUB_SUPABASE_URL: string;
  TFHUB_SUPABASE_SECRET_KEY: string;
};

type Row = Record<string, unknown>;

async function fetchTable(
  env: DatabaseEnv,
  table: string,
  columns: string,
): Promise<Row[]> {
  const pageSize = 1000;
  const rows: Row[] = [];

  for (let offset = 0; ; offset += pageSize) {
    const url = new URL(
      `/rest/v1/${encodeURIComponent(table)}`,
      env.TFHUB_SUPABASE_URL,
    );
    url.searchParams.set("select", columns);

    const response = await fetch(url, {
      headers: {
        apikey: env.TFHUB_SUPABASE_SECRET_KEY,
        Authorization: `Bearer ${env.TFHUB_SUPABASE_SECRET_KEY}`,
        Range: `${offset}-${offset + pageSize - 1}`,
        "Range-Unit": "items",
      },
    });

    if (!response.ok) {
      throw new Error(
        `Supabase REST ${table} failed with status ${response.status}`,
      );
    }

    const page = (await response.json()) as Row[];
    rows.push(...page);
    if (page.length < pageSize) return rows;
  }
}

function number(value: unknown) {
  const parsed = Number.parseFloat(String(value ?? "0"));
  return Number.isFinite(parsed) ? parsed : 0;
}

function recurringValue(contract: Row) {
  const bookedValue = contract.valor_bookado;
  const bookedAmount = number(bookedValue);
  const months = number(contract.meses);
  const hasBookedValue =
    bookedValue !== null &&
    bookedValue !== undefined &&
    String(bookedValue).trim() !== "" &&
    bookedAmount > 0;

  if (hasBookedValue && months === 0) return 0;
  return hasBookedValue && months > 0
    ? bookedAmount / months
    : number(contract.fee_mensal);
}

function oneShotValue(contract: Row) {
  const bookedValue = contract.valor_bookado;
  const months = number(contract.meses);
  const hasBookedValue =
    bookedValue !== null &&
    bookedValue !== undefined &&
    String(bookedValue).trim() !== "";

  return hasBookedValue && months === 0 ? number(bookedValue) : 0;
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

function isActiveContract(contract: Row, referenceDate = new Date()) {
  if (!contract.ativo) return false;
  const rawEndDate = String(contract.data_fim_contrato ?? "").trim();
  if (!rawEndDate) return true;
  const endDate = date(rawEndDate);
  if (!endDate) return false;
  const today = Date.UTC(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    referenceDate.getUTCDate(),
  );
  return endDate.getTime() >= today;
}

function monthKey(value: unknown) {
  const parsed = date(value);
  return parsed
    ? `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, "0")}`
    : null;
}

function formatBr(value: unknown) {
  const parsed = date(value);
  return parsed
    ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(parsed)
    : "—";
}

function addMonths(value: Date, months: number) {
  return new Date(
    Date.UTC(
      value.getUTCFullYear(),
      value.getUTCMonth() + months,
      value.getUTCDate(),
    ),
  );
}

export async function getDashboardData(env: DatabaseEnv) {
  const [
    clientes,
    contratos,
    squads,
    investidores,
    equipe,
    funcoes,
    servicos,
    segmentos,
    planos,
    contratoPlanos,
    contratoEquipe,
    metaDemandas,
    investidorCapacities,
  ] = await Promise.all([
    fetchTable(env, "clientes", "cliente_id,nome,gmv,ativo,investidor_id,segmento_id,origem_id,data_entrada,data_churn,squad_responsavel_id"),
    fetchTable(env, "contratos", "contrato_id,cliente_id,investidor_id,squad_id,valor_contrato,fee_mensal,valor_bookado,data_assinatura,data_contrato,data_fim_contrato,ativo,renovavel,meses,tipo"),
    fetchTable(env, "squads", "squad_id,nome,ativo"),
    fetchTable(env, "investidores", "investidor_id,nome,squad_id,funcao_id,ativo"),
    fetchTable(env, "cliente_equipe", "equipe_id,cliente_id,investidor_id,servico_id"),
    fetchTable(env, "funcoes", "funcao_id,nome,ativo"),
    fetchTable(env, "servicos", "servico_id,nome,ativo"),
    fetchTable(env, "segmentos", "segmento_id,nome"),
    fetchTable(env, "planos", "plano_id,servico_id,ativo"),
    fetchTable(env, "contrato_planos", "contrato_id,plano_id"),
    fetchTable(
      env,
      "contrato_equipe",
      "contrato_equipe_id,contrato_id,investidor_id,servico_id",
    ),
    fetchTable(env, "meta_demandas", "*"),
    fetchTable(env, "investidor_capacities", "investidor_id,quantidade_clientes"),
  ]);

    const squadById = new Map(
      squads.map((row) => [String(row.squad_id), row.nome]),
    );
    const investorById = new Map(
      investidores.map((row) => [String(row.investidor_id), row]),
    );
    const capacityByInvestorId = new Map(
      investidorCapacities.map((row) => [
        String(row.investidor_id),
        number(row.quantidade_clientes),
      ]),
    );
    const functionById = new Map(
      funcoes.map((row) => [String(row.funcao_id), row.nome]),
    );
    const serviceById = new Map(
      servicos.map((row) => [String(row.servico_id), row.nome]),
    );
    const segmentById = new Map(
      segmentos.map((row) => [String(row.segmento_id), row.nome]),
    );

    const contractsByClient = new Map<string, Row[]>();
    for (const contract of contratos) {
      const key = String(contract.cliente_id);
      if (!contractsByClient.has(key)) contractsByClient.set(key, []);
      contractsByClient.get(key)!.push(contract);
    }

    const clients = clientes.map((client) => {
      const clientContracts =
        contractsByClient.get(String(client.cliente_id)) ?? [];
      const activeContracts = clientContracts.filter(
        (contract) => isActiveContract(contract),
      );
      const mrr = activeContracts.reduce(
        (sum, contract) => sum + recurringValue(contract),
        0,
      );
      const oneshot = activeContracts.reduce(
        (sum, contract) => sum + oneShotValue(contract),
        0,
      );
      const ltv = clientContracts.reduce(
        (sum, contract) =>
          sum +
          number(contract.valor_contrato) +
          number(contract.fee_mensal) * number(contract.meses),
        0,
      );
      const investor = investorById.get(String(client.investidor_id));
      return {
        id: client.cliente_id,
        nome: client.nome || "Cliente sem nome",
        squad:
          squadById.get(String(client.squad_responsavel_id)) || "Indefinido",
        responsavel: investor?.nome || "Sem responsável",
        ativo: Boolean(client.ativo),
        gmv: number(client.gmv),
        mrr,
        oneshot,
        ltv,
        contratos: activeContracts.length,
        segmento:
          segmentById.get(String(client.segmento_id)) ||
          (client.segmento_id ? `#${client.segmento_id}` : "—"),
        origem: client.origem_id ? `#${client.origem_id}` : "—",
        entrada: formatBr(client.data_entrada),
        entradaMes: monthKey(client.data_entrada),
        churnMes: monthKey(client.data_churn),
      };
    });

    const squadMetrics = squads
      .map((squad) => {
        const squadClients = clientes.filter(
          (client) =>
            String(client.squad_responsavel_id) === String(squad.squad_id),
        );
        const ativos = squadClients.filter((client) => client.ativo).length;
        const churned = squadClients.length - ativos;
        const squadClientIds = new Set(
          squadClients.map((client) => String(client.cliente_id)),
        );
        const squadContracts = contratos.filter((contract) =>
          squadClientIds.has(String(contract.cliente_id)),
        );
        return {
          id: squad.squad_id,
          nome: squad.nome,
          ativos,
          churned,
          churn: squadClients.length
            ? (churned / squadClients.length) * 100
            : 0,
          gmv: squadClients
            .filter((client) => client.ativo)
            .reduce((sum, client) => sum + number(client.gmv), 0),
          mrr: squadContracts
            .filter((contract) => isActiveContract(contract))
            .reduce((sum, contract) => sum + recurringValue(contract), 0),
          oneshot: squadContracts
            .filter((contract) => isActiveContract(contract))
            .reduce((sum, contract) => sum + oneShotValue(contract), 0),
          ltv: squadContracts.reduce(
            (sum, contract) =>
              sum +
              number(contract.valor_contrato) +
              number(contract.fee_mensal) * number(contract.meses),
            0,
          ),
        };
      })
      .filter((row) => row.ativos || row.churned || row.mrr);

    const monthMap = new Map<
      string,
      {
        mes: string;
        entradas: number;
        churns: number;
        contratos: number;
        mrr: number;
        oneshot: number;
      }
    >();
    const ensureMonth = (mes: string) => {
      if (!monthMap.has(mes)) {
        monthMap.set(mes, {
          mes,
          entradas: 0,
          churns: 0,
          contratos: 0,
          mrr: 0,
          oneshot: 0,
        });
      }
      return monthMap.get(mes)!;
    };
    for (const client of clientes) {
      const entryMonth = monthKey(client.data_entrada);
      const churnMonth = monthKey(client.data_churn);
      if (entryMonth) ensureMonth(entryMonth).entradas += 1;
      if (churnMonth) ensureMonth(churnMonth).churns += 1;
    }
    for (const contract of contratos) {
      const signedMonth = monthKey(
        contract.data_assinatura || contract.data_contrato,
      );
      if (signedMonth) {
        ensureMonth(signedMonth).contratos += 1;
        ensureMonth(signedMonth).mrr += recurringValue(contract);
        ensureMonth(signedMonth).oneshot += oneShotValue(contract);
      }
    }
    const monthly = [...monthMap.values()].sort((a, b) =>
      a.mes.localeCompare(b.mes),
    );

    const cohortGroups = new Map<string, Row[]>();
    for (const client of clientes) {
      const key = monthKey(client.data_entrada);
      if (!key) continue;
      if (!cohortGroups.has(key)) cohortGroups.set(key, []);
      cohortGroups.get(key)!.push(client);
    }
    const now = new Date();
    const cohorts = [...cohortGroups.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([coorte, rows]) => {
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
        return {
          coorte,
          tamanho: rows.length,
          m1: retained(1),
          m3: retained(3),
          m6: retained(6),
          m12: retained(12),
        };
      });

    const owners = investidores
      .map((investor) => {
        const ownerClients = clientes.filter(
          (client) =>
            String(client.investidor_id) === String(investor.investidor_id),
        );
        const ownerContracts = contratos.filter(
          (contract) =>
            String(contract.investidor_id) === String(investor.investidor_id),
        );
        const renewable = ownerContracts.filter(
          (contract) => contract.renovavel,
        );
        return {
          nome: investor.nome || "Sem nome",
          squad: squadById.get(String(investor.squad_id)) || "Indefinido",
          ativos: ownerClients.filter((client) => client.ativo).length,
          churned: ownerClients.filter((client) => !client.ativo).length,
          mrr: ownerContracts
            .filter((contract) => isActiveContract(contract))
            .reduce((sum, contract) => sum + recurringValue(contract), 0),
          oneshot: ownerContracts
            .filter((contract) => isActiveContract(contract))
            .reduce((sum, contract) => sum + oneShotValue(contract), 0),
          renovacao: ownerContracts.length
            ? Number(
                ((renewable.length / ownerContracts.length) * 100).toFixed(1),
              )
            : 0,
        };
      })
      .filter((owner) => owner.ativos || owner.churned || owner.mrr)
      .sort((a, b) => b.mrr - a.mrr);

    const contractById = new Map(
      contratos.map((contract) => [String(contract.contrato_id), contract]),
    );
    const financialsByClientInvestorService = new Map<
      string,
      { recurring: number; oneShot: number }
    >();
    const assignedContractIds = new Set(
      contratoEquipe.map((assignment) => String(assignment.contrato_id)),
    );
    const seenAssignments = new Set<string>();
    for (const assignment of contratoEquipe) {
      const contract = contractById.get(String(assignment.contrato_id));
      if (!contract || !isActiveContract(contract)) continue;
      const keyParts = [
        String(contract.cliente_id),
        String(assignment.investidor_id),
        String(assignment.servico_id),
      ];
      const assignmentKey = [String(contract.contrato_id), ...keyParts].join(":");
      if (seenAssignments.has(assignmentKey)) continue;
      seenAssignments.add(assignmentKey);
      const key = keyParts.join(":");
      const financials = financialsByClientInvestorService.get(key) ?? {
        recurring: 0,
        oneShot: 0,
      };
      financials.recurring += recurringValue(contract);
      financials.oneShot += oneShotValue(contract);
      financialsByClientInvestorService.set(key, financials);
    }

    const serviceIdByPlanId = new Map(
      planos.map((plan) => [String(plan.plano_id), String(plan.servico_id)]),
    );
    const serviceIdsByContractId = new Map<string, Set<string>>();
    for (const link of contratoPlanos) {
      const serviceId = serviceIdByPlanId.get(String(link.plano_id));
      if (!serviceId) continue;
      const contractId = String(link.contrato_id);
      if (!serviceIdsByContractId.has(contractId)) {
        serviceIdsByContractId.set(contractId, new Set());
      }
      serviceIdsByContractId.get(contractId)!.add(serviceId);
    }
    for (const assignment of contratoEquipe) {
      const contractId = String(assignment.contrato_id);
      if (!serviceIdsByContractId.has(contractId)) {
        serviceIdsByContractId.set(contractId, new Set());
      }
      serviceIdsByContractId
        .get(contractId)!
        .add(String(assignment.servico_id));
    }

    const serviceMetricsById = new Map<
      string,
      {
        recurring: number;
        oneShot: number;
        recurringContracts: number;
        oneShotContracts: number;
        activeContracts: number;
      }
    >();
    for (const contract of contratos) {
      if (!isActiveContract(contract)) continue;
      const serviceIds = serviceIdsByContractId.get(String(contract.contrato_id));
      if (!serviceIds) continue;
      const recurring = recurringValue(contract);
      const oneShot = oneShotValue(contract);
      for (const serviceId of serviceIds) {
        const metrics = serviceMetricsById.get(serviceId) ?? {
          recurring: 0,
          oneShot: 0,
          recurringContracts: 0,
          oneShotContracts: 0,
          activeContracts: 0,
        };
        metrics.recurring += recurring;
        metrics.oneShot += oneShot;
        metrics.activeContracts += 1;
        if (recurring > 0) metrics.recurringContracts += 1;
        if (oneShot > 0) metrics.oneShotContracts += 1;
        serviceMetricsById.set(serviceId, metrics);
      }
    }
    const services = servicos
      .flatMap((service) => {
        const metrics = serviceMetricsById.get(String(service.servico_id));
        if (!metrics) return [];
        return [
          {
            id: service.servico_id,
            nome: service.nome || "Serviço sem nome",
            ...metrics,
            recurringTicket: metrics.recurringContracts
              ? metrics.recurring / metrics.recurringContracts
              : 0,
            oneShotTicket: metrics.oneShotContracts
              ? metrics.oneShot / metrics.oneShotContracts
              : 0,
          },
        ];
      })
      .sort(
        (a, b) =>
          b.recurring + b.oneShot - (a.recurring + a.oneShot) ||
          String(a.nome).localeCompare(String(b.nome), "pt-BR"),
      );
    const inferredFinancialsByClientService = new Map<
      string,
      { recurring: number; oneShot: number }
    >();
    for (const contract of contratos) {
      const contractId = String(contract.contrato_id);
      if (!isActiveContract(contract) || assignedContractIds.has(contractId)) {
        continue;
      }
      const serviceIds = serviceIdsByContractId.get(contractId);
      if (!serviceIds) continue;
      for (const serviceId of serviceIds) {
        const key = `${String(contract.cliente_id)}:${serviceId}`;
        const financials = inferredFinancialsByClientService.get(key) ?? {
          recurring: 0,
          oneShot: 0,
        };
        financials.recurring += recurringValue(contract);
        financials.oneShot += oneShotValue(contract);
        inferredFinancialsByClientService.set(key, financials);
      }
    }
    const clientById = new Map(
      clientes.map((row) => [String(row.cliente_id), row]),
    );
    const teamRows = equipe.flatMap((link) => {
      const client = clientById.get(String(link.cliente_id));
      const investor = investorById.get(String(link.investidor_id));
      if (!client || !investor) return [];
      const assignedFinancials = financialsByClientInvestorService.get(
        [
          String(link.cliente_id),
          String(link.investidor_id),
          String(link.servico_id),
        ].join(":"),
      );
      const inferredFinancials = inferredFinancialsByClientService.get(
        `${String(link.cliente_id)}:${String(link.servico_id)}`,
      );
      if (!assignedFinancials && !inferredFinancials) return [];
      return [
        [
          functionById.get(String(investor.funcao_id)) ||
            "Função não definida",
          investor.nome || "Sem responsável",
          squadById.get(String(investor.squad_id)) || "Indefinido",
          client.nome || "Cliente sem nome",
          serviceById.get(String(link.servico_id)) || "Serviço não definido",
          (assignedFinancials?.recurring ?? 0) +
            (inferredFinancials?.recurring ?? 0),
          (assignedFinancials?.oneShot ?? 0) +
            (inferredFinancials?.oneShot ?? 0),
          Boolean(client.ativo),
          Boolean(investor.ativo),
          investor.investidor_id,
          capacityByInvestorId.get(String(investor.investidor_id)) ?? null,
        ],
      ];
    });
    const demandGoals = metaDemandas.map((row) => {
      const client = clientById.get(String(row.cliente_id));
      const assignedInvestors = [row.account_id, row.gestor_trafego_id, row.designer_id]
        .filter((id) => id !== null && id !== undefined)
        .map((id) => investorById.get(String(id)))
        .filter(Boolean);
      const investorName = (id: unknown) =>
        investorById.get(String(id))?.nome || "Não definido";
      return {
        id: row.meta_demanda_id,
        cliente: client?.nome || "Cliente não definido",
        clienteAtivo: Boolean(client?.ativo),
        squad: squadById.get(String(row.squad_id)) || "Indefinido",
        account: investorName(row.account_id),
        gestorTrafego: investorName(row.gestor_trafego_id),
        designer: investorName(row.designer_id),
        investidorAtivo:
          assignedInvestors.length > 0 &&
          assignedInvestors.every((investor) => Boolean(investor?.ativo)),
        ano: number(row.ano),
        semana: number(row.semana),
        mes: number(row.mes),
        meta: number(row.meta_demanda),
        resultado: number(row.resultado_semanal),
        bateuMeta: Boolean(row.bateu_meta),
        checkinRealizado: Boolean(row.checkin_realizado),
        objetivo: row.objetivo_projeto || "—",
      };
    });

    return {
      extractedAt: new Date().toISOString(),
      squads: squadMetrics,
      monthly,
      cohorts,
      owners,
      clients,
      teamRows,
      services,
      demandGoals,
    };
}
