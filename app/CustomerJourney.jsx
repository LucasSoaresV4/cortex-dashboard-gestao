"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CalendarClock, CircleDollarSign, Search, Users, Waypoints, X } from "lucide-react";

const PHASES = [
  { name: "Onboarding", short: "Onboarding", min: 0, max: 1, color: "#74b9ff" },
  { name: "Acompanhamento Intensivo", short: "Intensivo", min: 1, max: 3, color: "#a78bfa" },
  { name: "Ongoing 1", short: "Ongoing 1", min: 3, max: 6, color: "#f0a33a" },
  { name: "Ongoing 2", short: "Ongoing 2", min: 6, max: 9, color: "#f97316" },
  { name: "Fidelização", short: "Fidelização", min: 9, max: 12, color: "#ef697b" },
  { name: "Fiel 1", short: "Fiel 1", min: 12, max: 24, color: "#52d681" },
  { name: "Fiel 2", short: "Fiel 2", min: 24, max: Infinity, color: "#21b573" },
];

const money = value => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(value || 0);
const compact = value => new Intl.NumberFormat("pt-BR", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
const dateBr = value => value ? new Date(`${String(value).slice(0,10)}T12:00:00`).toLocaleDateString("pt-BR") : "—";
const parseDate = value => value ? new Date(`${String(value).slice(0,10)}T12:00:00`) : null;
const elapsedMonths = (start, end) => Math.max(0, (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30.4375));
const phaseFor = months => PHASES.find(phase => months <= phase.max) || PHASES.at(-1);
const chartTip = { contentStyle:{background:"#15171c",border:"1px solid #30343b",borderRadius:12,color:"#f3f4f6",fontSize:12},labelStyle:{color:"#f3f4f6",fontWeight:700},itemStyle:{color:"#f3f4f6"} };

function Metric({ label, value, detail, icon: Icon, tone = "neutral" }) {
  return <article className={`kpi ${tone}`}><div className="kpi-top"><span>{label}</span><Icon size={17}/></div><strong>{value}</strong><small>{detail}</small></article>;
}

export default function CustomerJourney({ clients = [] }) {
  const [squad, setSquad] = useState("Todos");
  const [status, setStatus] = useState("Todos");
  const [phase, setPhase] = useState("Todas");
  const [search, setSearch] = useState("");
  const journeyRows = useMemo(() => clients.map(client => {
    const start = parseDate(client.dataEntrada);
    const churn = parseDate(client.dataChurn);
    const end = client.ativo ? new Date() : churn;
    if (!start || !end || end < start) return null;
    const lifetime = elapsedMonths(start, end);
    return { ...client, lifetime, journeyPhase: phaseFor(lifetime), journeyEnd: end };
  }).filter(Boolean), [clients]);
  const squads = useMemo(() => [...new Set(journeyRows.map(row => row.squad))].sort((a,b) => a.localeCompare(b,"pt-BR")), [journeyRows]);
  const filtered = useMemo(() => journeyRows.filter(row =>
    (squad === "Todos" || row.squad === squad) &&
    (status === "Todos" || (status === "Ativos" ? row.ativo : !row.ativo)) &&
    (phase === "Todas" || row.journeyPhase.name === phase) &&
    (!search || row.nome.toLowerCase().includes(search.toLowerCase()))
  ), [journeyRows, squad, status, phase, search]);
  const phaseRows = useMemo(() => PHASES.map(item => {
    const rows = filtered.filter(row => row.journeyPhase.name === item.name);
    const revenue = rows.reduce((sum,row) => sum + Number(row.receita || row.mrr || 0), 0);
    const lifetime = rows.length ? rows.reduce((sum,row) => sum + row.lifetime, 0) / rows.length : 0;
    return { ...item, clientes: rows.length, receita: revenue, ticket: rows.length ? revenue / rows.length : 0, lifetime };
  }), [filtered]);
  const totalRevenue = filtered.reduce((sum,row) => sum + Number(row.receita || row.mrr || 0), 0);
  const averageLifetime = filtered.length ? filtered.reduce((sum,row) => sum + row.lifetime, 0) / filtered.length : 0;
  const dominant = phaseRows.slice().sort((a,b) => b.clientes - a.clientes)[0];

  return <div className="journey-page">
    <article className="panel journey-filter-panel"><div className="panel-title"><div><small>FILTROS DA JORNADA</small><h2>Recorte da carteira</h2></div><span>{filtered.length} clientes</span></div><div className="filters journey-filters">
      <label className="filter-field"><span>Squad</span><select value={squad} onChange={event=>setSquad(event.target.value)}><option>Todos</option>{squads.map(name=><option key={name}>{name}</option>)}</select></label>
      <label className="filter-field"><span>Status do cliente</span><select value={status} onChange={event=>setStatus(event.target.value)}><option value="Todos">Todos os clientes</option><option value="Ativos">Clientes ativos</option><option value="Inativos">Clientes inativos</option></select></label>
      <label className="filter-field"><span>Fase</span><select value={phase} onChange={event=>setPhase(event.target.value)}><option>Todas</option>{PHASES.map(item=><option key={item.name}>{item.name}</option>)}</select></label>
      <label className="filter-field search-field"><span>Cliente</span><div className="filter-input"><Search size={15}/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Buscar cliente..."/></div></label>
      {(squad!=="Todos"||status!=="Todos"||phase!=="Todas"||search)&&<button className="clear" onClick={()=>{setSquad("Todos");setStatus("Todos");setPhase("Todas");setSearch("")}}><X size={14}/>Limpar</button>}
    </div></article>
    <section className="kpis journey-kpis"><Metric label="Clientes na jornada" value={filtered.length} detail="com datas válidas para análise" icon={Users}/><Metric label="Receita da carteira" value={money(totalRevenue)} detail="recorrência contratada dos clientes" icon={CircleDollarSign} tone="positive"/><Metric label="Lifetime médio" value={`${averageLifetime.toLocaleString("pt-BR",{maximumFractionDigits:1})} meses`} detail="entrada até hoje ou churn" icon={CalendarClock}/><Metric label="Fase predominante" value={dominant?.clientes?dominant.name:"—"} detail={dominant?.clientes?`${dominant.clientes} clientes nesta fase`:"sem clientes no recorte"} icon={Waypoints} tone="warning"/></section>
    <article className="panel journey-stage-panel"><div className="panel-title"><div><small>DISTRIBUIÇÃO DA CARTEIRA</small><h2>Clientes por fase da jornada</h2></div><span>quantidade × receita</span></div><ResponsiveContainer width="100%" height={330}><BarChart data={phaseRows} margin={{left:5,right:15,bottom:10}}><CartesianGrid stroke="#24272e" vertical={false}/><XAxis dataKey="short" tick={{fill:"#9ca2ad",fontSize:10}} axisLine={false} tickLine={false}/><YAxis yAxisId="clients" allowDecimals={false} tick={{fill:"#7f8591",fontSize:10}} axisLine={false} tickLine={false}/><YAxis yAxisId="revenue" orientation="right" tickFormatter={compact} tick={{fill:"#7f8591",fontSize:10}} axisLine={false} tickLine={false}/><Tooltip {...chartTip} formatter={(value,name)=>[name==="Receita"?money(value):value,name]}/><Bar yAxisId="clients" dataKey="clientes" name="Clientes" radius={[5,5,0,0]}>{phaseRows.map(row=><Cell key={row.name} fill={row.color}/>)}</Bar><Bar yAxisId="revenue" dataKey="receita" name="Receita" fill="#454b55" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer></article>
    <article className="panel table-panel"><div className="table-title"><div><small>FASES DA JORNADA</small><h2>Quantidade, receita e lifetime</h2></div></div><div className="table-wrap"><table className="journey-summary-table"><thead><tr><th>Fase</th><th>Período</th><th>Clientes</th><th>Receita</th><th>Receita média</th><th>Lifetime médio</th><th>% da carteira</th></tr></thead><tbody>{phaseRows.map(row=><tr key={row.name}><td><span className="journey-phase-dot" style={{background:row.color}}/><b>{row.name}</b></td><td>{row.max===Infinity?"Acima de 24 meses":`${row.min||0} a ${row.max} meses`}</td><td>{row.clientes}</td><td>{money(row.receita)}</td><td>{money(row.ticket)}</td><td>{row.lifetime.toLocaleString("pt-BR",{maximumFractionDigits:1})} meses</td><td>{filtered.length?(row.clientes/filtered.length*100).toLocaleString("pt-BR",{maximumFractionDigits:1}):0}%</td></tr>)}</tbody></table></div></article>
    <article className="panel table-panel"><div className="table-title"><div><small>DETALHAMENTO DA CARTEIRA</small><h2>Clientes na jornada</h2></div><span className="service-count">{filtered.length} clientes</span></div><div className="table-wrap"><table className="journey-client-table"><thead><tr><th>Cliente</th><th>Status</th><th>Squad</th><th>Fase</th><th>Entrada</th><th>Churn</th><th>Lifetime</th><th>Receita</th></tr></thead><tbody>{filtered.slice().sort((a,b)=>b.lifetime-a.lifetime).map(row=><tr key={row.id}><td><b>{row.nome}</b></td><td><span className={`badge ${row.ativo?"on":"off"}`}>{row.ativo?"Ativo":"Churn"}</span></td><td>{row.squad}</td><td><span className="journey-phase-dot" style={{background:row.journeyPhase.color}}/>{row.journeyPhase.name}</td><td>{dateBr(row.dataEntrada)}</td><td>{row.ativo?"Em andamento":dateBr(row.dataChurn)}</td><td>{row.lifetime.toLocaleString("pt-BR",{maximumFractionDigits:1})} meses</td><td>{money(row.receita||row.mrr)}</td></tr>)}</tbody></table></div>{!filtered.length&&<div className="empty-state">Nenhum cliente encontrado para os filtros selecionados.</div>}</article>
    <div className="economics-method"><CalendarClock size={15}/><span><b>Regra de lifetime:</b> clientes ativos usam data de entrada até hoje; clientes inativos usam data de entrada até a data de churn. Registros sem as datas necessárias não entram na análise.</span></div>
  </div>;
}
