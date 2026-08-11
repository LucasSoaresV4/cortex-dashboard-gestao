create table if not exists public.economics_config (
  id smallint primary key default 1 check (id = 1),
  imposto_percentual numeric(6, 3) not null default 9 check (imposto_percentual between 0 and 100),
  royalties_percentual numeric(6, 3) not null default 15 check (royalties_percentual between 0 and 100),
  cluster_small_ate numeric(14, 2) not null default 5000,
  cluster_medium_ate numeric(14, 2) not null default 10000,
  cluster_large_ate numeric(14, 2) not null default 20000,
  meta_csp numeric(8, 4) not null default 0.50,
  meta_rpco numeric(14, 2) not null default 12000,
  meta_mc numeric(8, 4) not null default 0.50,
  meta_nrr numeric(8, 4) not null default 1.00,
  updated_at timestamptz not null default now(),
  constraint economics_cluster_order check (
    cluster_small_ate <= cluster_medium_ate and cluster_medium_ate <= cluster_large_ate
  )
);

insert into public.economics_config (id) values (1)
on conflict (id) do nothing;

alter table public.economics_config enable row level security;
revoke all on table public.economics_config from anon, authenticated;
grant select, insert, update on table public.economics_config to service_role;

