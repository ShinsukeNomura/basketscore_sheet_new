alter table if exists public.stats_logs
  add column if not exists responsible_player_id text,
  add column if not exists defense_team_id text,
  add column if not exists good_defense boolean not null default false;

create index if not exists idx_stats_logs_responsible_player_id
  on public.stats_logs (responsible_player_id);

create index if not exists idx_stats_logs_defense_team_id
  on public.stats_logs (defense_team_id);
