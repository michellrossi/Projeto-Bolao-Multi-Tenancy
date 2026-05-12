-- =============================================================================
-- FIX COMPLETO: Colunas faltantes + Recursão infinita nas políticas RLS
-- Execute este script INTEIRO no Supabase SQL Editor (Dashboard > SQL Editor)
-- =============================================================================

-- =============================================
-- PARTE 1: Adicionar colunas que faltam
-- =============================================

-- Tabela USERS — adiciona colunas de licença/plano se não existirem
do $$ 
begin 
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='approved') then
    alter table public.users add column approved boolean default false;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='has_license') then
    alter table public.users add column has_license boolean default false;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='max_participants_allowed') then
    alter table public.users add column max_participants_allowed integer default 15;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='max_leagues_allowed') then
    alter table public.users add column max_leagues_allowed integer default 1;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='users' and column_name='plan_type') then
    alter table public.users add column plan_type text;
  end if;
end $$;

-- Tabela LEAGUES — adiciona max_participants se não existir
do $$ 
begin 
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='leagues' and column_name='max_participants') then
    alter table public.leagues add column max_participants integer default 15;
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='leagues' and column_name='custom_logo') then
    alter table public.leagues add column custom_logo text;
  end if;
end $$;

-- Notifica o PostgREST para recarregar o schema cache imediatamente
notify pgrst, 'reload schema';

-- =============================================
-- PARTE 2: Helper functions (SECURITY DEFINER)
-- Quebram o ciclo de recursão infinita no RLS
-- =============================================

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

create or replace function public.get_my_league_ids(_user_id uuid)
returns setof uuid
language sql
security definer
stable
set search_path = public
as $$
  select league_id from league_members where user_id = _user_id;
$$;

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

-- =============================================
-- PARTE 3: Recriar políticas RLS sem recursão
-- =============================================

-- ===== USERS =====
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

-- ===== LEAGUES =====
drop policy if exists "Members can see their leagues" on leagues;
create policy "Members can see their leagues" on leagues for select using (
  public.is_member_of(id, auth.uid())
);

drop policy if exists "Owners can manage their leagues" on leagues;
create policy "Owners can manage their leagues" on leagues for all using (owner_id = auth.uid());

drop policy if exists "Anyone can find league by invite code" on leagues;

-- Alternativa mais simples e segura (recomendada):
-- Fazer o lookup por invite_code via função SECURITY DEFINER
-- que não respeita RLS, evitando expor dados desnecessários.
create or replace function public.find_league_by_code(_code text)
returns table(id uuid, name text, max_participants int, members_count bigint)
language sql security definer set search_path = public as $$
  select l.id, l.name, l.max_participants,
    (select count(*) from league_members lm where lm.league_id = l.id)
  from leagues l where l.invite_code = _code limit 1;
$$;

-- ===== LEAGUE_MEMBERS =====
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

-- ===== RESULTS =====
drop policy if exists "Public results" on results;
create policy "Public results" on results for select using (true);

-- =============================================
-- PARTE 4: Recarregar cache do PostgREST
-- (garante que as novas colunas apareçam na API)
-- =============================================
notify pgrst, 'reload schema';
