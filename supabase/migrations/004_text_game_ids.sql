-- games.id が text の環境で stats_logs / teams の game_id を text に揃える
ALTER TABLE teams ALTER COLUMN game_id TYPE text USING game_id::text;
ALTER TABLE stats_logs ALTER COLUMN game_id TYPE text USING game_id::text;
