-- =============================================================================
-- FIX: Recursão infinita nas políticas RLS de league_members
-- Execute este script no Supabase SQL Editor (Dashboard > SQL Editor)
-- =============================================================================

-- 1. Criar helper functions (SECURITY DEFINER) que bypassam RLS
--    para quebrar o ciclo de recursão

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

-- Retorna todos os league_ids de um usuário
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

-- 2. Recriar TODAS as políticas que causavam recursão

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

-- Permitir que qualquer usuário logado encontre uma liga pelo código de convite
drop policy if exists "Anyone can find league by invite code" on leagues;
create policy "Anyone can find league by invite code" on leagues for select using (true);

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

-- ===== DONE =====
-- Após executar, teste criando uma liga novamente.
