-- OT対応: games.current_period を 1-6 に拡張
ALTER TABLE games DROP CONSTRAINT IF EXISTS games_current_period_check;
ALTER TABLE games ADD CONSTRAINT games_current_period_check CHECK (current_period BETWEEN 1 AND 6);
