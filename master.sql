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
  max_participants_allowed integer default 0,
  max_leagues_allowed integer default 0,
  plan_type text,
  created_at timestamp with time zone default now()
);

-- Migração: Adiciona colunas se a tabela já existia sem elas
do $$ 
begin 
  -- Tabela USERS
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='approved') then
    alter table public.users add column approved boolean default false;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='has_license') then
    alter table public.users add column has_license boolean default false;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='max_participants_allowed') then
    alter table public.users add column max_participants_allowed integer default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='max_leagues_allowed') then
    alter table public.users add column max_leagues_allowed integer default 0;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='plan_type') then
    alter table public.users add column plan_type text;
  end if;

  -- Tabela LEAGUES
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='leagues' and column_name='max_participants') then
    alter table public.leagues add column max_participants integer default 15;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='leagues' and column_name='custom_logo') then
    alter table public.leagues add column custom_logo text;
  end if;

  -- Garante que quem não tem licença não tenha limites de criação
  update public.users set 
    max_leagues_allowed = 0, 
    max_participants_allowed = 0 
  where has_license = false and (max_leagues_allowed > 0 or max_participants_allowed > 0);
end $$;

-- Notifica o PostgREST para recarregar o schema cache imediatamente
notify pgrst, 'reload schema';

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
  created_at timestamp with time zone default now(),
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
alter table public.admins enable row level security;

drop policy if exists "Admins are viewable by themselves" on admins;
create policy "Admins are viewable by themselves" on admins for select using (email = auth.jwt() ->> 'email');

-- =========================================================================
-- Helper functions (SECURITY DEFINER) para quebrar ciclos de recursão RLS.
-- Rodam como owner do banco (bypassa RLS), retornando apenas boolean.
-- =========================================================================

-- Verifica se o uid é membro de uma liga específica
create or replace function public.is_member_of(_league_id uuid, _user_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from league_members
    where league_id = _league_id and user_id = _user_id
  );
$$;

-- Retorna todos os league_ids de um usuário (para JOINs seguros)
create or replace function public.get_my_league_ids(_user_id uuid)
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select league_id from league_members where user_id = _user_id;
$$;

-- Verifica se dois usuários compartilham pelo menos uma liga
create or replace function public.shares_league_with(_uid uuid, _other_uid uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from league_members lm1
    join league_members lm2 on lm1.league_id = lm2.league_id
    where lm1.user_id = _uid and lm2.user_id = _other_uid
  );
$$;

-- Verifica se um email pertence à tabela de administradores
create or replace function public.is_admin(_email text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from admins where email = _email
  );
$$;

-- =========================================================================
-- Políticas de Usuários
-- =========================================================================
drop policy if exists "Users can view own profile" on users;
create policy "Users can view own profile" on users for select using (auth.uid() = id);

drop policy if exists "Users can update own profile" on users;
create policy "Users can update own profile" on users for update using (auth.uid() = id);

drop policy if exists "Users can insert own profile" on users;
create policy "Users can insert own profile" on users for insert with check (auth.uid() = id);

drop policy if exists "Co-members can see public profiles" on users;
create policy "Co-members can see public profiles" on users for select using (
  public.shares_league_with(auth.uid(), id)
);

drop policy if exists "Admins can manage all users" on users;
create policy "Admins can manage all users" on users for all using (
  public.is_admin(auth.jwt() ->> 'email')
);

-- =========================================================================
-- Políticas de Ligas
-- =========================================================================
drop policy if exists "Members can see their leagues" on leagues;
create policy "Members can see their leagues" on leagues for select using (
  public.is_member_of(id, auth.uid())
);

drop policy if exists "Owners can manage their leagues" on leagues;
create policy "Owners can manage their leagues" on leagues for all using (owner_id = auth.uid());

-- Permitir SELECT por invite_code (para join via código — usuário ainda não é membro)
drop policy if exists "Anyone can find league by invite code" on leagues;

create or replace function public.find_league_by_code(_code text)
returns table(id uuid, name text, max_participants int, members_count bigint)
language sql security definer set search_path = public as $$
  select l.id, l.name, l.max_participants,
    (select count(*) from league_members lm where lm.league_id = l.id)
  from leagues l where l.invite_code = _code limit 1;
$$;

-- =========================================================================
-- Políticas de Membros (league_members)
-- Usar helper function para evitar recursão infinita
-- =========================================================================
drop policy if exists "Members can see each other" on league_members;
create policy "Members can see each other" on league_members for select using (
  public.is_member_of(league_id, auth.uid())
);

drop policy if exists "Users can join leagues" on league_members;
create policy "Users can join leagues" on league_members for insert with check (auth.uid() = user_id);

drop policy if exists "Users can leave leagues" on league_members;
create policy "Users can leave leagues" on league_members for delete using (auth.uid() = user_id);

drop policy if exists "Owners can remove members" on league_members;
create policy "Owners can remove members" on league_members for delete using (
  exists (select 1 from leagues where id = league_members.league_id and owner_id = auth.uid())
);

-- =========================================================================
-- Políticas de Resultados (Públicos para leitura)
-- =========================================================================
drop policy if exists "Public results" on results;
create policy "Public results" on results for select using (true);

drop policy if exists "Admins can manage results" on results;
create policy "Admins can manage results" on results for all using (
  public.is_admin(auth.jwt() ->> 'email')
);

-- FIX #2: Políticas completas para predictions (faltavam — bloqueava tudo com RLS ativo)
drop policy if exists "Members can read predictions in their league" on predictions;
create policy "Members can read predictions in their league" on predictions
  for select using (
    exists (
      select 1 from league_members
      where league_id = predictions.league_id and user_id = auth.uid()
    )
  );

drop policy if exists "Users can insert own predictions" on predictions;
create policy "Users can insert own predictions" on predictions
  for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own predictions" on predictions;
create policy "Users can update own predictions" on predictions
  for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own predictions" on predictions;
create policy "Users can delete own predictions" on predictions
  for delete using (auth.uid() = user_id);

-- FIX #8: Políticas para purchases e purchase_codes (histórico e segurança do asaas)
alter table purchases enable row level security;
drop policy if exists "Users can view own purchases" on purchases;
create policy "Users can view own purchases" on purchases for select using (auth.uid() = user_id);

alter table purchase_codes enable row level security;
drop policy if exists "Users can view own purchase codes" on purchase_codes;
create policy "Users can view own purchase codes" on purchase_codes for select using (auth.uid() = used_by);

-- 7. Trigger de Proteção de Capacidade de Participantes
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

-- FIX #4: Trigger que limita o número de ligas criadas por usuário (max_leagues_allowed)
create or replace function check_league_limit()
returns trigger language plpgsql as $$
declare
  owned_count integer;
  max_leagues integer;
begin
  select count(*) into owned_count from leagues where owner_id = NEW.owner_id;
  select max_leagues_allowed into max_leagues from public.users where id = NEW.owner_id;
  if max_leagues is not null and owned_count >= max_leagues then
    raise exception 'LEAGUE_LIMIT: Você atingiu o limite de % liga(s) do seu plano.', max_leagues using errcode = 'P0002';
  end if;
  return NEW;
end;
$$;

drop trigger if exists enforce_league_limit on leagues;
create trigger enforce_league_limit
before insert on leagues
for each row execute function check_league_limit();

-- 8. Índices de Performance
create index if not exists idx_league_members_league_id on league_members(league_id);
create index if not exists idx_predictions_league_user on predictions(league_id, user_id);
create index if not exists idx_leagues_invite_code on leagues(invite_code);
create index if not exists idx_leagues_owner_id on leagues(owner_id);
