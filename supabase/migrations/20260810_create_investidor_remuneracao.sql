create table if not exists public.investidor_remuneracao (
  id bigint generated always as identity primary key,
  investidor_id bigint not null references public.investidores (investidor_id)
    on update cascade on delete restrict,
  investidor_nome text not null,
  remuneracao numeric(14, 2) not null check (remuneracao >= 0),
  data_inicio_vigencia date not null,
  data_fim_vigencia date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint investidor_remuneracao_periodo_valido
    check (data_fim_vigencia is null or data_fim_vigencia >= data_inicio_vigencia)
);

create index if not exists investidor_remuneracao_investidor_idx
  on public.investidor_remuneracao (investidor_id);

create index if not exists investidor_remuneracao_vigencia_idx
  on public.investidor_remuneracao (data_inicio_vigencia, data_fim_vigencia);

create or replace function public.sync_investidor_remuneracao()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  nome_atual text;
begin
  select nome into nome_atual
  from public.investidores
  where investidor_id = new.investidor_id;

  if nome_atual is null then
    raise exception 'Investidor % não encontrado', new.investidor_id;
  end if;

  new.investidor_nome := nome_atual;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists investidor_remuneracao_sync_trigger
  on public.investidor_remuneracao;

create trigger investidor_remuneracao_sync_trigger
before insert or update on public.investidor_remuneracao
for each row execute function public.sync_investidor_remuneracao();

create or replace function public.propagate_investidor_nome_remuneracao()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.nome is distinct from old.nome then
    update public.investidor_remuneracao
    set investidor_nome = new.nome,
        updated_at = now()
    where investidor_id = new.investidor_id;
  end if;
  return new;
end;
$$;

drop trigger if exists investidores_remuneracao_nome_trigger
  on public.investidores;

create trigger investidores_remuneracao_nome_trigger
after update of nome on public.investidores
for each row execute function public.propagate_investidor_nome_remuneracao();

alter table public.investidor_remuneracao enable row level security;

revoke all on table public.investidor_remuneracao from anon, authenticated;
grant select, insert, update, delete on table public.investidor_remuneracao to service_role;
grant usage, select on sequence public.investidor_remuneracao_id_seq to service_role;

comment on table public.investidor_remuneracao is
  'Histórico de remuneração por investidor, acessível somente pelo backend.';

comment on column public.investidor_remuneracao.remuneracao is
  'Valor monetário protegido pela criptografia em repouso do Supabase e por RLS.';
