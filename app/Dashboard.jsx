"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell,
  ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import {
  AlertTriangle, ArrowDownRight, ArrowUpRight, BriefcaseBusiness, ChevronLeft,
  ChevronRight, CircleDollarSign, Download, Filter, Gauge, LayoutDashboard, PanelLeftClose, PanelLeftOpen, Search,
  KeyRound, Landmark, Pencil, Plus, Save, ShieldCheck, Target, Trash2, TrendingUp, UserRoundCog, Users, WalletCards, X
} from "lucide-react";
import snapshotTeamRows from "./team-data";
import Economics from "./Economics";

const RED = "#ef233c";
const GOAL_DIMENSIONS={squad:["Squad","squad"],account:["Account","account"],gestorTrafego:["Gestor de tráfego","gestorTrafego"],designer:["Designer","designer"],semana:["Semana","semana"],mes:["Mês","mes"]};
const snapshotMonthly = [
["2025-08",15,19,16,49588],["2025-09",11,15,9,37050],["2025-10",35,22,38,83804],
["2025-11",25,22,28,44435],["2025-12",10,24,12,14460],["2026-01",26,21,45,73948],
["2026-02",24,9,35,6461],["2026-03",29,16,31,0],["2026-04",31,26,43,0],
["2026-05",37,31,44,7493],["2026-06",59,30,64,0],["2026-07",26,4,41,0]
].map(([mes,entradas,churns,contratos,mrr])=>({mes,entradas,churns,contratos,mrr}));
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
const chartTip = {
  contentStyle:{background:"#15171c",border:"1px solid #30343b",borderRadius:12,color:"#f3f4f6",fontSize:12},
  labelStyle:{color:"#f3f4f6",fontWeight:700},
  itemStyle:{color:"#f3f4f6"},
};

function Kpi({label,value,detail,icon:Icon,tone="neutral"}) {
  return <article className={`kpi ${tone}`}><div className="kpi-top"><span>{label}</span><Icon size={17}/></div><strong>{value}</strong><small>{detail}</small></article>;
}

export default function Dashboard(){
  const [liveData,setLiveData]=useState(null);
  const [dataError,setDataError]=useState("");
  const [refreshing,setRefreshing]=useState(true);
  const [tab,setTab]=useState("visao");
  const [sidebarCollapsed,setSidebarCollapsed]=useState(true);
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
  const [squadDetail,setSquadDetail]=useState("Todos");
  const [squadClientSearch,setSquadClientSearch]=useState("");
  const [squadClientStatus,setSquadClientStatus]=useState("Todos");
  const [squadPage,setSquadPage]=useState(1);
  const [goalView,setGoalView]=useState("squad");
  const [goalSquad,setGoalSquad]=useState("Todos");
  const [goalClientStatus,setGoalClientStatus]=useState("Todos");
  const [goalInvestorStatus,setGoalInvestorStatus]=useState("Todos");
  const [goalWeek,setGoalWeek]=useState("Todos");
  const [goalMonth,setGoalMonth]=useState("Todos");
  const [goalHit,setGoalHit]=useState("Todos");
  const [goalCheckin,setGoalCheckin]=useState("Todos");
  const [goalPage,setGoalPage]=useState(1);
  const [goalEvolutionPeriod,setGoalEvolutionPeriod]=useState("Semana");
  const [capacitySquad,setCapacitySquad]=useState("Todos");
  const [capacityFunction,setCapacityFunction]=useState("Todos");
  const [capacityInvestor,setCapacityInvestor]=useState("Todos");
  const [capacityInvestorStatus,setCapacityInvestorStatus]=useState("Ativos");
  const [capacityDimension,setCapacityDimension]=useState("squad");
  const [remuneracoes,setRemuneracoes]=useState([]);
  const [remuneracaoInvestidores,setRemuneracaoInvestidores]=useState([]);
  const [remuneracaoLoading,setRemuneracaoLoading]=useState(false);
  const [remuneracaoSaving,setRemuneracaoSaving]=useState(false);
  const [remuneracaoError,setRemuneracaoError]=useState("");
  const [remuneracaoSearch,setRemuneracaoSearch]=useState("");
  const [remuneracaoToken,setRemuneracaoToken]=useState(()=>typeof window==="undefined"?"":sessionStorage.getItem("tfhub-remuneracao-token")||"");
  const [editingRemuneracaoId,setEditingRemuneracaoId]=useState(null);
  const [remuneracaoForm,setRemuneracaoForm]=useState({investidor_id:"",remuneracao:"",data_inicio_vigencia:"",data_fim_vigencia:""});
  const pageSize=8;
  const monthly=liveData?.monthly||snapshotMonthly;
  const clients=liveData?.clients||snapshotClients;
  const teamRows=liveData?.teamRows||snapshotTeamRows;
  const demandGoals=useMemo(()=>liveData?.demandGoals||[],[liveData?.demandGoals]);
  const capacityRows=useMemo(()=>liveData?.investorCapacityRows||[],[liveData?.investorCapacityRows]);
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
  const filtered=useMemo(()=>clients.filter(c=>
    (squad==="Todos"||c.squad===squad)&&
    (status==="Todos"||(status==="Ativos"&&c.ativo)||(status==="Inativos"&&!c.ativo)||(status==="Sem contrato"&&c.ativo&&c.contratos===0))&&
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
  const team=useMemo(()=>teamRows.map(row=>{
    const [funcao,responsavel,squad,cliente,servico,fee]=row;
    const hasOneShot=row.length>=9;
    const oneshot=hasOneShot?row[6]:0;
    const clienteAtivo=hasOneShot?row[7]:row[6]??true;
    const investidorAtivo=hasOneShot?row[8]:row[7]??true;
    const investidorId=hasOneShot?row[9]:null;
    const capacidade=hasOneShot&&row[10]!=null?Number(row[10]):null;
    return {funcao,responsavel,squad,cliente,servico,fee:Number(fee)||0,oneshot:Number(oneshot)||0,clienteAtivo:Boolean(clienteAtivo),investidorAtivo:Boolean(investidorAtivo),investidorId,capacidade};
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
      if(!map.has(r.responsavel)) map.set(r.responsavel,{responsavel:r.responsavel,squad:r.squad,rows:[],fee:0,oneshot:0,capacidade:r.capacidade});
      const group=map.get(r.responsavel);
      group.rows.push(r);
      group.fee+=r.fee;
      group.oneshot+=r.oneshot;
      if(group.capacidade==null&&r.capacidade!=null) group.capacidade=r.capacidade;
    });
    return [...map.values()].map(group=>{
      const clientes=new Set(group.rows.map(row=>row.cliente)).size;
      const ocupacao=group.capacidade>0?Math.round(clientes/group.capacidade*100):null;
      return {...group,clientes,ocupacao};
    }).sort((a,b)=>(b.ocupacao??-1)-(a.ocupacao??-1)||b.fee-a.fee||a.responsavel.localeCompare(b.responsavel,"pt-BR"));
  },[visibleTeam]);
  const uniqueTeamClients=new Set(visibleTeam.map(r=>r.cliente)).size;
  const totalTeamFee=visibleTeam.reduce((sum,r)=>sum+r.fee,0);
  const totalTeamOneShot=visibleTeam.reduce((sum,r)=>sum+r.oneshot,0);
  const statusCapacityRows=useMemo(()=>capacityRows.filter(row=>capacityInvestorStatus==="Todos"||(capacityInvestorStatus==="Ativos"?row.ativo:!row.ativo)),[capacityRows,capacityInvestorStatus]);
  const capacitySquads=useMemo(()=>[...new Set(statusCapacityRows.map(row=>row.squad))].sort((a,b)=>a.localeCompare(b,"pt-BR")),[statusCapacityRows]);
  const capacityFunctions=useMemo(()=>[...new Set(statusCapacityRows.map(row=>row.funcao))].sort((a,b)=>a.localeCompare(b,"pt-BR")),[statusCapacityRows]);
  const capacityInvestors=useMemo(()=>[...new Set(statusCapacityRows.filter(row=>capacitySquad==="Todos"||row.squad===capacitySquad).map(row=>row.nome))].sort((a,b)=>a.localeCompare(b,"pt-BR")),[statusCapacityRows,capacitySquad]);
  const filteredCapacityRows=useMemo(()=>statusCapacityRows.filter(row=>
    (capacitySquad==="Todos"||row.squad===capacitySquad)&&
    (capacityFunction==="Todos"||row.funcao===capacityFunction)&&
    (capacityInvestor==="Todos"||row.nome===capacityInvestor)
  ),[statusCapacityRows,capacitySquad,capacityFunction,capacityInvestor]);
  const capacityTotals=useMemo(()=>{
    const cadastrados=filteredCapacityRows.filter(row=>row.capacidade!=null&&row.capacidade>0);
    const clientes=filteredCapacityRows.reduce((sum,row)=>sum+row.clientesAtivos,0);
    const clientesCadastrados=cadastrados.reduce((sum,row)=>sum+row.clientesAtivos,0);
    const capacidade=cadastrados.reduce((sum,row)=>sum+row.capacidade,0);
    return {clientes,capacidade,ocupacao:capacidade?Number((clientesCadastrados/capacidade*100).toFixed(1)):0,excedidos:cadastrados.filter(row=>row.clientesAtivos>row.capacidade).length,semCadastro:filteredCapacityRows.length-cadastrados.length,cadastrados:cadastrados.length};
  },[filteredCapacityRows]);
  const capacityGrouped=useMemo(()=>{
    const map=new Map();
    filteredCapacityRows.forEach(row=>{
      const nome=capacityDimension==="investidor"?row.nome:capacityDimension==="funcao"?row.funcao:row.squad;
      const item=map.get(nome)||{nome,clientes:0,capacidade:0,investidores:0,semCadastro:0};
      item.clientes+=row.clientesAtivos;item.investidores+=1;
      if(row.capacidade!=null&&row.capacidade>0)item.capacidade+=row.capacidade;else item.semCadastro+=1;
      map.set(nome,item);
    });
    return [...map.values()].map(item=>({...item,ocupacao:item.capacidade?Number((item.clientes/item.capacidade*100).toFixed(1)):null})).sort((a,b)=>(b.ocupacao??-1)-(a.ocupacao??-1)||b.clientes-a.clientes).slice(0,20);
  },[filteredCapacityRows,capacityDimension]);
  const squadRows=useMemo(()=>{
    const grouped=new Map();
    clients.forEach(client=>{
      const name=client.squad||"Indefinido";
      if(!grouped.has(name)) grouped.set(name,{id:name,nome:name,ativos:0,churned:0,mrr:0,oneshot:0,ltv:0});
      const item=grouped.get(name);
      if(client.ativo)item.ativos+=1;else item.churned+=1;
      item.mrr+=client.mrr||0;
      item.oneshot+=client.oneshot||0;
      item.ltv+=client.ltv||0;
    });
    return [...grouped.values()].map(item=>({...item,churn:item.ativos+item.churned?Number(((item.churned/(item.ativos+item.churned))*100).toFixed(1)):0})).sort((a,b)=>b.ativos+b.churned-(a.ativos+a.churned));
  },[clients]);
  const visibleSquadRows=useMemo(()=>squadDetail==="Todos"?squadRows:squadRows.filter(item=>item.nome===squadDetail),[squadRows,squadDetail]);
  const squadChartData=visibleSquadRows.slice(0,12);
  const filteredSquadClients=useMemo(()=>clients.filter(client=>
    (squadDetail==="Todos"||client.squad===squadDetail)&&
    (squadClientStatus==="Todos"||(squadClientStatus==="Ativos"?client.ativo:!client.ativo))&&
    `${client.nome} ${client.responsavel}`.toLowerCase().includes(squadClientSearch.toLowerCase())
  ),[clients,squadDetail,squadClientStatus,squadClientSearch]);
  const squadPageSize=12;
  const squadPages=Math.max(1,Math.ceil(filteredSquadClients.length/squadPageSize));
  const visibleSquadPage=Math.min(squadPage,squadPages);
  const squadClientRows=filteredSquadClients.slice((visibleSquadPage-1)*squadPageSize,visibleSquadPage*squadPageSize);
  const totalSquadActive=visibleSquadRows.reduce((sum,item)=>sum+item.ativos,0);
  const totalSquadChurn=visibleSquadRows.reduce((sum,item)=>sum+item.churned,0);
  const totalSquadMrr=visibleSquadRows.reduce((sum,item)=>sum+item.mrr,0);
  const goalSquads=useMemo(()=>[...new Set(demandGoals.map(row=>row.squad).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"pt-BR")),[demandGoals]);
  const goalWeeks=useMemo(()=>[...new Set(demandGoals.map(row=>`${row.ano}-${String(row.mes).padStart(2,"0")}-S${String(row.semana).padStart(2,"0")}`))].sort().reverse(),[demandGoals]);
  const goalMonths=useMemo(()=>[...new Set(demandGoals.map(row=>`${row.ano}-${String(row.mes).padStart(2,"0")}`))].sort().reverse(),[demandGoals]);
  const filteredGoals=useMemo(()=>demandGoals.filter(row=>
    (goalSquad==="Todos"||row.squad===goalSquad)&&
    (goalClientStatus==="Todos"||(goalClientStatus==="Ativos"?row.clienteAtivo:!row.clienteAtivo))&&
    (goalInvestorStatus==="Todos"||(goalInvestorStatus==="Ativos"?row.investidorAtivo:!row.investidorAtivo))&&
    (goalWeek==="Todos"||`${row.ano}-${String(row.mes).padStart(2,"0")}-S${String(row.semana).padStart(2,"0")}`===goalWeek)&&
    (goalMonth==="Todos"||`${row.ano}-${String(row.mes).padStart(2,"0")}`===goalMonth)&&
    (goalHit==="Todos"||(goalHit==="Sim"?row.bateuMeta:!row.bateuMeta))&&
    (goalCheckin==="Todos"||(goalCheckin==="Sim"?row.checkinRealizado:!row.checkinRealizado))
  ),[demandGoals,goalSquad,goalClientStatus,goalInvestorStatus,goalWeek,goalMonth,goalHit,goalCheckin]);
  const goalGrouped=useMemo(()=>{
    const field=GOAL_DIMENSIONS[goalView][1];const map=new Map();
    filteredGoals.forEach(row=>{const raw=row[field];const label=field==="semana"?`S${String(raw).padStart(2,"0")} · ${monthLabel(`${row.ano}-${String(row.mes).padStart(2,"0")}`)}`:field==="mes"?new Date(row.ano,Number(raw)-1,1).toLocaleDateString("pt-BR",{month:"short",year:"numeric"}):raw||"Não definido";const item=map.get(label)||{nome:label,meta:0,resultado:0,registros:0,atingidas:0};item.meta+=row.meta;item.resultado+=row.resultado;item.registros+=1;if(row.bateuMeta)item.atingidas+=1;map.set(label,item)});
    return [...map.values()].map(item=>({...item,atingimento:item.registros?Number((item.atingidas/item.registros*100).toFixed(1)):0})).sort((a,b)=>b.atingimento-a.atingimento||b.registros-a.registros).slice(0,15);
  },[filteredGoals,goalView]);
  const totalGoal=filteredGoals.reduce((sum,row)=>sum+row.meta,0);
  const totalGoalResult=filteredGoals.reduce((sum,row)=>sum+row.resultado,0);
  const goalsHit=filteredGoals.filter(row=>row.bateuMeta).length;
  const goalsChecked=filteredGoals.filter(row=>row.checkinRealizado).length;
  const goalPages=Math.max(1,Math.ceil(filteredGoals.length/20));
  const visibleGoalPage=Math.min(goalPage,goalPages);
  const goalRows=filteredGoals.slice((visibleGoalPage-1)*20,visibleGoalPage*20);
  const goalEvolution=useMemo(()=>{
    const map=new Map();
    filteredGoals.forEach(row=>{const month=`${row.ano}-${String(row.mes).padStart(2,"0")}`;const key=goalEvolutionPeriod==="Semana"?`${month}-S${String(row.semana).padStart(2,"0")}`:month;const item=map.get(key)||{key,atingidas:0,registros:0};item.registros+=1;if(row.bateuMeta)item.atingidas+=1;map.set(key,item)});
    return [...map.values()].sort((a,b)=>a.key.localeCompare(b.key)).map(item=>({...item,nome:goalEvolutionPeriod==="Semana"?`S${item.key.slice(-2)} · ${monthLabel(item.key.slice(0,7))}`:monthLabel(item.key),percentual:item.registros?Number((item.atingidas/item.registros*100).toFixed(1)):0}));
  },[filteredGoals,goalEvolutionPeriod]);
  const overviewClients=useMemo(()=>clients.filter(client=>
    (squad==="Todos"||client.squad===squad)&&
    (status==="Todos"||(status==="Ativos"&&client.ativo)||(status==="Inativos"&&!client.ativo)||(status==="Sem contrato"&&client.ativo&&client.contratos===0))
  ),[clients,squad,status]);
  const overviewSquads=useMemo(()=>{
    const grouped=new Map();
    overviewClients.forEach(client=>{
      const name=client.squad||"Indefinido";
      if(!grouped.has(name))grouped.set(name,{id:name,nome:name,ativos:0,churned:0,mrr:0,oneshot:0,ltv:0});
      const item=grouped.get(name);
      if(client.ativo)item.ativos+=1;else item.churned+=1;
      item.mrr+=client.mrr||0;item.oneshot+=client.oneshot||0;item.ltv+=client.ltv||0;
    });
    return [...grouped.values()].map(item=>({...item,churn:item.ativos+item.churned?Number((item.churned/(item.ativos+item.churned)*100).toFixed(1)):0})).sort((a,b)=>b.mrr-a.mrr||b.ativos+b.churned-(a.ativos+a.churned));
  },[overviewClients]);
  const overviewMonthly=useMemo(()=>{
    const map=new Map(monthly.map(item=>[item.mes,{...item,entradas:0,churns:0}]));
    overviewClients.forEach(client=>{
      if(client.entradaMes){if(!map.has(client.entradaMes))map.set(client.entradaMes,{mes:client.entradaMes,entradas:0,churns:0,contratos:0,mrr:0});map.get(client.entradaMes).entradas+=1}
      if(client.churnMes){if(!map.has(client.churnMes))map.set(client.churnMes,{mes:client.churnMes,entradas:0,churns:0,contratos:0,mrr:0});map.get(client.churnMes).churns+=1}
    });
    return [...map.values()].sort((a,b)=>a.mes.localeCompare(b.mes));
  },[monthly,overviewClients]);
  const periodData=overviewMonthly.slice(-period);
  const activeClients=overviewClients.filter(c=>c.ativo);
  const churnedClients=overviewClients.length-activeClients.length;
  const totalMrr=overviewClients.reduce((sum,c)=>sum+c.mrr,0);
  const totalOneShot=overviewClients.reduce((sum,c)=>sum+(c.oneshot||0),0);
  const totalLtv=overviewClients.reduce((sum,c)=>sum+c.ltv,0);
  const withoutContract=activeClients.filter(c=>c.contratos===0);
  const snapshotLabel=extractedAt?new Date(extractedAt).toLocaleString("pt-BR"):"carregando";
  const exportTeam=()=>{
    const cols=["Função","Responsável","Status do investidor","Squad","Cliente","Status do cliente","Serviço","Valor recorrente ativo","Oneshot ativo"];
    const rows=visibleTeam.map(r=>[r.funcao,r.responsavel,r.investidorAtivo?"Ativo":"Inativo",r.squad,r.cliente,r.clienteAtivo?"Ativo":"Inativo",r.servico,r.fee,r.oneshot]);
    const blob=new Blob(["\ufeff"+[cols,...rows].map(r=>r.map(v=>`"${String(v??"").replaceAll('"','""')}"`).join(";")).join("\n")],{type:"text/csv;charset=utf-8"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`tfhub-equipe-${teamFunction.toLowerCase().replaceAll(" ","-")}.csv`;a.click();URL.revokeObjectURL(a.href);
  };
  const remunerationHeaders=useCallback(()=>remuneracaoToken?{"x-remuneracao-admin-token":remuneracaoToken}:{},[remuneracaoToken]);
  const loadRemuneracoes=useCallback(async()=>{
    setRemuneracaoLoading(true);setRemuneracaoError("");
    try{
      const response=await fetch("/api/remuneracoes",{cache:"no-store",headers:remunerationHeaders()});
      const payload=await response.json();
      if(!response.ok)throw new Error(payload.error||"Não foi possível carregar as remunerações.");
      setRemuneracoes(payload.remuneracoes||[]);setRemuneracaoInvestidores(payload.investidores||[]);
      if(remuneracaoToken)sessionStorage.setItem("tfhub-remuneracao-token",remuneracaoToken);
    }catch(error){setRemuneracaoError(error.message)}finally{setRemuneracaoLoading(false)}
  },[remuneracaoToken,remunerationHeaders]);
  const resetRemuneracaoForm=()=>{setEditingRemuneracaoId(null);setRemuneracaoForm({investidor_id:"",remuneracao:"",data_inicio_vigencia:"",data_fim_vigencia:""})};
  const saveRemuneracao=async event=>{
    event.preventDefault();setRemuneracaoSaving(true);setRemuneracaoError("");
    try{
      const endpoint=editingRemuneracaoId?`/api/remuneracoes?id=${editingRemuneracaoId}`:"/api/remuneracoes";
      const response=await fetch(endpoint,{method:editingRemuneracaoId?"PATCH":"POST",headers:{"Content-Type":"application/json",...remunerationHeaders()},body:JSON.stringify(remuneracaoForm)});
      const payload=await response.json();
      if(!response.ok)throw new Error(payload.error||"Não foi possível salvar a remuneração.");
      resetRemuneracaoForm();await loadRemuneracoes();
    }catch(error){setRemuneracaoError(error.message)}finally{setRemuneracaoSaving(false)}
  };
  const editRemuneracao=row=>{setEditingRemuneracaoId(row.id);setRemuneracaoForm({investidor_id:String(row.investidor_id),remuneracao:String(row.remuneracao),data_inicio_vigencia:row.data_inicio_vigencia,data_fim_vigencia:row.data_fim_vigencia||""});window.scrollTo({top:0,behavior:"smooth"})};
  const deleteRemuneracao=async row=>{
    if(!window.confirm(`Excluir a remuneração de ${row.investidor_nome}?`))return;
    setRemuneracaoSaving(true);setRemuneracaoError("");
    try{const response=await fetch(`/api/remuneracoes?id=${row.id}`,{method:"DELETE",headers:remunerationHeaders()});const payload=await response.json();if(!response.ok)throw new Error(payload.error||"Não foi possível excluir a remuneração.");if(editingRemuneracaoId===row.id)resetRemuneracaoForm();await loadRemuneracoes()}catch(error){setRemuneracaoError(error.message)}finally{setRemuneracaoSaving(false)}
  };
  const visibleRemuneracoes=useMemo(()=>remuneracoes.filter(row=>row.investidor_nome.toLowerCase().includes(remuneracaoSearch.toLowerCase())),[remuneracoes,remuneracaoSearch]);
  const vigenciaStatus=row=>{const today=new Date().toISOString().slice(0,10);return row.data_inicio_vigencia>today?["Futura","future"]:row.data_fim_vigencia&&row.data_fim_vigencia<today?["Encerrada","off"]:["Vigente","on"]};
  const dateBr=value=>value?new Date(`${value}T12:00:00`).toLocaleDateString("pt-BR"):"Sem término";
  const remuneracaoAtual=useMemo(()=>{const today=new Date().toISOString().slice(0,10);return remuneracoes.filter(row=>row.data_inicio_vigencia<=today&&(!row.data_fim_vigencia||row.data_fim_vigencia>=today))},[remuneracoes]);
  const folhaAtual=remuneracaoAtual.reduce((sum,row)=>sum+Number(row.remuneracao||0),0);
  return <main className={sidebarCollapsed?"sidebar-collapsed":""}>
    <aside className="sidebar">
      <div className="brand"><span>V4</span><div><b>TF HUB</b><small>GESTÃO DE CARTEIRA</small></div><button className="sidebar-toggle" type="button" aria-label={sidebarCollapsed?"Expandir menu lateral":"Recolher menu lateral"} title={sidebarCollapsed?"Expandir menu":"Recolher menu"} onClick={()=>setSidebarCollapsed(value=>!value)}>{sidebarCollapsed?<PanelLeftOpen/>:<PanelLeftClose/>}</button></div>
      <nav>
        <button className={tab==="visao"?"active":""} onClick={()=>setTab("visao")}><LayoutDashboard/>Visão geral</button>
        <button className={tab==="equipe"?"active":""} onClick={()=>setTab("equipe")}><UserRoundCog/>Clientes por função</button>
        <button className={tab==="capacity"?"active":""} onClick={()=>setTab("capacity")}><Gauge/>Capacity</button>
        <button className={tab==="squads"?"active":""} onClick={()=>setTab("squads")}><Users/>Clientes por squad</button>
        <button className={tab==="metas"?"active":""} onClick={()=>setTab("metas")}><Target/>Metas de demandas</button>
        <button className={tab==="remuneracoes"?"active":""} onClick={()=>{setTab("remuneracoes");loadRemuneracoes()}}><WalletCards/>Remunerações</button>
        <button className={tab==="economics"?"active":""} onClick={()=>setTab("economics")}><Landmark/>Economics</button>
      </nav>
      <div className="security"><ShieldCheck/><div><b>Conexão protegida</b><small>Sem PII ou credenciais</small></div></div>
    </aside>
    <section className="content">
      <header>
        <div><p>PERFORMANCE & OPERAÇÕES</p><h1>{tab==="visao"?"Visão consolidada":tab==="capacity"?"Capacity dos investidores":tab==="squads"?"Clientes por squad":tab==="metas"?"Resultados vs. metas":tab==="remuneracoes"?"Remuneração dos investidores":tab==="economics"?"Economics":"Clientes por responsável e função"}</h1></div>
        <div className="header-actions"><div className="snapshot"><i/>{refreshing?"Atualizando…":`Atualizado • ${snapshotLabel}`}</div><div className="avatar">TF</div></div>
      </header>
      <div className="snapshot-note"><ShieldCheck size={16}/><b>Dados dinâmicos:</b> esta tela consulta automaticamente a nova base ao abrir e atualiza a cada minuto.</div>
      {dataError&&<div className="snapshot-note error-note"><AlertTriangle size={16}/><b>Falha de atualização:</b> {dataError}</div>}
      <div className="toolbar">
        {tab==="visao"&&<div className="period"><span>Período dos gráficos</span>{[6,12,24].map(n=><button key={n} onClick={()=>setPeriod(n)} className={period===n?"selected":""}>{n} meses</button>)}</div>}
        <div className="overview-filters top-screen-filters">
          {tab==="visao"&&<><label className="filter-field"><span>Squad</span><select aria-label="Filtrar Visão Geral por squad" value={squad} onChange={event=>{setSquad(event.target.value);setPage(1)}}><option>Todos</option>{squadRows.map(item=><option key={item.id}>{item.nome}</option>)}</select></label><label className="filter-field"><span>Status do cliente</span><select aria-label="Filtrar Visão Geral por status do cliente" value={status} onChange={event=>{setStatus(event.target.value);setPage(1)}}><option value="Todos">Todos os clientes</option><option value="Ativos">Clientes ativos</option><option value="Inativos">Clientes inativos</option><option value="Sem contrato">Sem contrato ativo</option></select></label></>}
          {tab==="equipe"&&<label className="filter-field"><span>Squad</span><select aria-label="Filtrar Clientes por Função por squad" value={teamSquad} onChange={event=>setTeamSquad(event.target.value)}><option>Todos</option>{teamSquads.map(name=><option key={name}>{name}</option>)}</select></label>}
          {tab==="capacity"&&<label className="filter-field"><span>Squad</span><select aria-label="Filtrar Capacity por squad" value={capacitySquad} onChange={event=>{setCapacitySquad(event.target.value);setCapacityInvestor("Todos")}}><option>Todos</option>{capacitySquads.map(name=><option key={name}>{name}</option>)}</select></label>}
          {tab==="squads"&&<label className="filter-field"><span>Squad</span><select aria-label="Filtrar Clientes por Squad" value={squadDetail} onChange={event=>{setSquadDetail(event.target.value);setSquadPage(1)}}><option>Todos</option>{squadRows.map(item=><option key={item.id}>{item.nome}</option>)}</select></label>}
          {tab==="metas"&&<label className="filter-field"><span>Squad</span><select aria-label="Filtrar Metas de Demandas por squad" value={goalSquad} onChange={event=>{setGoalSquad(event.target.value);setGoalPage(1)}}><option>Todos</option>{goalSquads.map(name=><option key={name}>{name}</option>)}</select></label>}
        </div>
      </div>

      {tab==="visao"&&<>
        <section className="kpis">
          <Kpi label="Clientes ativos" value={activeClients.length} detail={`de ${overviewClients.length} clientes no recorte`} icon={Users}/>
          <Kpi label="MRR ativo" value={money(totalMrr)} detail="contratos ativos vinculados" icon={CircleDollarSign} tone="positive"/>
          <Kpi label="Oneshot ativo" value={money(totalOneShot)} detail="valor bookado com prazo igual a zero" icon={BriefcaseBusiness} tone="warning"/>
          <Kpi label="LTV aproximado" value={money(totalLtv)} detail="valor + fee × meses contratados" icon={TrendingUp}/>
          <Kpi label="Churn histórico" value={`${overviewClients.length?((churnedClients/overviewClients.length)*100).toFixed(1).replace(".",","):"0"}%`} detail={`${churnedClients} clientes inativos`} icon={ArrowDownRight} tone="danger"/>
          <Kpi label="Sem contrato ativo" value={withoutContract.length} detail="clientes ativos para revisar" icon={AlertTriangle} tone="warning"/>
        </section>
        <section className="grid two">
          <article className="panel wide"><div className="panel-title"><div><small>MOVIMENTO DA CARTEIRA</small><h2>Entradas vs. churn</h2></div><span>{period} meses</span></div>
            <div className="legend"><i className="green"/>Entradas <i className="red"/>Churn</div>
            <ResponsiveContainer width="100%" height={285}><AreaChart data={periodData}><defs><linearGradient id="greenFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#52d681" stopOpacity=".28"/><stop offset="1" stopColor="#52d681" stopOpacity="0"/></linearGradient><linearGradient id="redFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={RED} stopOpacity=".3"/><stop offset="1" stopColor={RED} stopOpacity="0"/></linearGradient></defs><CartesianGrid stroke="#24272e" vertical={false}/><XAxis dataKey="mes" tickFormatter={monthLabel} tick={{fill:"#7f8591",fontSize:11}} axisLine={false} tickLine={false}/><YAxis tick={{fill:"#7f8591",fontSize:11}} axisLine={false} tickLine={false}/><Tooltip {...chartTip} labelFormatter={monthLabel}/><Area type="monotone" dataKey="entradas" stroke="#52d681" fill="url(#greenFill)" strokeWidth={2}/><Area type="monotone" dataKey="churns" stroke={RED} fill="url(#redFill)" strokeWidth={2}/></AreaChart></ResponsiveContainer>
          </article>
          <article className="panel"><div className="panel-title"><div><small>AÇÃO RECOMENDADA</small><h2>Leituras prioritárias</h2></div></div>
            <div className="insights"><div className="insight hot"><AlertTriangle/><p><b>{withoutContract.length} clientes ativos sem contrato ativo</b><span>{withoutContract.slice(0,3).map(c=>c.nome).join(", ")||"Nenhuma inconsistência encontrada"}.</span></p></div><div className="insight"><ArrowUpRight/><p><b>Squad com menor churn</b><span>{[...overviewSquads].filter(s=>s.ativos+s.churned>5).sort((a,b)=>a.churn-b.churn)[0]?.nome||"—"} entre carteiras relevantes.</span></p></div><div className="insight"><TrendingUp/><p><b>Dados atuais do TFHub</b><span>Indicadores recalculados para os filtros selecionados.</span></p></div></div>
          </article>
        </section>
        <section className="grid two">
          <article className="panel"><div className="panel-title"><div><small>CLIQUE PARA FILTRAR A CARTEIRA</small><h2>MRR por squad</h2></div></div>
            <ResponsiveContainer width="100%" height={300}><BarChart data={overviewSquads.slice(0,7)} layout="vertical" margin={{left:10,right:25}}><CartesianGrid stroke="#24272e" horizontal={false}/><XAxis type="number" tickFormatter={compact} tick={{fill:"#7f8591",fontSize:10}} axisLine={false} tickLine={false}/><YAxis type="category" dataKey="nome" width={100} tick={{fill:"#bcc0c8",fontSize:11}} axisLine={false} tickLine={false}/><Tooltip {...chartTip} formatter={v=>money(v)}/><Bar dataKey="mrr" radius={[0,6,6,0]} onClick={d=>chooseSquad(d.nome)} cursor="pointer">{overviewSquads.slice(0,7).map(s=><Cell key={s.id} fill={squad===s.nome?RED:"#6e737d"}/>)}</Bar></BarChart></ResponsiveContainer>
          </article>
          <article className="panel"><div className="panel-title"><div><small>RISCO POR EQUIPE</small><h2>Taxa de churn por squad</h2></div><span>clique em uma barra</span></div>
            <ResponsiveContainer width="100%" height={300}><BarChart data={overviewSquads.slice(0,7)} margin={{left:-15,right:8}}><CartesianGrid stroke="#24272e" vertical={false}/><XAxis dataKey="nome" tick={{fill:"#7f8591",fontSize:10}} axisLine={false} tickLine={false}/><YAxis domain={[0,100]} tickFormatter={v=>`${v}%`} tick={{fill:"#7f8591",fontSize:10}} axisLine={false} tickLine={false}/><Tooltip {...chartTip} formatter={v=>`${v}%`}/><Bar dataKey="churn" radius={[6,6,0,0]} onClick={d=>chooseSquad(d.nome)} cursor="pointer">{overviewSquads.slice(0,7).map(s=><Cell key={s.id} fill={s.churn>60?RED:s.churn>45?"#f0a33a":"#52d681"}/>)}</Bar></BarChart></ResponsiveContainer>
          </article>
        </section>
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
          <div className="filter-section-label">Função</div><div className="team-function-tabs">{teamFunctions.map(name=><button key={name} className={teamFunction===name?"selected":""} onClick={()=>setTeamFunction(name)}>{name}</button>)}</div>
          <div className="filters team-filters">
            <label className="filter-field search-field"><span>Buscar</span><div className="filter-input"><Search size={16}/><input value={teamSearch} onChange={e=>setTeamSearch(e.target.value)} placeholder="Responsável, cliente ou serviço..."/></div></label>
            <label className="filter-field"><span>Status do cliente</span><select aria-label="Filtrar por status do cliente" value={teamClientStatus} onChange={e=>setTeamClientStatus(e.target.value)}><option value="Todos">Todos os clientes</option><option value="Ativos">Clientes ativos</option><option value="Inativos">Clientes inativos</option></select></label>
            <label className="filter-field"><span>Status do investidor</span><select aria-label="Filtrar por status do investidor" value={teamInvestorStatus} onChange={e=>setTeamInvestorStatus(e.target.value)}><option value="Todos">Todos os investidores</option><option value="Ativos">Investidores ativos</option><option value="Inativos">Investidores inativos</option></select></label>
            {(teamSquad!=="Todos"||teamClientStatus!=="Ativos"||teamInvestorStatus!=="Ativos"||teamSearch)&&<button className="clear" onClick={()=>{setTeamSquad("Todos");setTeamClientStatus("Ativos");setTeamInvestorStatus("Ativos");setTeamSearch("")}}><X size={14}/>Limpar</button>}
          </div>
          <div className="team-grid">
            {groupedTeam.map(group=><section className="team-card" key={group.responsavel}>
              <div className="team-card-head"><div className="team-avatar">{group.responsavel.split(" ").slice(0,2).map(n=>n[0]).join("").toUpperCase()}</div><div><h3>{group.responsavel}</h3><span>{group.squad}</span></div><strong>{group.clientes} {group.clientes===1?"cliente":"clientes"}</strong></div>
              <div className={`capacity ${group.ocupacao==null?"unknown":group.ocupacao>100?"over":group.ocupacao>=75?"near":"ok"}`}>
                <div><span>Capacidade da carteira</span><b>{group.capacidade!=null?`${group.clientes} de ${group.capacidade} clientes`:`${group.clientes} ${group.clientes===1?"cliente":"clientes"} · capacidade não cadastrada`}</b><strong>{group.ocupacao!=null?`${group.ocupacao}%`:"—"}</strong></div>
                <i><em style={{width:`${Math.min(group.ocupacao??0,100)}%`}}/></i>
              </div>
              <div className="team-client-head"><span>Projeto / serviço</span><span>Recorrente</span><span>Oneshot</span></div>
              <div className="team-client-list">{group.rows.map((r,i)=><div className="team-client-row" key={`${r.cliente}-${r.servico}-${i}`}><div><b>{r.cliente}</b><small>{r.servico}</small></div><span>{money(r.fee)}</span><span>{money(r.oneshot)}</span></div>)}</div>
              <div className="team-card-total"><span>Total</span><b>{group.clientes}</b><strong>{money(group.fee)}</strong><strong>{money(group.oneshot)}</strong></div>
            </section>)}
          </div>
          {!groupedTeam.length&&<div className="empty-state">Nenhum vínculo encontrado para os filtros selecionados.</div>}
        </article>
      </>}

      {tab==="capacity"&&<>
        <section className="kpis capacity-kpis">
          <Kpi label="Ocupação geral" value={`${capacityTotals.ocupacao.toLocaleString("pt-BR")}%`} detail={`${capacityTotals.cadastrados} investidores com capacidade cadastrada`} icon={Gauge} tone={capacityTotals.ocupacao>100?"danger":capacityTotals.ocupacao>=75?"warning":"positive"}/>
          <Kpi label="Clientes em atendimento" value={capacityTotals.clientes} detail="soma das carteiras ativas dos investidores" icon={Users}/>
          <Kpi label="Capacidade máxima" value={capacityTotals.capacidade} detail="total de posições cadastradas" icon={BriefcaseBusiness} tone="positive"/>
          <Kpi label="Acima da capacidade" value={capacityTotals.excedidos} detail="investidores acima de 100%" icon={AlertTriangle} tone={capacityTotals.excedidos?"danger":"positive"}/>
          <Kpi label="Sem capacidade cadastrada" value={capacityTotals.semCadastro} detail="investidores ativos para revisar" icon={AlertTriangle} tone={capacityTotals.semCadastro?"warning":"positive"}/>
        </section>
        <article className="panel capacity-filter-panel">
          <div className="panel-title"><div><small>FILTROS DE CAPACITY</small><h2>Recorte da operação</h2></div><span>{filteredCapacityRows.length} investidores</span></div>
          <div className="filters capacity-filters">
            <label className="filter-field"><span>Função</span><select aria-label="Filtrar Capacity por função" value={capacityFunction} onChange={event=>setCapacityFunction(event.target.value)}><option>Todos</option>{capacityFunctions.map(name=><option key={name}>{name}</option>)}</select></label>
            <label className="filter-field"><span>Investidor</span><select aria-label="Filtrar Capacity por investidor" value={capacityInvestor} onChange={event=>setCapacityInvestor(event.target.value)}><option>Todos</option>{capacityInvestors.map(name=><option key={name}>{name}</option>)}</select></label>
            <label className="filter-field"><span>Status do investidor</span><select aria-label="Filtrar Capacity por status do investidor" value={capacityInvestorStatus} onChange={event=>{setCapacityInvestorStatus(event.target.value);setCapacitySquad("Todos");setCapacityFunction("Todos");setCapacityInvestor("Todos")}}><option value="Todos">Todos os investidores</option><option value="Ativos">Investidores ativos</option><option value="Inativos">Investidores inativos</option></select></label>
            {(capacitySquad!=="Todos"||capacityFunction!=="Todos"||capacityInvestor!=="Todos"||capacityInvestorStatus!=="Ativos")&&<button className="clear" onClick={()=>{setCapacitySquad("Todos");setCapacityFunction("Todos");setCapacityInvestor("Todos");setCapacityInvestorStatus("Ativos")}}><X size={14}/>Limpar</button>}
          </div>
        </article>
        <article className="panel">
          <div className="panel-title"><div><small>CLIENTES EM ATENDIMENTO × CAPACIDADE MÁXIMA</small><h2>Análise segmentada</h2></div><span>ocupação das posições cadastradas</span></div>
          <div className="filter-section-label inline-label">Segmentar por</div><div className="team-function-tabs goal-dimensions capacity-dimensions"><button className={capacityDimension==="squad"?"selected":""} onClick={()=>setCapacityDimension("squad")}>Squad</button><button className={capacityDimension==="funcao"?"selected":""} onClick={()=>setCapacityDimension("funcao")}>Função</button><button className={capacityDimension==="investidor"?"selected":""} onClick={()=>setCapacityDimension("investidor")}>Investidor</button></div>
          <ResponsiveContainer width="100%" height={Math.max(320,capacityGrouped.length*42)}><BarChart data={capacityGrouped} layout="vertical" margin={{left:35,right:30}}><CartesianGrid stroke="#24272e" horizontal={false}/><XAxis type="number" tick={{fill:"#7f8591",fontSize:10}} axisLine={false} tickLine={false}/><YAxis type="category" dataKey="nome" width={155} tick={{fill:"#bcc0c8",fontSize:9}} axisLine={false} tickLine={false}/><Tooltip {...chartTip} formatter={(value,name)=>[name==="capacidade"?`${value} posições`:`${value} clientes`,name==="capacidade"?"Capacidade máxima":"Em atendimento"]} labelFormatter={(label,payload)=>payload?.[0]?.payload?.ocupacao!=null?`${label} · ${payload[0].payload.ocupacao}%`:label}/><Bar dataKey="capacidade" name="capacidade" fill="#515762" radius={[0,5,5,0]}/><Bar dataKey="clientes" name="clientes" radius={[0,5,5,0]}>{capacityGrouped.map(item=><Cell key={item.nome} fill={item.ocupacao>100?RED:item.ocupacao>=75?"#f0a33a":"#52d681"}/>)}</Bar></BarChart></ResponsiveContainer>
        </article>
        <article className="panel table-panel capacity-table-panel">
          <div className="table-title"><div><small>DETALHAMENTO POR INVESTIDOR</small><h2>Ocupação individual das carteiras</h2></div><span className="service-count">{filteredCapacityRows.length} investidores</span></div>
          <div className="table-wrap"><table className="capacity-table"><thead><tr><th>Investidor</th><th>Squad</th><th>Função</th><th>Clientes ativos</th><th>Capacidade máxima</th><th>% da capacidade</th><th>Disponibilidade</th></tr></thead><tbody>{filteredCapacityRows.slice().sort((a,b)=>(b.ocupacao??-1)-(a.ocupacao??-1)).map(row=>{const disponivel=row.capacidade==null?null:row.capacidade-row.clientesAtivos;return <tr key={row.id} className={row.ocupacao>100?"capacity-row-over":""}><td><b>{row.nome}</b></td><td>{row.squad}</td><td>{row.funcao}</td><td>{row.clientesAtivos}</td><td>{row.capacidade??"Não cadastrada"}</td><td><div className={`capacity-percent ${row.ocupacao==null?"unknown":row.ocupacao>100?"over":row.ocupacao>=75?"near":"ok"}`}><span>{row.ocupacao==null?"—":`${row.ocupacao.toLocaleString("pt-BR")}%`}</span><i><em style={{width:`${Math.min(row.ocupacao??0,100)}%`}}/></i></div></td><td>{disponivel==null?"—":disponivel<0?`${Math.abs(disponivel)} acima do limite`:`${disponivel} disponíveis`}</td></tr>})}</tbody></table></div>
          {!filteredCapacityRows.length&&<div className="empty-state">Nenhum investidor encontrado para os filtros selecionados.</div>}
        </article>
      </>}

      {tab==="metas"&&<>
        <section className="kpis compact-kpis">
          <Kpi label="Meta de resultados" value={totalGoal.toLocaleString("pt-BR")} detail={`${filteredGoals.length} acompanhamentos semanais`} icon={Target}/>
          <Kpi label="Resultados gerados" value={totalGoalResult.toLocaleString("pt-BR")} detail={`${totalGoal?Math.round(totalGoalResult/totalGoal*100):0}% da meta`} icon={TrendingUp} tone={totalGoalResult>=totalGoal?"positive":"warning"}/>
          <Kpi label="Metas atingidas" value={`${filteredGoals.length?Math.round(goalsHit/filteredGoals.length*100):0}%`} detail={`${goalsHit} de ${filteredGoals.length} registros`} icon={ShieldCheck} tone="positive"/>
          <Kpi label="Check-ins realizados" value={`${filteredGoals.length?Math.round(goalsChecked/filteredGoals.length*100):0}%`} detail={`${goalsChecked} de ${filteredGoals.length} registros`} icon={UserRoundCog}/>
        </section>
        <article className="panel goal-filter-panel">
          <div className="panel-title"><div><small>FILTROS DA META_DEMANDAS</small><h2>Recorte do acompanhamento semanal</h2></div><span>{filteredGoals.length} registros</span></div>
          <div className="filters goal-filters">
            <label className="filter-field"><span>Status do cliente</span><select aria-label="Status do cliente nas metas" value={goalClientStatus} onChange={e=>setGoalClientStatus(e.target.value)}><option>Todos</option><option value="Ativos">Clientes ativos</option><option value="Inativos">Clientes inativos</option></select></label>
            <label className="filter-field"><span>Status do investidor</span><select aria-label="Status do investidor nas metas" value={goalInvestorStatus} onChange={e=>setGoalInvestorStatus(e.target.value)}><option>Todos</option><option value="Ativos">Investidores ativos</option><option value="Inativos">Investidores inativos</option></select></label>
            <label className="filter-field"><span>Semana</span><select aria-label="Semana das metas" value={goalWeek} onChange={e=>setGoalWeek(e.target.value)}><option>Todos</option>{goalWeeks.map(value=><option key={value} value={value}>{`S${value.slice(-2)} · ${monthLabel(value.slice(0,7))}`}</option>)}</select></label>
            <label className="filter-field"><span>Mês</span><select aria-label="Mês das metas" value={goalMonth} onChange={e=>setGoalMonth(e.target.value)}><option>Todos</option>{goalMonths.map(value=><option key={value} value={value}>{monthLabel(value)}</option>)}</select></label>
            <label className="filter-field"><span>Atingimento</span><select aria-label="Atingimento da meta" value={goalHit} onChange={e=>setGoalHit(e.target.value)}><option>Todos</option><option value="Sim">Bateu a meta</option><option value="Não">Não bateu a meta</option></select></label>
            <label className="filter-field"><span>Check-in</span><select aria-label="Check-in das metas" value={goalCheckin} onChange={e=>setGoalCheckin(e.target.value)}><option>Todos</option><option value="Sim">Realizou check-in</option><option value="Não">Não realizou check-in</option></select></label>
            {(goalSquad!=="Todos"||goalClientStatus!=="Todos"||goalInvestorStatus!=="Todos"||goalWeek!=="Todos"||goalMonth!=="Todos"||goalHit!=="Todos"||goalCheckin!=="Todos")&&<button className="clear" onClick={()=>{setGoalSquad("Todos");setGoalClientStatus("Todos");setGoalInvestorStatus("Todos");setGoalWeek("Todos");setGoalMonth("Todos");setGoalHit("Todos");setGoalCheckin("Todos")}}><X size={14}/>Limpar</button>}
          </div>
        </article>
        <article className="panel">
          <div className="panel-title"><div><small>% DE PROJETOS QUE BATERAM META</small><h2>Projetos com meta atingida por {GOAL_DIMENSIONS[goalView][0].toLowerCase()}</h2></div><span>projetos atingidos ÷ acompanhados</span></div>
          <div className="filter-section-label inline-label">Agrupar gráfico por</div><div className="team-function-tabs goal-dimensions">{Object.entries(GOAL_DIMENSIONS).map(([key,[label]])=><button key={key} className={goalView===key?"selected":""} onClick={()=>setGoalView(key)}>{label}</button>)}</div>
          <ResponsiveContainer width="100%" height={380}><BarChart data={goalGrouped} layout="vertical" margin={{left:35,right:35}}><CartesianGrid stroke="#24272e" horizontal={false}/><XAxis type="number" domain={[0,100]} tickFormatter={value=>`${value}%`} tick={{fill:"#7f8591",fontSize:10}} axisLine={false} tickLine={false}/><YAxis type="category" dataKey="nome" width={145} tick={{fill:"#bcc0c8",fontSize:9}} axisLine={false} tickLine={false}/><Tooltip {...chartTip} formatter={(value,_name,item)=>[`${value}% (${item.payload.atingidas} de ${item.payload.registros})`,"Projetos que bateram meta"]}/><ReferenceLine x={75} stroke="#52d681" strokeDasharray="4 4"/><Bar name="% de projetos que bateram meta" dataKey="atingimento" radius={[0,5,5,0]}>{goalGrouped.map(item=><Cell key={item.nome} fill={item.atingimento>75?"#52d681":RED}/>)}</Bar></BarChart></ResponsiveContainer>
        </article>
        <article className="panel">
          <div className="panel-title"><div><small>EVOLUÇÃO DO ATINGIMENTO</small><h2>% de projetos que bateram meta ao longo do tempo</h2></div><span>linha de referência em 75%</span></div>
          <div className="filter-section-label inline-label">Período da evolução</div><div className="team-function-tabs goal-dimensions"><button className={goalEvolutionPeriod==="Semana"?"selected":""} onClick={()=>setGoalEvolutionPeriod("Semana")}>Semanas</button><button className={goalEvolutionPeriod==="Mês"?"selected":""} onClick={()=>setGoalEvolutionPeriod("Mês")}>Meses</button></div>
          <ResponsiveContainer width="100%" height={330}><AreaChart data={goalEvolution} margin={{left:0,right:20}}><defs><linearGradient id="goalEvolutionFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#52d681" stopOpacity=".34"/><stop offset="1" stopColor="#52d681" stopOpacity="0"/></linearGradient></defs><CartesianGrid stroke="#24272e" vertical={false}/><XAxis dataKey="nome" tick={{fill:"#7f8591",fontSize:9}} axisLine={false} tickLine={false}/><YAxis domain={[0,100]} tickFormatter={value=>`${value}%`} tick={{fill:"#7f8591",fontSize:10}} axisLine={false} tickLine={false}/><Tooltip {...chartTip} formatter={(value,_name,item)=>[`${value}% (${item.payload.atingidas} de ${item.payload.registros})`,"Projetos que bateram meta"]}/><ReferenceLine y={75} stroke="#52d681" strokeDasharray="4 4"/><Area type="monotone" dataKey="percentual" name="Projetos que bateram meta" stroke="#52d681" strokeWidth={2.5} fill="url(#goalEvolutionFill)" activeDot={{r:5,fill:"#52d681"}}/></AreaChart></ResponsiveContainer>
        </article>
        <article className="panel table-panel goal-table-panel">
          <div className="table-title"><div><small>DETALHAMENTO SEMANAL</small><h2>Resultados por cliente e equipe</h2></div><span className="service-count">{filteredGoals.length} registros</span></div>
          <div className="table-wrap"><table className="goal-table"><thead><tr><th>Cliente</th><th>Squad</th><th>Account</th><th>Gestor de tráfego</th><th>Designer</th><th>Período</th><th>Meta</th><th>Resultado</th><th>Atingimento</th><th>Check-in</th></tr></thead><tbody>{goalRows.map(row=><tr key={row.id}><td><b>{row.cliente}</b><small>{row.clienteAtivo?"Cliente ativo":"Cliente inativo"} · {row.objetivo}</small></td><td>{row.squad}</td><td>{row.account}</td><td>{row.gestorTrafego}</td><td>{row.designer}</td><td><b>S{String(row.semana).padStart(2,"0")}</b><small>{monthLabel(`${row.ano}-${String(row.mes).padStart(2,"0")}`)}</small></td><td>{row.meta.toLocaleString("pt-BR")}</td><td>{row.resultado.toLocaleString("pt-BR")}</td><td><span className={`badge ${row.bateuMeta?"on":"off"}`}>{row.bateuMeta?"Meta batida":"Abaixo da meta"}</span></td><td><span className={`badge ${row.checkinRealizado?"on":"off"}`}>{row.checkinRealizado?"Realizado":"Não realizado"}</span></td></tr>)}</tbody></table></div>
          <div className="pagination"><span>Exibindo {goalRows.length} de {filteredGoals.length} registros</span><div><button disabled={visibleGoalPage<=1} onClick={()=>setGoalPage(value=>value-1)}><ChevronLeft/></button><b>{visibleGoalPage} / {goalPages}</b><button disabled={visibleGoalPage>=goalPages} onClick={()=>setGoalPage(value=>value+1)}><ChevronRight/></button></div></div>
          {!filteredGoals.length&&<div className="empty-state">Nenhum acompanhamento encontrado para os filtros selecionados.</div>}
        </article>
      </>}

      {tab==="squads"&&<>
        <section className="kpis compact-kpis">
          <Kpi label="Squads com carteira" value={visibleSquadRows.length} detail="squads com clientes ou receita" icon={Users}/>
          <Kpi label="Clientes ativos" value={totalSquadActive} detail={`${totalSquadChurn} clientes em churn`} icon={BriefcaseBusiness} tone="positive"/>
          <Kpi label="MRR dos squads" value={money(totalSquadMrr)} detail="contratos vigentes por carteira" icon={CircleDollarSign} tone="positive"/>
          <Kpi label="Distribuição média" value={visibleSquadRows.length?Math.round((totalSquadActive+totalSquadChurn)/visibleSquadRows.length):0} detail="clientes por squad" icon={TrendingUp}/>
        </section>
        <section className="grid two squad-charts">
          <article className="panel"><div className="panel-title"><div><small>COMPOSIÇÃO DAS CARTEIRAS</small><h2>Clientes ativos e churn por squad</h2></div><span>top 12 carteiras</span></div>
            <div className="legend"><i className="green"/>Ativos <i className="red"/>Churn</div>
            <ResponsiveContainer width="100%" height={360}><BarChart data={squadChartData} layout="vertical" margin={{left:18,right:18}}><CartesianGrid stroke="#24272e" horizontal={false}/><XAxis type="number" tick={{fill:"#7f8591",fontSize:10}} axisLine={false} tickLine={false}/><YAxis type="category" dataKey="nome" width={105} tick={{fill:"#bcc0c8",fontSize:10}} axisLine={false} tickLine={false}/><Tooltip {...chartTip}/><Bar dataKey="ativos" stackId="clientes" fill="#52d681"/><Bar dataKey="churned" stackId="clientes" fill={RED} radius={[0,5,5,0]}/></BarChart></ResponsiveContainer>
          </article>
          <article className="panel"><div className="panel-title"><div><small>VALOR DAS CARTEIRAS</small><h2>Recorrente e oneshot por squad</h2></div><span>contratos vigentes</span></div>
            <div className="legend"><i className="green"/>Recorrente <i className="red"/>Oneshot</div>
            <ResponsiveContainer width="100%" height={360}><BarChart data={squadChartData} margin={{left:-8,right:8,bottom:34}}><CartesianGrid stroke="#24272e" vertical={false}/><XAxis dataKey="nome" angle={-28} textAnchor="end" interval={0} tick={{fill:"#7f8591",fontSize:9}} axisLine={false} tickLine={false}/><YAxis tickFormatter={compact} tick={{fill:"#7f8591",fontSize:10}} axisLine={false} tickLine={false}/><Tooltip {...chartTip} formatter={value=>money(value)}/><Bar dataKey="mrr" fill="#52d681" radius={[5,5,0,0]}/><Bar dataKey="oneshot" fill={RED} radius={[5,5,0,0]}/></BarChart></ResponsiveContainer>
          </article>
        </section>
        <article className="panel table-panel squad-summary-panel">
          <div className="table-title"><div><small>RESUMO POR SQUAD</small><h2>Carteira e resultado financeiro</h2></div><span className="service-count">{visibleSquadRows.length} squads</span></div>
          <div className="table-wrap"><table className="squad-summary-table"><thead><tr><th>Squad</th><th>Clientes ativos</th><th>Churn</th><th>Taxa de churn</th><th>MRR</th><th>Oneshot</th><th>LTV aproximado</th></tr></thead><tbody>{visibleSquadRows.map(item=><tr key={item.id}><td><b>{item.nome}</b><small>{item.ativos+item.churned} clientes na carteira</small></td><td>{item.ativos}</td><td>{item.churned}</td><td>{item.churn.toLocaleString("pt-BR",{maximumFractionDigits:1})}%</td><td>{money(item.mrr)}</td><td>{money(item.oneshot)}</td><td>{money(item.ltv)}</td></tr>)}</tbody></table></div>
        </article>
        <article className="panel table-panel squad-clients-panel">
          <div className="table-title"><div><small>DETALHAMENTO DA CARTEIRA</small><h2>Clientes do squad</h2></div><span className="service-count">{filteredSquadClients.length} clientes</span></div>
          <div className="filters"><label className="filter-field search-field"><span>Buscar</span><div className="filter-input"><Search size={16}/><input value={squadClientSearch} onChange={event=>{setSquadClientSearch(event.target.value);setSquadPage(1)}} placeholder="Cliente ou responsável..."/></div></label><label className="filter-field"><span>Status do cliente</span><select aria-label="Filtrar clientes por status" value={squadClientStatus} onChange={event=>{setSquadClientStatus(event.target.value);setSquadPage(1)}}><option value="Todos">Todos os clientes</option><option value="Ativos">Clientes ativos</option><option value="Inativos">Clientes inativos</option></select></label>{(squadDetail!=="Todos"||squadClientStatus!=="Todos"||squadClientSearch)&&<button className="clear" onClick={()=>{setSquadDetail("Todos");setSquadClientStatus("Todos");setSquadClientSearch("");setSquadPage(1)}}><X size={14}/>Limpar</button>}</div>
          <div className="table-wrap"><table><thead><tr><th>Cliente</th><th>Squad</th><th>Responsável</th><th>Status</th><th>MRR</th><th>Oneshot</th><th>Contratos vigentes</th></tr></thead><tbody>{squadClientRows.map(client=><tr key={client.id}><td><b>{client.nome}</b><small>Entrada {client.entrada}</small></td><td>{client.squad}</td><td>{client.responsavel}</td><td><span className={`badge ${client.ativo?"on":"off"}`}>{client.ativo?"Ativo":"Churn"}</span></td><td>{money(client.mrr)}</td><td>{money(client.oneshot)}</td><td>{client.contratos}</td></tr>)}</tbody></table></div>
          <div className="pagination"><span>Exibindo {squadClientRows.length} de {filteredSquadClients.length} clientes</span><div><button disabled={visibleSquadPage<=1} onClick={()=>setSquadPage(value=>value-1)}><ChevronLeft/></button><b>{visibleSquadPage} / {squadPages}</b><button disabled={visibleSquadPage>=squadPages} onClick={()=>setSquadPage(value=>value+1)}><ChevronRight/></button></div></div>
        </article>
      </>}

      {tab==="remuneracoes"&&<>
        <section className="kpis compact-kpis remuneration-kpis">
          <Kpi label="Remunerações vigentes" value={remuneracaoAtual.length} detail="registros válidos na data atual" icon={WalletCards} tone="positive"/>
          <Kpi label="Investidores remunerados" value={new Set(remuneracaoAtual.map(row=>row.investidor_id)).size} detail={`${remuneracaoInvestidores.length} investidores disponíveis`} icon={Users}/>
          <Kpi label="Folha mensal vigente" value={money(folhaAtual)} detail="soma das remunerações vigentes" icon={CircleDollarSign} tone="warning"/>
        </section>
        <div className="sensitive-note"><ShieldCheck size={16}/><div><b>Dados financeiros restritos</b><span>Os valores são consultados somente por uma rota protegida no servidor e não integram os demais dashboards.</span></div></div>
        {remuneracaoError&&<div className="snapshot-note error-note remuneration-error"><AlertTriangle size={16}/><b>Não foi possível concluir:</b> {remuneracaoError}</div>}
        {remuneracaoError.toLowerCase().includes("acesso")&&<article className="panel access-panel"><div className="panel-title"><div><small>ACESSO ADMINISTRATIVO</small><h2>Informe o token configurado no ambiente</h2></div><KeyRound/></div><label className="filter-field"><span>Token administrativo</span><input type="password" value={remuneracaoToken} onChange={event=>setRemuneracaoToken(event.target.value)} placeholder="REMUNERACAO_ADMIN_TOKEN"/></label><button className="primary-action" onClick={loadRemuneracoes}><KeyRound size={15}/>Validar acesso</button></article>}
        <article className="panel remuneration-form-panel">
          <div className="panel-title"><div><small>{editingRemuneracaoId?"EDITAR REMUNERAÇÃO":"NOVA REMUNERAÇÃO"}</small><h2>{editingRemuneracaoId?"Atualize a vigência e o valor":"Cadastre uma remuneração"}</h2></div>{editingRemuneracaoId&&<span>Registro #{editingRemuneracaoId}</span>}</div>
          <form className="remuneration-form" onSubmit={saveRemuneracao}>
            <div className="remuneration-form-grid">
              <label className="filter-field"><span>Investidor</span><select required value={remuneracaoForm.investidor_id} onChange={event=>setRemuneracaoForm(form=>({...form,investidor_id:event.target.value}))}><option value="">Selecione um investidor</option>{remuneracaoInvestidores.map(item=><option key={item.investidor_id} value={item.investidor_id}>{item.nome}{item.ativo===false?" · Inativo":""}</option>)}</select></label>
              <label className="filter-field"><span>Remuneração mensal</span><input required type="number" min="0" step="0.01" value={remuneracaoForm.remuneracao} onChange={event=>setRemuneracaoForm(form=>({...form,remuneracao:event.target.value}))} placeholder="0,00"/></label>
              <label className="filter-field"><span>Início da vigência</span><input required type="date" value={remuneracaoForm.data_inicio_vigencia} onChange={event=>setRemuneracaoForm(form=>({...form,data_inicio_vigencia:event.target.value}))}/></label>
              <label className="filter-field"><span>Fim da vigência (opcional)</span><input type="date" min={remuneracaoForm.data_inicio_vigencia||undefined} value={remuneracaoForm.data_fim_vigencia} onChange={event=>setRemuneracaoForm(form=>({...form,data_fim_vigencia:event.target.value}))}/></label>
            </div>
            <div className="remuneration-actions"><button type="submit" className="primary-action" disabled={remuneracaoSaving||remuneracaoLoading}>{editingRemuneracaoId?<Save size={15}/>:<Plus size={15}/>} {remuneracaoSaving?"Salvando…":editingRemuneracaoId?"Salvar alterações":"Cadastrar remuneração"}</button>{editingRemuneracaoId&&<button type="button" className="secondary-action" onClick={resetRemuneracaoForm}><X size={15}/>Cancelar edição</button>}</div>
          </form>
        </article>
        <article className="panel table-panel remuneration-table-panel">
          <div className="table-title"><div><small>HISTÓRICO DE VIGÊNCIAS</small><h2>Remunerações cadastradas</h2></div><span className="service-count">{visibleRemuneracoes.length} registros</span></div>
          <div className="filters"><label className="filter-field search-field"><span>Buscar investidor</span><div className="filter-input"><Search size={16}/><input value={remuneracaoSearch} onChange={event=>setRemuneracaoSearch(event.target.value)} placeholder="Nome do investidor..."/></div></label>{remuneracaoSearch&&<button className="clear" onClick={()=>setRemuneracaoSearch("")}><X size={14}/>Limpar busca</button>}</div>
          <div className="table-wrap"><table className="remuneration-table"><thead><tr><th>Investidor</th><th>Remuneração</th><th>Início</th><th>Fim</th><th>Status</th><th>Ações</th></tr></thead><tbody>{visibleRemuneracoes.map(row=>{const [label,tone]=vigenciaStatus(row);return <tr key={row.id}><td><b>{row.investidor_nome}</b><small>ID {row.investidor_id}</small></td><td className="remuneration-value">{money(Number(row.remuneracao))}</td><td>{dateBr(row.data_inicio_vigencia)}</td><td>{dateBr(row.data_fim_vigencia)}</td><td><span className={`badge ${tone}`}>{label}</span></td><td><div className="row-actions"><button aria-label={`Editar remuneração de ${row.investidor_nome}`} title="Editar" onClick={()=>editRemuneracao(row)}><Pencil size={14}/></button><button className="danger-action" aria-label={`Excluir remuneração de ${row.investidor_nome}`} title="Excluir" disabled={remuneracaoSaving} onClick={()=>deleteRemuneracao(row)}><Trash2 size={14}/></button></div></td></tr>})}</tbody></table></div>
          {remuneracaoLoading&&<div className="empty-state">Carregando remunerações…</div>}{!remuneracaoLoading&&!visibleRemuneracoes.length&&<div className="empty-state">Nenhuma remuneração encontrada.</div>}
        </article>
      </>}

      {tab==="economics"&&<Economics/>}

      {tab==="visao"&&<article className="panel table-panel" id="carteira">
        <div className="table-title"><div><small>CLIENTES × CONTRATOS</small><h2>Carteira consolidada</h2></div><button className="export" onClick={csv}><Download size={16}/>Exportar CSV</button></div>
        <div className="filters"><label className="filter-field search-field"><span>Buscar</span><div className="filter-input"><Search size={16}/><input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Cliente ou responsável..."/></div></label>{search&&<button className="clear" onClick={()=>{setSearch("");setPage(1)}}><X size={14}/>Limpar busca</button>}</div>
        <div className="table-wrap"><table><thead><tr><th>Cliente</th><th>Status</th><th>Squad / responsável</th><th>MRR</th><th>Oneshot</th><th>LTV aprox.</th><th>Contratos</th><th>Entrada</th></tr></thead><tbody>{pageRows.map(c=><tr key={c.id} className={c.ativo&&c.contratos===0?"flagged":""}><td><b>{c.nome}</b><small>Segmento {c.segmento??"—"} · Origem {c.origem??"—"}</small></td><td><span className={`badge ${c.ativo?"on":"off"}`}>{c.ativo?"Ativo":"Churn"}</span>{c.ativo&&c.contratos===0&&<span className="warning-tag">Sem contrato</span>}</td><td><b>{c.squad}</b><small>{c.responsavel}</small></td><td>{money(c.mrr)}</td><td>{money(c.oneshot)}</td><td>{money(c.ltv)}</td><td>{c.contratos}</td><td>{c.entrada}</td></tr>)}</tbody></table></div>
        <div className="pagination"><span>Exibindo {pageRows.length} de {filtered.length} registros filtrados</span><div><button disabled={page<=1} onClick={()=>setPage(p=>p-1)}><ChevronLeft/></button><b>{Math.min(page,pages)} / {pages}</b><button disabled={page>=pages} onClick={()=>setPage(p=>p+1)}><ChevronRight/></button></div></div>
      </article>}
      <footer><span>TF Hub • Gestão de carteira</span><span><Filter size={13}/> Segmentos resolvidos por nome; origens continuam por ID.</span></footer>
    </section>
  </main>
}
