import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const TOKEN_HASH = "f92118afc4f1030e4f56b16f10887a827f5070dc702280b9f2ba4be7b541301f";
const FOLDER_ID = "1GL5x_geMvO-4WfYr_mhvhMcQVI6sO21n";
type Config = { file: string; table: string | null; key: string; columns: string[]; numbers?: string[]; booleans?: string[] };
const CONFIGS: Config[] = [
  {file:"squads.csv",table:"squads",key:"squad_id",columns:["squad_id","nome","logo_url","ativo","responsavel_id"],numbers:["squad_id","responsavel_id"],booleans:["ativo"]},
  {file:"funcoes.csv",table:"funcoes",key:"funcao_id",columns:["funcao_id","nome","setor_id","ativo"],numbers:["funcao_id","setor_id"],booleans:["ativo"]},
  {file:"servicos.csv",table:"servicos",key:"servico_id",columns:["servico_id","nome","descricao","ativo"],numbers:["servico_id"],booleans:["ativo"]},
  {file:"segmentos.csv",table:"segmentos",key:"segmento_id",columns:["segmento_id","nome"],numbers:["segmento_id"]},
  {file:"origens.csv",table:null,key:"origem_id",columns:[]},
  {file:"investidores.csv",table:"investidores",key:"investidor_id",columns:["investidor_id","squad_id","senioridade_id","funcao_id","nome","role","foto_perfil","data_inicio","data_fim","ativo"],numbers:["investidor_id","squad_id","funcao_id"],booleans:["ativo"]},
  {file:"clientes.csv",table:"clientes",key:"cliente_id",columns:["cliente_id","nome","razao_social","gmv","ativo","investidor_id","segmento_id","endereco_id","modelo_de_venda_id","created_at","updated_at","criado_por_id","origem_id","data_entrada","data_churn","squad_responsavel_id"],numbers:["cliente_id","gmv","investidor_id","segmento_id","endereco_id","modelo_de_venda_id","origem_id","squad_responsavel_id"],booleans:["ativo"]},
  {file:"planos.csv",table:"planos",key:"plano_id",columns:["plano_id","nome","servico_id","ativo"],numbers:["plano_id","servico_id"],booleans:["ativo"]},
  {file:"contratos.csv",table:"contratos",key:"contrato_id",columns:["contrato_id","valor_contrato","valor_implantacao","fee_mensal","data_assinatura","data_contrato","data_fim_contrato","ativo","cliente_id","investidor_id","renovavel","meses","valor_bookado","qtd_parcelas","valor_parcela","tipo","squad_id"],numbers:["contrato_id","valor_contrato","valor_implantacao","fee_mensal","cliente_id","investidor_id","meses","valor_bookado","qtd_parcelas","valor_parcela","squad_id"],booleans:["ativo","renovavel"]},
  {file:"cliente_equipe.csv",table:"cliente_equipe",key:"equipe_id",columns:["equipe_id","cliente_id","investidor_id","servico_id"],numbers:["equipe_id","cliente_id","investidor_id","servico_id"]},
  {file:"contrato_planos.csv",table:"contratos_planos",key:"contrato_plano_id",columns:["contrato_plano_id","contrato_id","plano_id"],numbers:["contrato_plano_id","contrato_id","plano_id"]},
];
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"private, no-store","x-content-type-options":"nosniff"}});
async function sha256(value:string){const digest=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return[...new Uint8Array(digest)].map(b=>b.toString(16).padStart(2,"0")).join("")}
function safeEqual(a:string,b:string){if(a.length!==b.length)return false;let result=0;for(let i=0;i<a.length;i++)result|=a.charCodeAt(i)^b.charCodeAt(i);return result===0}
function b64url(value:string|Uint8Array){const bytes=typeof value==="string"?new TextEncoder().encode(value):value;let binary="";for(const byte of bytes)binary+=String.fromCharCode(byte);return btoa(binary).replaceAll("+","-").replaceAll("/","_").replace(/=+$/g,"")}
async function googleToken(c:Record<string,string>){
  if(c?.type!=="service_account"||!c.client_email||!c.private_key||!c.token_uri)throw new Error("Credencial do Google inválida");
  const now=Math.floor(Date.now()/1000),head=b64url(JSON.stringify({alg:"RS256",typ:"JWT"})),claim=b64url(JSON.stringify({iss:c.client_email,scope:"https://www.googleapis.com/auth/drive.readonly",aud:c.token_uri,iat:now,exp:now+3600}));
  const pem=c.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\s/g,""),der=Uint8Array.from(atob(pem),x=>x.charCodeAt(0));
  const key=await crypto.subtle.importKey("pkcs8",der,{name:"RSASSA-PKCS1-v1_5",hash:"SHA-256"},false,["sign"]);
  const sig=await crypto.subtle.sign("RSASSA-PKCS1-v1_5",key,new TextEncoder().encode(`${head}.${claim}`));
  const response=await fetch(c.token_uri,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion:`${head}.${claim}.${b64url(new Uint8Array(sig))}`})});
  if(!response.ok)throw new Error("Não foi possível autenticar no Google Drive");return String((await response.json()).access_token);
}
function parseCsv(text:string){
  const rows:string[][]=[];let row:string[]=[],cell="",quoted=false;const source=text.replace(/^\uFEFF/,"");
  for(let i=0;i<source.length;i++){const ch=source[i];if(quoted){if(ch==='"'&&source[i+1]==='"'){cell+='"';i++}else if(ch==='"')quoted=false;else cell+=ch}else if(ch==='"')quoted=true;else if(ch===","){row.push(cell);cell=""}else if(ch==="\n"){row.push(cell.replace(/\r$/,""));rows.push(row);row=[];cell=""}else cell+=ch}
  if(cell||row.length){row.push(cell.replace(/\r$/,""));rows.push(row)}if(!rows.length)return{headers:[],records:[]};
  const headers=rows[0].map(h=>h.trim());return{headers,records:rows.slice(1).filter(v=>v.some(x=>x.trim())).map(v=>Object.fromEntries(headers.map((h,i)=>[h,v[i]??""])))};
}
function normalize(record:Record<string,string>,c:Config){const out:Record<string,unknown>={},allowed=new Set(c.columns);for(const[column,raw]of Object.entries(record)){if(!allowed.has(column))continue;const value=raw.trim();if(!value||value.toLowerCase()==="null")out[column]=null;else if(c.booleans?.includes(column))out[column]=["true","t","1","sim","yes"].includes(value.toLowerCase());else if(c.numbers?.includes(column)){const n=Number(value.replace(",","."));out[column]=Number.isFinite(n)?n:null}else out[column]=value}return out}

Deno.serve(async(request)=>{
  if(request.method!=="POST")return json({error:"Método não permitido"},405);
  const token=request.headers.get("x-tfhub-token")??"";if(!token||!safeEqual(await sha256(token),TOKEN_HASH))return json({error:"Não autorizado"},401);
  try{
    const body=await request.json();
    const dryRun=body?.dryRun===true;
    const access=await googleToken(body?.googleServiceAccount);
    const params=new URLSearchParams({q:`'${FOLDER_ID}' in parents and trashed = false`,fields:"files(id,name,mimeType,size,modifiedTime)",pageSize:"100",supportsAllDrives:"true",includeItemsFromAllDrives:"true"});
    const listing=await fetch(`https://www.googleapis.com/drive/v3/files?${params}`,{headers:{authorization:`Bearer ${access}`}});
    if(!listing.ok)throw new Error("A Service Account não conseguiu ler a pasta");
    const files=(await listing.json()).files as Array<{id:string;name:string;size?:string;modifiedTime?:string}>;
    const required=CONFIGS.map(c=>c.file),missing=required.filter(name=>!files.some(f=>f.name===name)),unexpected=files.filter(f=>!required.includes(f.name)).map(f=>f.name);
    if(missing.length||unexpected.length)return json({error:"A pasta não corresponde à lista autorizada",missing,unexpected},400);
    const secretKeys=JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS")??"{}"),secret=secretKeys.default??Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"),url=Deno.env.get("SUPABASE_URL");
    if(!secret||!url)return json({error:"Configuração do banco indisponível"},500);
    const db=createClient(url,secret,{auth:{persistSession:false,autoRefreshToken:false}}),results:Record<string,unknown>[]=[];
    for(const c of CONFIGS){
      const file=files.find(f=>f.name===c.file)!;if(Number(file.size??"0")>5_000_000)throw new Error(`${c.file}: arquivo excede 5 MB`);
      if(!c.table){results.push({file:c.file,status:"ignored",reason:"Tabela origens ainda não existe no Supabase"});continue}
      const download=await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,{headers:{authorization:`Bearer ${access}`}});if(!download.ok)throw new Error(`${c.file}: falha no download`);
      const parsed=parseCsv(await download.text());if(!parsed.headers.includes(c.key))throw new Error(`${c.file}: chave ${c.key} ausente`);if(parsed.records.length>10_000)throw new Error(`${c.file}: excede 10000 linhas`);
      const records=parsed.records.map(r=>normalize(r,c));if(records.some(r=>r[c.key]==null))throw new Error(`${c.file}: existe linha sem ${c.key}`);
      const ids=records.map(r=>r[c.key]),existing=new Set<string>();for(let i=0;i<ids.length;i+=500){const{data,error}=await db.from(c.table).select(c.key).in(c.key,ids.slice(i,i+500));if(error)throw new Error(`${c.file}: ${error.message}`);for(const row of data??[])existing.add(String(row[c.key]))}
      if(!dryRun){for(let i=0;i<records.length;i+=300){const{error}=await db.from(c.table).upsert(records.slice(i,i+300),{onConflict:c.key});if(error)throw new Error(`${c.file}: ${error.message}`)}}
      const updated=records.filter(r=>existing.has(String(r[c.key]))).length;results.push({file:c.file,table:c.table,status:"ok",rows:records.length,inserted:records.length-updated,updated,modifiedTime:file.modifiedTime??null});
    }
    return json({ok:true,dryRun,syncedAt:new Date().toISOString(),results});
  }catch(error){console.error("TFHub Drive sync failed",error instanceof Error?error.message:error);return json({error:error instanceof Error?error.message:"Falha na sincronização"},500)}
});
