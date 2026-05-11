-- Habilitar UUID
create extension if not exists "uuid-ossp";

-- Tabela de Usuários (Sincronizada com Auth)
create table users (
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

-- Tabela de Admins
create table admins (
  email text primary key,
  created_at timestamp with time zone default now()
);

-- Tabela de Ligas
create table leagues (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  owner_id uuid references users(id) not null,
  invite_code text unique not null,
  max_participants integer default 15, -- Limite de participantes do plano do dono
  created_at timestamp with time zone default now()
);

-- Tabela de Membros das Ligas (Relacionamento N:N)
create table league_members (
  league_id uuid references leagues(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  primary key (league_id, user_id)
);

-- Tabela de Resultados dos Jogos
create table results (
  match_id text primary key,
  home_score integer not null,
  away_score integer not null,
  updated_at timestamp with time zone default now()
);

-- Tabela de Palpites
create table predictions (
  id uuid default uuid_generate_v4() primary key,
  league_id uuid references leagues(id) on delete cascade,
  user_id uuid references users(id) on delete cascade,
  match_id text not null,
  home_score integer not null,
  away_score integer not null,
  updated_at timestamp with time zone default now(),
  unique(league_id, user_id, match_id)
);

-- Tabela de Compras
create table purchases (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references users(id),
  plan text not null,
  price text not null,
  code text not null,
  payment_id text,
  created_at timestamp with time zone default now()
);

-- Tabela de Códigos de Licença
create table purchase_codes (
  code text primary key,
  max_participants integer not null,
  used_by uuid references users(id),
  used_at timestamp with time zone default now(),
  plan_type text,
  status text default 'active'
);

-- Row Level Security (RLS)
alter table users enable row level security;
alter table leagues enable row level security;
alter table league_members enable row level security;
alter table predictions enable row level security;
alter table results enable row level security;

-- Políticas de RLS
create policy "Usuários podem ver seu próprio perfil" on users for select using (auth.uid() = id);
create policy "Usuários podem atualizar seu próprio perfil" on users for update using (auth.uid() = id);

create policy "Membros podem ver suas ligas" on leagues for select using (
  exists (select 1 from league_members where league_id = leagues.id and user_id = auth.uid())
);
create policy "Donos podem atualizar sua liga" on leagues for update using (owner_id = auth.uid());
create policy "Usuários autenticados podem criar ligas" on leagues for insert with check (owner_id = auth.uid());
create policy "Donos podem excluir sua liga" on leagues for delete using (owner_id = auth.uid());

create policy "Membros podem ver membros da mesma liga" on league_members for select using (
  exists (select 1 from league_members lm where lm.league_id = league_members.league_id and lm.user_id = auth.uid())
);
create policy "Usuários podem entrar em ligas" on league_members for insert with check (user_id = auth.uid());
create policy "Usuários podem sair de ligas" on league_members for delete using (user_id = auth.uid());

create policy "Todos autenticados podem ver resultados" on results for select using (auth.role() = 'authenticated');

create policy "Membros podem ver palpites da liga" on predictions for select using (
  exists (select 1 from league_members where league_id = predictions.league_id and user_id = auth.uid())
);
create policy "Usuários gerenciam próprios palpites" on predictions for all using (user_id = auth.uid());

-- =============================================================================
-- TRIGGER: Protege capacidade máxima da liga (defesa em profundidade)
-- Impede INSERT em league_members quando a liga já está cheia,
-- mesmo que a validação do cliente seja burlada.
-- =============================================================================
create or replace function check_league_capacity()
returns trigger language plpgsql as $$
declare
  current_count integer;
  max_cap integer;
begin
  select count(*) into current_count
  from league_members
  where league_id = NEW.league_id;

  select max_participants into max_cap
  from leagues
  where id = NEW.league_id;

  if max_cap is not null and current_count >= max_cap then
    raise exception 'LEAGUE_FULL: Liga atingiu o limite de % participantes.', max_cap
      using errcode = 'P0001';
  end if;

  return NEW;
end;
$$;

create trigger enforce_league_capacity
before insert on league_members
for each row execute function check_league_capacity();

-- =============================================================================
-- Índices para performance
-- =============================================================================
create index if not exists idx_league_members_league_id on league_members(league_id);
create index if not exists idx_league_members_user_id on league_members(user_id);
create index if not exists idx_predictions_league_user on predictions(league_id, user_id);
create index if not exists idx_leagues_invite_code on leagues(invite_code);
create index if not exists idx_results_match_id on results(match_id);
