-- =============================================================================
-- ESQUEMA DO BANCO DE DADOS - BOLÃO MULTI-TENANCY 2026
-- Este script é seguro para ser executado múltiplas vezes (Idempotente)
-- =============================================================================

-- 1. Extensões
create extension if not exists "uuid-ossp";

-- 2. Tabela de Usuários (Púbica, vinculada ao Auth)
create table if not exists public.users (
  id uuid references auth.users not null primary key,
  email text unique,
  display_name text,
  photo_url text,
  last_login timestamp with time zone default now(),
  approved boolean default false,
  has_license boolean default false,
  max_participants_allowed integer default 15,
  max_leagues_allowed integer default 1,
  plan_type text,
  created_at timestamp with time zone default now()
);

-- Migração: Adiciona colunas se a tabela já existia sem elas
do $$ 
begin 
  if not exists (select 1 from INFORMATION_SCHEMA.COLUMNS where table_name = 'users' and column_name = 'max_leagues_allowed') then
    alter table public.users add column max_leagues_allowed integer default 1;
  end if;
end $$;

-- 3. Trigger de Sincronização Auth -> Public
-- Cria o perfil automaticamente quando um usuário se cadastra
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.users (id, email, display_name, photo_url)
  values (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), 
    coalesce(new.raw_user_meta_data->>'avatar_url', 'https://api.dicebear.com/7.x/avataaars/svg?seed=' || new.id)
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. Tabelas de Negócio
create table if not exists public.admins (
  email text primary key,
  created_at timestamp with time zone default now()
);

create table if not exists public.leagues (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  owner_id uuid references public.users(id) not null,
  invite_code text unique not null,
  max_participants integer default 15,
  created_at timestamp with time zone default now()
);

create table if not exists public.league_members (
  league_id uuid references public.leagues(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  primary key (league_id, user_id)
);

create table if not exists public.results (
  match_id text primary key,
  home_score integer not null,
  away_score integer not null,
  updated_at timestamp with time zone default now()
);

create table if not exists public.predictions (
  id uuid default uuid_generate_v4() primary key,
  league_id uuid references public.leagues(id) on delete cascade,
  user_id uuid references public.users(id) on delete cascade,
  match_id text not null,
  home_score integer not null,
  away_score integer not null,
  updated_at timestamp with time zone default now(),
  unique(league_id, user_id, match_id)
);

-- 5. Tabelas de Pagamento
create table if not exists public.purchases (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id),
  plan text not null,
  price text not null,
  code text not null,
  payment_id text,
  created_at timestamp with time zone default now()
);

create table if not exists public.purchase_codes (
  code text primary key,
  max_participants integer not null,
  used_by uuid references public.users(id),
  used_at timestamp with time zone default now(),
  plan_type text,
  status text default 'active'
);

-- 6. Configuração de RLS (Segurança)
alter table public.users enable row level security;
alter table public.leagues enable row level security;
alter table public.league_members enable row level security;
alter table public.predictions enable row level security;
alter table public.results enable row level security;

-- Políticas de Usuários
drop policy if exists "Users can view own profile" on users;
create policy "Users can view own profile" on users for select using (auth.uid() = id);

drop policy if exists "Users can update own profile" on users;
create policy "Users can update own profile" on users for update using (auth.uid() = id);

-- Políticas de Ligas
drop policy if exists "Members can see their leagues" on leagues;
create policy "Members can see their leagues" on leagues for select using (
  exists (select 1 from league_members where league_id = leagues.id and user_id = auth.uid())
);

drop policy if exists "Owners can manage their leagues" on leagues;
create policy "Owners can manage their leagues" on leagues for all using (owner_id = auth.uid());

-- Políticas de Membros
drop policy if exists "Members can see each other" on league_members;
create policy "Members can see each other" on league_members for select using (
  exists (select 1 from league_members lm where lm.league_id = league_members.league_id and lm.user_id = auth.uid())
);

drop policy if exists "Users can join leagues" on league_members;
create policy "Users can join leagues" on league_members for insert with check (auth.uid() = user_id);

-- Políticas de Resultados (Públicos para leitura)
drop policy if exists "Public results" on results;
create policy "Public results" on results for select using (true);

-- 7. Trigger de Proteção de Capacidade
create or replace function check_league_capacity()
returns trigger language plpgsql as $$
declare
  current_count integer;
  max_cap integer;
begin
  select count(*) into current_count from league_members where league_id = NEW.league_id;
  select max_participants into max_cap from leagues where id = NEW.league_id;
  if max_cap is not null and current_count >= max_cap then
    raise exception 'LEAGUE_FULL: Limite de % participantes atingido.', max_cap using errcode = 'P0001';
  end if;
  return NEW;
end;
$$;

drop trigger if exists enforce_league_capacity on league_members;
create trigger enforce_league_capacity
before insert on league_members
for each row execute function check_league_capacity();

-- 8. Índices de Performance
create index if not exists idx_league_members_league_id on league_members(league_id);
create index if not exists idx_predictions_league_user on predictions(league_id, user_id);
create index if not exists idx_leagues_invite_code on leagues(invite_code);
