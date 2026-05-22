-- 本番で games.id が text の場合、関連 ID 列も text に揃える（任意・エラー時のみ実行）
-- ポリシーは 004 実行済み前提。未実行の場合は 004 を先に実行すること。

DROP POLICY IF EXISTS "users can manage own games" ON games;
DROP POLICY IF EXISTS "users can manage own teams" ON teams;
DROP POLICY IF EXISTS "users can manage own players" ON players;
DROP POLICY IF EXISTS "users can manage own logs" ON stats_logs;

ALTER TABLE stats_logs DROP CONSTRAINT IF EXISTS stats_logs_team_id_fkey;
ALTER TABLE stats_logs DROP CONSTRAINT IF EXISTS stats_logs_player_id_fkey;
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_team_id_fkey;

ALTER TABLE teams ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE players ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE players ALTER COLUMN team_id TYPE text USING team_id::text;
ALTER TABLE stats_logs ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE stats_logs ALTER COLUMN team_id TYPE text USING team_id::text;
ALTER TABLE stats_logs ALTER COLUMN player_id TYPE text USING player_id::text;

ALTER TABLE stats_logs
  ADD CONSTRAINT stats_logs_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

ALTER TABLE stats_logs
  ADD CONSTRAINT stats_logs_player_id_fkey
  FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE SET NULL;

ALTER TABLE players
  ADD CONSTRAINT players_team_id_fkey
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE;

CREATE POLICY "users can manage own games" ON games
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can manage own teams" ON teams
  FOR ALL
  USING (EXISTS (SELECT 1 FROM games g WHERE g.id = teams.game_id AND g.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM games g WHERE g.id = teams.game_id AND g.user_id = auth.uid()));

CREATE POLICY "users can manage own players" ON players
  FOR ALL
  USING (EXISTS (SELECT 1 FROM games g WHERE g.id = players.game_id AND g.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM games g WHERE g.id = players.game_id AND g.user_id = auth.uid()));

CREATE POLICY "users can manage own logs" ON stats_logs
  FOR ALL
  USING (EXISTS (SELECT 1 FROM games g WHERE g.id = stats_logs.game_id AND g.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM games g WHERE g.id = stats_logs.game_id AND g.user_id = auth.uid()));
