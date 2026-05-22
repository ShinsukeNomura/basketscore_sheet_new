-- Cloud sync: columns and constraints used by the app

ALTER TABLE games ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_games_user_id ON games(user_id);

ALTER TABLE teams ADD COLUMN IF NOT EXISTS color TEXT NOT NULL DEFAULT 'white';

ALTER TABLE players ADD COLUMN IF NOT EXISTS game_id UUID REFERENCES games(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_players_game_id ON players(game_id);

ALTER TABLE stats_logs ADD COLUMN IF NOT EXISTS link_id UUID;
ALTER TABLE stats_logs DROP CONSTRAINT IF EXISTS stats_logs_period_check;
ALTER TABLE stats_logs ADD CONSTRAINT stats_logs_period_check CHECK (period BETWEEN 1 AND 6);
