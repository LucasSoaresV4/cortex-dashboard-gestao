"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Line, LineChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, BriefcaseBusiness, ChevronLeft,
  ChevronRight, CircleDollarSign, Download, Filter, LayoutDashboard, Search,
  ShieldCheck, TrendingUp, UserRoundCog, Users, X
} from "lucide-react";
import snapshotTeamRows from "./team-data";

const RED = "#ef233c";
const snapshotSquads = [
  {id:10,nome:"S.W.A.T",ativos:29,churned:18,churn:38.3,gmv:1701611000,mrr:204746.91,ltv:264130.91},
  {id:11,nome:"GrowthHunters",ativos:95,churned:96,churn:50.3,gmv:70540005,mrr:174629,ltv:174629},
  {id:7,nome:"SP",ativos:0,churned:2,churn:100,gmv:0,mrr:148101,ltv:148101},
  {id:12,nome:"Zyverix",ativos:21,churned:21,churn:50,gmv:7013000,mrr:125026.02,ltv:125026.02},
  {id:5,nome:"Cybers",ativos:26,churned:13,churn:33.3,gmv:67950000.01,mrr:106687.2,ltv:280516.6},
  {id:13,nome:"DONOZZZ",ativos:21,churned:11,churn:34.4,gmv:33750001,mrr:94163.7,ltv:94163.7},
  {id:8,nome:"Indefinido",ativos:2,churned:9,churn:81.8,gmv:271000,mrr:55884,ltv:55884},
  {id:14,nome:"W.O.L.V.E.S",ativos:0,churned:10,churn:100,gmv:0,mrr:45800,ltv:45800},
  {id:4,nome:"Sales Hunters",ativos:0,churned:13,churn:100,gmv:0,mrr:36376,ltv:36376},
];
const snapshotMonthly = [
["2025-08",15,19,16,49588],["2025-09",11,15,9,37050],["2025-10",35,22,38,83804],
["2025-11",25,22,28,44435],["2025-12",10,24,12,14460],["2026-01",26,21,45,73948],
["2026-02",24,9,35,6461],["2026-03",29,16,31,0],["2026-04",31,26,43,0],
["2026-05",37,31,44,7493],["2026-06",59,30,64,0],["2026-07",26,4,41,0]
].map(([mes,entradas,churns,contratos,mrr])=>({mes,entradas,churns,contratos,mrr}));
const snapshotCohorts = [
["2025-02",19,100,73.7,52.6,10.5],["2025-03",15,100,86.7,80,46.7],["2025-04",15,100,80,53.3,13.3],
["2025-05",24,87.5,62.5,29.2,4.2],["2025-06",16,81.3,75,31.3,6.3],["2025-07",18,94.4,83.3,38.9,16.7],
["2025-08",15,100,66.7,46.7,20],["2025-09",11,100,90.9,45.5,27.3],["2025-10",35,91.4,57.1,31.4,17.1],
["2025-11",25,96,68,52,48],["2025-12",10,90,70,50,40],["2026-01",26,76.9,65.4,46.2,42.3],
["2026-02",24,91.7,58.3,33.3,33.3],["2026-03",29,89.7,51.7,41.4,41.4],["2026-04",31,80.6,22.6,22.6,22.6],
["2026-05",37,91.9,62.2,62.2,62.2],["2026-06",59,100,100,100,100],["2026-07",26,100,100,100,100]
].map(([coorte,tamanho,m1,m3,m6,m12])=>({coorte,tamanho,m1,m3,m6,m12}));
const snapshotOwners = [
["Gabriel Martins Bosquet Cavalcante","SP",0,5,148101,0],["Giulia Raposo Batista","S.W.A.T",7,15,102249,33.3],
["Neilson Lucas Soares Penha","Cybers",14,15,60171,10.7],["Lennary Grazielly Lopes Ferreira","GrowthHunters",89,66,58315,2.4],
["Bianca Pinto dos Santos","DONOZZZ",14,14,49153,33.3],["Pedro Felipe Furtado Veras Travassos","W.O.L.V.E.S",0,17,45800,0],
["Karine Pinheiro","DONOZZZ",7,6,45011,15.8],["Maria Antonia dos Santos","Zyverix",8,11,42455,28],
["Mariana Botelho Figueiredo","Cybers",0,29,39261,0],["Bianca Francisca Franco Serra","S.W.A.T",9,8,38278,43.8],
["Emmylle Dutra","Cybers",7,4,38016,11.1],["Lucas Santos do Vale","S.W.A.T",7,2,21577,30.8]
].map(([nome,squad,ativos,churned,mrr,renovacao])=>({nome,squad,ativos,churned,mrr,renovacao}));
const snapshotClients = [
["Armazzem","S.W.A.T","Giulia Raposo Batista",true,40000000,23734.77,23734.77,3,70,5,"12/01/2026"],
["Equatorial","S.W.A.T","Giulia Raposo Batista",true,830000000,18000,0,1,70,11,"31/01/2024"],
["Rosa's Churrascaria","S.W.A.T","Jonas Dias",true,400000,12000,12000,2,70,19,"20/01/2026"],
["Aqui Brazil","DONOZZZ","Karine Pinheiro",true,0,10366.7,10366.7,2,70,10,"02/12/2025"],
["Duvel","S.W.A.T","Giulia Raposo Batista",true,16000000,10075,10075,1,70,9,"05/11/2025"],
["Grupo Atax","Cybers","Neilson Lucas Soares Penha",true,5000000,10000,10000,1,70,3,"21/09/2023"],
["Mege Cursos","Cybers","Neilson Lucas Soares Penha",true,1000000,9000,160000,2,70,4,"17/06/2024"],
["EOS Systems","DONOZZZ","Karine Pinheiro",true,16000000,8125,8125,1,70,9,"15/10/2025"],
["Zullo / Angatu","Cybers","Neilson Lucas Soares Penha",true,4000000,8000,8000,1,70,10,"01/10/2025"],
["Complexo Salvatore","S.W.A.T","Lucas Santos do Vale",true,1800000,7500,7500,1,70,1,"01/02/2024"],
["Projeto Ambiental","DONOZZZ","Bianca Pinto dos Santos",true,350000,7500,7500,1,70,9,"25/04/2025"],
["Laboratório Cedro","S.W.A.T","Bianca Francisca Franco Serra",true,0,7282,94666,1,70,4,"21/02/2025"],
["Wert Gerenciamento","DONOZZZ","Bianca Pinto dos Santos",true,600000,7076,7076,1,70,9,"20/01/2025"],
["Iliberty Tecnologia","Cybers","Emmylle Dutra",true,300000,6700,6700,5,70,5,"18/07/2025"],
["Canuma Capital","S.W.A.T","Ryan Silva Costa de Oliveira",true,500000,6500,6500,1,70,9,"13/08/2025"],
["Veletrica Distribuidora","S.W.A.T","Lucas Santos do Vale",true,0,6450,6450,1,70,9,"15/09/2025"],
["MAQBELTING","S.W.A.T","Jonas Dias",true,200000,5942,5942,2,70,9,"28/01/2026"],
["Colégio Objetivo","Zyverix","Maria Antonia dos Santos",true,600000,5600,5600,1,114,9,"16/01/2025"],
["AndMax Locadora","Cybers","Emmylle Dutra",true,1000000,5150,5150,3,70,9,"10/11/2025"],
["Stone Ativos","Cybers","Emmylle Dutra",true,150000,4000,4000,4,70,9,"31/07/2025"],
["Equatorial Telecom","S.W.A.T","Bianca Francisca Franco Serra",true,800000000,0,0,0,9,1,"16/09/2025"],
["TF Hub","—","Neilson Lucas Soares Penha",true,0,0,0,0,70,1,"05/01/2026"],
["Adidas do Brasil","Cybers","Neilson Lucas Soares Penha",true,40000000,0,0,1,70,9,"26/11/2025"],
["Guaravita","GrowthHunters","Leonam Lael Alves Pinto",true,16000000,0,0,1,30,19,"20/05/2026"],
["Kimberly Metais","S.W.A.T","Lucas Santos do Vale",true,1000000,0,0,2,24,19,"02/03/2026"],
["Mundo Telecom","GrowthHunters","Lennary Grazielly Lopes Ferreira",true,800000,0,0,1,9,19,"03/06/2026"],
].map(([nome,squad,responsavel,ativo,gmv,mrr,ltv,contratos,segmento,origem,entrada],i)=>({id:1000+i,nome,squad,responsavel,ativo,gmv,mrr,ltv,contratos,segmento,origem,entrada}));

const money = v => new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL",maximumFractionDigits:0}).format(v||0);
const compact = v => new Intl.NumberFormat("pt-BR",{notation:"compact",maximumFractionDigits:1}).format(v||0);
const monthLabel = m => new Date(`${m}-02T12:00:00`).toLocaleDateString("pt-BR",{month:"short",year:"2-digit"});
const chartTip = {contentStyle:{background:"#15171c",border:"1px solid #30343b",borderRadius:12,color:"#fff",fontSize:12}};

function Kpi({label,value,detail,icon:Icon,tone="neutral"}) {
  return <article className={`kpi ${tone}`}><div className="kpi-top"><span>{label}</span><Icon size={17}/></div><strong>{value}</strong><small>{detail}</small></article>;
}

export default function Dashboard(){
  const [liveData,setLiveData]=useState(null);
  const [dataError,setDataError]=useState("");
  const [refreshing,setRefreshing]=useState(true);
  const [tab,setTab]=useState("visao");
  const [period,setPeriod]=useState(12);
  const [squad,setSquad]=useState("Todos");
  const [search,setSearch]=useState("");
  const [status,setStatus]=useState("Todos");
  const [page,setPage]=useState(1);
  const [teamFunction,setTeamFunction]=useState("Gestor de Tráfego");
  const [teamSearch,setTeamSearch]=useState("");
  const [teamSquad,setTeamSquad]=useState("Todos");
  const [teamClientStatus,setTeamClientStatus]=useState("Ativos");
  const [teamInvestorStatus,setTeamInvestorStatus]=useState("Ativos");
  const pageSize=8;
  const squads=liveData?.squads||snapshotSquads;
  const monthly=liveData?.monthly||snapshotMonthly;
  const cohorts=liveData?.cohorts||snapshotCohorts;
  const owners=liveData?.owners||snapshotOwners;
  const clients=liveData?.clients||snapshotClients;
  const teamRows=liveData?.teamRows||snapshotTeamRows;
  const extractedAt=liveData?.extractedAt;
  useEffect(()=>{
    let active=true;
    const load=async()=>{
      setRefreshing(true);
      const controller=new AbortController();
      const timeout=window.setTimeout(()=>controller.abort(),15000);
      try{
        const response=await fetch("/api/dashboard",{cache:"no-store",signal:controller.signal});
        if(!response.ok) throw new Error("Falha ao consultar o TFHub");
        const payload=await response.json();
        if(active){setLiveData(payload);setDataError("");}
      }catch{
        if(active)setDataError("Não foi possível carregar os dados atuais. A última leitura disponível foi mantida.");
      }finally{
        window.clearTimeout(timeout);
        if(active)setRefreshing(false);
      }
    };
    load();
    const refreshTimer=window.setInterval(load,60000);
    return()=>{active=false;window.clearInterval(refreshTimer)};
  },[]);
  const periodData=monthly.slice(-period);
  const filtered=useMemo(()=>clients.filter(c=>
    (squad==="Todos"||c.squad===squad)&&
    (status==="Todos"||(status==="Ativos"?c.ativo:!c.ativo)||(status==="Sem contrato"&&c.ativo&&c.contratos===0))&&
    `${c.nome} ${c.responsavel}`.toLowerCase().includes(search.toLowerCase())
  ),[clients,squad,status,search]);
  const pages=Math.max(1,Math.ceil(filtered.length/pageSize));
  const pageRows=filtered.slice((Math.min(page,pages)-1)*pageSize,Math.min(page,pages)*pageSize);
  const chooseSquad=name=>{setSquad(squad===name?"Todos":name);setPage(1);document.getElementById("carteira")?.scrollIntoView({behavior:"smooth"});};
  const csv=()=>{
    const cols=["Cliente","Squad","Responsável","Status","GMV","MRR","Oneshot","LTV aproximado","Contratos","Segmento ID","Origem ID","Entrada"];
    const rows=filtered.map(c=>[c.nome,c.squad,c.responsavel,c.ativo?"Ativo":"Churn",c.gmv,c.mrr,c.oneshot,c.ltv,c.contratos,c.segmento,c.origem,c.entrada]);
    const blob=new Blob(["\ufeff"+[cols,...rows].map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(";")).join("\n")],{type:"text/csv;charset=utf-8"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="tfhub-clientes-filtrados.csv";a.click();URL.revokeObjectURL(a.href);
  };
  const clear=()=>{setSquad("Todos");setStatus("Todos");setSearch("");setPage(1)};
  const team=useMemo(()=>teamRows.map(row=>{
    const [funcao,responsavel,squad,cliente,servico,fee]=row;
    const hasOneShot=row.length>=9;
    const oneshot=hasOneShot?row[6]:0;
    const clienteAtivo=hasOneShot?row[7]:row[6]??true;
    const investidorAtivo=hasOneShot?row[8]:row[7]??true;
    return {funcao,responsavel,squad,cliente,servico,fee:Number(fee)||0,oneshot:Number(oneshot)||0,clienteAtivo:Boolean(clienteAtivo),investidorAtivo:Boolean(investidorAtivo)};
  }),[teamRows]);
  const teamFunctions=useMemo(()=>[...new Set(team.map(r=>r.funcao))].sort((a,b)=>a.localeCompare(b,"pt-BR")), [team]);
  const teamSquads=useMemo(()=>[...new Set(team.map(r=>r.squad))].sort((a,b)=>a.localeCompare(b,"pt-BR")), [team]);
  const visibleTeam=useMemo(()=>team.filter(r=>
    r.funcao===teamFunction &&
    (teamSquad==="Todos"||r.squad===teamSquad) &&
    (teamClientStatus==="Todos"||(teamClientStatus==="Ativos"?r.clienteAtivo:!r.clienteAtivo)) &&
    (teamInvestorStatus==="Todos"||(teamInvestorStatus==="Ativos"?r.investidorAtivo:!r.investidorAtivo)) &&
    `${r.responsavel} ${r.cliente} ${r.servico}`.toLowerCase().includes(teamSearch.toLowerCase())
  ),[team,teamFunction,teamSquad,teamClientStatus,teamInvestorStatus,teamSearch]);
  const groupedTeam=useMemo(()=>{
    const map=new Map();
    visibleTeam.forEach(r=>{
      if(!map.has(r.responsavel)) map.set(r.responsavel,{responsavel:r.responsavel,squad:r.squad,rows:[],fee:0,oneshot:0});
      const group=map.get(r.responsavel);
      group.rows.push(r);
      group.fee+=r.fee;
      group.oneshot+=r.oneshot;
    });
    return [...map.values()].sort((a,b)=>b.fee-a.fee||a.responsavel.localeCompare(b.responsavel,"pt-BR"));
  },[visibleTeam]);
  const uniqueTeamClients=new Set(visibleTeam.map(r=>r.cliente)).size;
  const totalTeamFee=visibleTeam.reduce((sum,r)=>sum+r.fee,0);
  const totalTeamOneShot=visibleTeam.reduce((sum,r)=>sum+r.oneshot,0);
  const activeClients=clients.filter(c=>c.ativo);
  const churnedClients=clients.length-activeClients.length;
  const totalMrr=clients.reduce((sum,c)=>sum+c.mrr,0);
  const totalOneShot=clients.reduce((sum,c)=>sum+(c.oneshot||0),0);
  const totalLtv=clients.reduce((sum,c)=>sum+c.ltv,0);
  const withoutContract=activeClients.filter(c=>c.contratos===0);
  const topOwner=owners[0];
  const bestRenewal=[...owners].sort((a,b)=>b.renovacao-a.renovacao)[0];
  const snapshotLabel=extractedAt?new Date(extractedAt).toLocaleString("pt-BR"):"carregando";
  const exportTeam=()=>{
    const cols=["Função","Responsável","Status do investidor","Squad","Cliente","Status do cliente","Serviço","Valor recorrente ativo","Oneshot ativo"];
    const rows=visibleTeam.map(r=>[r.funcao,r.responsavel,r.investidorAtivo?"Ativo":"Inativo",r.squad,r.cliente,r.clienteAtivo?"Ativo":"Inativo",r.servico,r.fee,r.oneshot]);
    const blob=new Blob(["\ufeff"+[cols,...rows].map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(";")).join("\n")],{type:"text/csv;charset=utf-8"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`tfhub-equipe-${teamFunction.toLowerCase().replaceAll(" ","-")}.csv`;a.click();URL.revokeObjectURL(a.href);
  };
  return <main>
    <aside className="sidebar">
      <div className="brand"><span>V4</span><div><b>TF HUB</b><small>GESTÃO DE CARTEIRA</small></div></div>
      <nav>
        <button className={tab==="visao"?"active":""} onClick={()=>setTab("visao")}><LayoutDashboard/>Visão geral</button>
        <button className={tab==="retencao"?"active":""} onClick={()=>setTab("retencao")}><TrendingUp/>Retenção</button>
        <button className={tab==="responsaveis"?"active":""} onClick={()=>setTab("responsaveis")}><Users/>Responsáveis</button>
        <button className={tab==="equipe"?"active":""} onClick={()=>setTab("equipe")}><UserRoundCog/>Clientes por função</button>
      </nav>
      <div className="security"><ShieldCheck/><div><b>Conexão protegida</b><small>Sem PII ou credenciais</small></div></div>
    </aside>
    <section className="content">
      <header>
        <div><p>PERFORMANCE & OPERAÇÕES</p><h1>{tab==="visao"?"Visão consolidada":tab==="retencao"?"Retenção & coortes":tab==="responsaveis"?"Performance por responsável":"Clientes por responsável e função"}</h1></div>
        <div className="header-actions"><div className="snapshot"><i/>{refreshing?"Atualizando…":`Atualizado • ${snapshotLabel}`}</div><div className="avatar">TF</div></div>
      </header>
      <div className="snapshot-note"><ShieldCheck size={16}/><b>Dados dinâmicos:</b> esta tela consulta automaticamente a nova base ao abrir e atualiza a cada minuto.</div>
      {dataError&&<div className="snapshot-note error-note"><AlertTriangle size={16}/><b>Falha de atualização:</b> {dataError}</div>}
      <div className="toolbar">
        <div className="period"><span>Período global</span>{[6,12,24].map(n=><button key={n} onClick={()=>setPeriod(n)} className={period===n?"selected":""}>{n} meses</button>)}</div>
        <div className="selection">{squad!=="Todos"&&<span>Squad: {squad}<button onClick={()=>setSquad("Todos")}><X size={13}/></button></span>}</div>
      </div>

      {tab==="visao"&&<>
        <section className="kpis">
          <Kpi label="Clientes ativos" value={activeClients.length} detail={`de ${clients.length} clientes no histórico`} icon={Users}/>
          <Kpi label="MRR ativo" value={money(totalMrr)} detail="contratos ativos vinculados" icon={CircleDollarSign} tone="positive"/>
          <Kpi label="Oneshot ativo" value={money(totalOneShot)} detail="valor bookado com prazo igual a zero" icon={BriefcaseBusiness} tone="warning"/>
          <Kpi label="LTV aproximado" value={money(totalLtv)} detail="valor + fee × meses contratados" icon={TrendingUp}/>
          <Kpi label="Churn histórico" value={`${clients.length?((churnedClients/clients.length)*100).toFixed(1).replace(".",","):"0"}%`} detail={`${churnedClients} clientes inativos`} icon={ArrowDownRight} tone="danger"/>
          <Kpi label="Sem contrato ativo" value={withoutContract.length} detail="clientes ativos para revisar" icon={AlertTriangle} tone="warning"/>
        </section>
        <section className="grid two">
          <article className="panel wide"><div className="panel-title"><div><small>MOVIMENTO DA CARTEIRA</small><h2>Entradas vs. churn</h2></div><span>{period} meses</span></div>
            <div className="legend"><i className="green"/>Entradas <i className="red"/>Churn</div>
            <ResponsiveContainer width="100%" height={285}><AreaChart data={periodData}><defs><linearGradient id="greenFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#52d681" stopOpacity=".28"/><stop offset="1" stopColor="#52d681" stopOpacity="0"/></linearGradient><linearGradient id="redFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={RED} stopOpacity=".3"/><stop offset="1" stopColor={RED} stopOpacity="0"/></linearGradient></defs><CartesianGrid stroke="#24272e" vertical={false}/><XAxis dataKey="mes" tickFormatter={monthLabel} tick={{fill:"#7f8591",fontSize:11}} axisLine={false} tickLine={false}/><YAxis tick={{fill:"#7f8591",fontSize:11}} axisLine={false} tickLine={false}/><Tooltip {...chartTip} labelFormatter={monthLabel}/><Area type="monotone" dataKey="entradas" stroke="#52d681" fill="url(#greenFill)" strokeWidth={2}/><Area type="monotone" dataKey="churns" stroke={RED} fill="url(#redFill)" strokeWidth={2}/></AreaChart></ResponsiveContainer>
          </article>
          <article className="panel"><div className="panel-title"><div><small>AÇÃO RECOMENDADA</small><h2>Leituras prioritárias</h2></div></div>
            <div className="insights"><div className="insight hot"><AlertTriangle/><p><b>{withoutContract.length} clientes ativos sem contrato ativo</b><span>{withoutContract.slice(0,3).map(c=>c.nome).join(", ")||"Nenhuma inconsistência encontrada"}.</span></p></div><div className="insight"><ArrowUpRight/><p><b>Squad com menor churn</b><span>{[...squads].filter(s=>s.ativos+s.churned>5).sort((a,b)=>a.churn-b.churn)[0]?.nome||"—"} entre carteiras relevantes.</span></p></div><div className="insight"><TrendingUp/><p><b>Dados atuais do TFHub</b><span>Indicadores recalculados a cada abertura do dashboard.</span></p></div></div>
          </article>
        </section>
        <section className="grid two">
          <article className="panel"><div className="panel-title"><div><small>CLIQUE PARA FILTRAR A CARTEIRA</small><h2>MRR por squad</h2></div></div>
            <ResponsiveContainer width="100%" height={300}><BarChart data={squads.slice(0,7)} layout="vertical" margin={{left:10,right:25}}><CartesianGrid stroke="#24272e" horizontal={false}/><XAxis type="number" tickFormatter={compact} tick={{fill:"#7f8591",fontSize:10}} axisLine={false} tickLine={false}/><YAxis type="category" dataKey="nome" width={100} tick={{fill:"#bcc0c8",fontSize:11}} axisLine={false} tickLine={false}/><Tooltip {...chartTip} formatter={v=>money(v)}/><Bar dataKey="mrr" radius={[0,6,6,0]} onClick={d=>chooseSquad(d.nome)} cursor="pointer">{squads.slice(0,7).map(s=><Cell key={s.id} fill={squad===s.nome?RED:"#6e737d"}/>)}</Bar></BarChart></ResponsiveContainer>
          </article>
          <article className="panel"><div className="panel-title"><div><small>RISCO POR EQUIPE</small><h2>Taxa de churn por squad</h2></div><span>clique em uma barra</span></div>
            <ResponsiveContainer width="100%" height={300}><BarChart data={squads.slice(0,7)} margin={{left:-15,right:8}}><CartesianGrid stroke="#24272e" vertical={false}/><XAxis dataKey="nome" tick={{fill:"#7f8591",fontSize:10}} axisLine={false} tickLine={false}/><YAxis domain={[0,100]} tickFormatter={v=>`${v}%`} tick={{fill:"#7f8591",fontSize:10}} axisLine={false} tickLine={false}/><Tooltip {...chartTip} formatter={v=>`${v}%`}/><Bar dataKey="churn" radius={[6,6,0,0]} onClick={d=>chooseSquad(d.nome)} cursor="pointer">{squads.slice(0,7).map(s=><Cell key={s.id} fill={s.churn>60?RED:s.churn>45?"#f0a33a":"#52d681"}/>)}</Bar></BarChart></ResponsiveContainer>
          </article>
        </section>
      </>}

      {tab==="retencao"&&<>
        <section className="kpis compact-kpis"><Kpi label="Melhor coorte madura" value="Nov/25" detail="48% retidos em M12" icon={TrendingUp} tone="positive"/><Kpi label="Retenção mediana M6" value="44,1%" detail="coortes maduras exibidas" icon={Users}/><Kpi label="Maior queda" value="M3 → M6" detail="janela crítica de retenção" icon={ArrowDownRight} tone="danger"/></section>
        <article className="panel"><div className="panel-title"><div><small>CURVA DE RETENÇÃO</small><h2>Percentual ativo por idade da coorte</h2></div><span>coortes de entrada</span></div>
          <ResponsiveContainer width="100%" height={330}><LineChart data={cohorts.filter((_,i)=>i<12)}><CartesianGrid stroke="#24272e" vertical={false}/><XAxis dataKey="coorte" tick={{fill:"#7f8591",fontSize:10}} axisLine={false}/><YAxis domain={[0,100]} tickFormatter={v=>`${v}%`} tick={{fill:"#7f8591",fontSize:10}} axisLine={false}/><Tooltip {...chartTip} formatter={v=>`${v}%`}/><Line dataKey="m1" name="M1" stroke="#f7f7f8" strokeWidth={2} dot={false}/><Line dataKey="m3" name="M3" stroke="#f0a33a" strokeWidth={2} dot={false}/><Line dataKey="m6" name="M6" stroke={RED} strokeWidth={2} dot={false}/><Line dataKey="m12" name="M12" stroke="#8c5cff" strokeWidth={2} dot={false}/></LineChart></ResponsiveContainer>
        </article>
        <article className="panel cohort-panel"><div className="panel-title"><div><small>MAPA DE COORTES</small><h2>Retenção por mês de entrada</h2></div></div>
          <div className="cohort-table"><div className="cohort-head"><span>Coorte</span><span>Clientes</span><span>M1</span><span>M3</span><span>M6</span><span>M12</span></div>{cohorts.slice().reverse().map(c=><div className="cohort-row" key={c.coorte}><b>{c.coorte}</b><span>{c.tamanho}</span>{["m1","m3","m6","m12"].map(k=><span key={k} className="heat" style={{"--heat":Math.max(.08,c[k]/100)}}>{c[k]}%</span>)}</div>)}</div>
        </article>
      </>}

      {tab==="responsaveis"&&<>
        <section className="kpis"><Kpi label="Responsáveis analisados" value={owners.length} detail="com clientes ou contratos" icon={Users}/><Kpi label="Maior MRR gerido" value={money(topOwner?.mrr)} detail={topOwner?`${topOwner.nome} • ${topOwner.squad}`:"—"} icon={CircleDollarSign} tone="positive"/><Kpi label="Oneshot ativo" value={money(owners.reduce((sum,o)=>sum+(o.oneshot||0),0))} detail="projetos pontuais ativos" icon={BriefcaseBusiness} tone="warning"/><Kpi label="Melhor renovação" value={`${bestRenewal?.renovacao||0}%`} detail={bestRenewal?`${bestRenewal.nome} • ${bestRenewal.squad}`:"—"} icon={TrendingUp}/></section>
        <article className="panel"><div className="panel-title"><div><small>RANKING COMPLETO</small><h2>Performance por responsável</h2></div><span>snapshot de contratos</span></div>
          <div className="owner-list"><div className="owner-head owner-financial-head"><span>Responsável</span><span>Carteira</span><span>MRR ativo</span><span>Oneshot</span><span>Renovação</span></div>{owners.map((o,i)=><div className="owner-row owner-financial-row" key={o.nome}><div><i>{i+1}</i><p><b>{o.nome}</b><small>{o.squad}</small></p></div><span><b>{o.ativos}</b> ativos · {o.churned} churn</span><strong>{money(o.mrr)}</strong><strong>{money(o.oneshot)}</strong><div className="renew"><span>{o.renovacao}%</span><i><em style={{width:`${o.renovacao}%`}}/></i></div></div>)}</div>
        </article>
      </>}

      {tab==="equipe"&&<>
        <section className="kpis compact-kpis">
          <Kpi label="Responsáveis" value={groupedTeam.length} detail={`na função ${teamFunction}`} icon={UserRoundCog}/>
          <Kpi label="Clientes vinculados" value={uniqueTeamClients} detail={`${visibleTeam.length} vínculos de equipe`} icon={BriefcaseBusiness}/>
          <Kpi label="Recorrente ativo da carteira" value={money(totalTeamFee)} detail="soma mensal dos contratos ativos" icon={CircleDollarSign} tone="positive"/>
          <Kpi label="Oneshot ativo da carteira" value={money(totalTeamOneShot)} detail="projetos pontuais ativos" icon={BriefcaseBusiness} tone="warning"/>
        </section>
        <article className="panel team-panel">
          <div className="table-title"><div><small>CLIENTE_EQUIPE × FUNÇÕES × SERVIÇOS</small><h2>Distribuição da carteira</h2></div><button className="export" onClick={exportTeam}><Download size={16}/>Exportar CSV</button></div>
          <div className="team-function-tabs">{teamFunctions.map(name=><button key={name} className={teamFunction===name?"selected":""} onClick={()=>setTeamFunction(name)}>{name}</button>)}</div>
          <div className="filters team-filters">
            <label><Search size={16}/><input value={teamSearch} onChange={e=>setTeamSearch(e.target.value)} placeholder="Buscar responsável, cliente ou serviço..."/></label>
            <select aria-label="Filtrar por squad" value={teamSquad} onChange={e=>setTeamSquad(e.target.value)}><option>Todos</option>{teamSquads.map(name=><option key={name}>{name}</option>)}</select>
            <select aria-label="Filtrar por status do cliente" value={teamClientStatus} onChange={e=>setTeamClientStatus(e.target.value)}><option value="Todos">Todos os clientes</option><option value="Ativos">Clientes ativos</option><option value="Inativos">Clientes inativos</option></select>
            <select aria-label="Filtrar por status do investidor" value={teamInvestorStatus} onChange={e=>setTeamInvestorStatus(e.target.value)}><option value="Todos">Todos os investidores</option><option value="Ativos">Investidores ativos</option><option value="Inativos">Investidores inativos</option></select>
            {(teamSquad!=="Todos"||teamClientStatus!=="Ativos"||teamInvestorStatus!=="Ativos"||teamSearch)&&<button className="clear" onClick={()=>{setTeamSquad("Todos");setTeamClientStatus("Ativos");setTeamInvestorStatus("Ativos");setTeamSearch("")}}><X size={14}/>Limpar</button>}
          </div>
          <div className="team-grid">
            {groupedTeam.map(group=><section className="team-card" key={group.responsavel}>
              <div className="team-card-head"><div className="team-avatar">{group.responsavel.split(" ").slice(0,2).map(n=>n[0]).join("").toUpperCase()}</div><div><h3>{group.responsavel}</h3><span>{group.squad}</span></div><strong>{group.rows.length} {group.rows.length===1?"cliente":"clientes"}</strong></div>
              <div className="team-client-head"><span>Projeto / serviço</span><span>Recorrente</span><span>Oneshot</span></div>
              <div className="team-client-list">{group.rows.map((r,i)=><div className="team-client-row" key={`${r.cliente}-${r.servico}-${i}`}><div><b>{r.cliente}</b><small>{r.servico}</small></div><span>{money(r.fee)}</span><span>{money(r.oneshot)}</span></div>)}</div>
              <div className="team-card-total"><span>Total</span><b>{group.rows.length}</b><strong>{money(group.fee)}</strong><strong>{money(group.oneshot)}</strong></div>
            </section>)}
          </div>
          {!groupedTeam.length&&<div className="empty-state">Nenhum vínculo encontrado para os filtros selecionados.</div>}
        </article>
      </>}

      {tab!=="equipe"&&<article className="panel table-panel" id="carteira">
        <div className="table-title"><div><small>CLIENTES × CONTRATOS</small><h2>Carteira consolidada</h2></div><button className="export" onClick={csv}><Download size={16}/>Exportar CSV</button></div>
        <div className="filters"><label><Search size={16}/><input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Buscar cliente ou responsável..."/></label><select value={squad} onChange={e=>{setSquad(e.target.value);setPage(1)}}><option>Todos</option>{squads.map(s=><option key={s.id}>{s.nome}</option>)}</select><select value={status} onChange={e=>{setStatus(e.target.value);setPage(1)}}><option>Todos</option><option>Ativos</option><option>Churn</option><option>Sem contrato</option></select>{(squad!=="Todos"||status!=="Todos"||search)&&<button className="clear" onClick={clear}><X size={14}/>Limpar</button>}</div>
        <div className="table-wrap"><table><thead><tr><th>Cliente</th><th>Status</th><th>Squad / responsável</th><th>MRR</th><th>Oneshot</th><th>LTV aprox.</th><th>Contratos</th><th>Entrada</th></tr></thead><tbody>{pageRows.map(c=><tr key={c.id} className={c.ativo&&c.contratos===0?"flagged":""}><td><b>{c.nome}</b><small>Segmento {c.segmento??"—"} · Origem {c.origem??"—"}</small></td><td><span className={`badge ${c.ativo?"on":"off"}`}>{c.ativo?"Ativo":"Churn"}</span>{c.ativo&&c.contratos===0&&<span className="warning-tag">Sem contrato</span>}</td><td><b>{c.squad}</b><small>{c.responsavel}</small></td><td>{money(c.mrr)}</td><td>{money(c.oneshot)}</td><td>{money(c.ltv)}</td><td>{c.contratos}</td><td>{c.entrada}</td></tr>)}</tbody></table></div>
        <div className="pagination"><span>Exibindo {pageRows.length} de {filtered.length} registros filtrados</span><div><button disabled={page<=1} onClick={()=>setPage(p=>p-1)}><ChevronLeft/></button><b>{Math.min(page,pages)} / {pages}</b><button disabled={page>=pages} onClick={()=>setPage(p=>p+1)}><ChevronRight/></button></div></div>
      </article>}
      <footer><span>TF Hub • Gestão de carteira</span><span><Filter size={13}/> Segmentos resolvidos por nome; origens continuam por ID.</span></footer>
    </section>
  </main>
}
