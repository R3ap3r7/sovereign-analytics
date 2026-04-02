create table if not exists users (
  id text primary key,
  role text not null,
  status text not null,
  email text not null unique,
  password text not null,
  display_name text not null,
  avatar_seed text not null,
  experience_level text not null,
  risk_profile text not null,
  analysis_focus text not null,
  default_account_currency text not null,
  favorite_currencies text[] not null default '{}',
  favorite_pairs text[] not null default '{}',
  dashboard_preset text not null,
  settings jsonb not null,
  onboarding_completed boolean not null default false,
  verified boolean not null default false,
  locked boolean not null default false
);

create table if not exists user_sessions (
  token text primary key,
  user_id text not null references users(id) on delete cascade,
  expires_at timestamptz not null,
  intended_path text,
  mock_2fa_required boolean not null default false
);

create table if not exists user_visits (
  user_id text primary key references users(id) on delete cascade,
  pairs text[] not null default '{}',
  currencies text[] not null default '{}',
  events text[] not null default '{}'
);

create table if not exists admin_state (
  singleton boolean primary key default true check (singleton),
  mutation jsonb not null
);

create table if not exists currencies (
  code text primary key,
  payload jsonb not null
);

create table if not exists pairs (
  id text primary key,
  payload jsonb not null
);

create table if not exists events (
  id text primary key,
  payload jsonb not null
);

create table if not exists news (
  id text primary key,
  payload jsonb not null
);

create table if not exists forecasts (
  id text primary key,
  pair_id text not null,
  payload jsonb not null
);

create table if not exists strategies (
  id text primary key,
  payload jsonb not null
);

create table if not exists scenarios (
  id text primary key,
  payload jsonb not null
);

create table if not exists portfolios (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  payload jsonb not null
);

create table if not exists simulations (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  pair_id text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  payload jsonb not null
);

create table if not exists positions (
  id text primary key,
  pair_id text not null,
  status text not null,
  payload jsonb not null
);

create table if not exists orders (
  id text primary key,
  pair_id text not null,
  action text not null,
  payload jsonb not null
);

create table if not exists journals (
  id text primary key,
  pair_id text,
  created_at timestamptz not null,
  payload jsonb not null
);

create table if not exists watchlist (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  created_at timestamptz not null,
  priority text not null,
  payload jsonb not null
);

create table if not exists alerts (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  entity_type text not null,
  entity_id text not null,
  status text not null,
  created_at timestamptz not null,
  payload jsonb not null
);

create table if not exists notes (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  pinned boolean not null default false,
  updated_at timestamptz not null,
  payload jsonb not null
);

create table if not exists pair_daily_rates (
  pair_id text not null references pairs(id) on delete cascade,
  traded_on date not null,
  close_rate numeric(18,8) not null,
  primary key (pair_id, traded_on)
);

create index if not exists idx_simulations_user_id on simulations(user_id);
create index if not exists idx_watchlist_user_id on watchlist(user_id);
create index if not exists idx_alerts_user_id on alerts(user_id);
create index if not exists idx_notes_user_id on notes(user_id);
create index if not exists idx_pair_daily_rates_pair on pair_daily_rates(pair_id, traded_on desc);
