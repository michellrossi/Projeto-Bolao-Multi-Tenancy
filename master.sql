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

-- Row Level Security (RLS) - Opcional mas recomendado
alter table users enable row level security;
alter table leagues enable row level security;
alter table league_members enable row level security;
alter table predictions enable row level security;

-- Regras Básicas de RLS
create policy "Usuários podem ver seu próprio perfil" on users for select using (auth.uid() = id);
create policy "Membros podem ver suas ligas" on leagues for select using (
  exists (select 1 from league_members where league_id = leagues.id and user_id = auth.uid())
);
