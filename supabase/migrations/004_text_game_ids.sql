-- games.id が text の環境で game_id 列を text に揃える
-- ※ RLS ポリシーが game_id に依存しているため、一度 DROP してから ALTER し、最後に再作成する
-- 本番のポリシー名:
--   games: users can manage own games
--   teams: users can manage own teams
--   players: users can manage own players
--   stats_logs: users can manage own logs

-- ── 1. ポリシー削除 ──
DROP POLICY IF EXISTS "users can manage own games" ON games;
DROP POLICY IF EXISTS "users can manage own teams" ON teams;
DROP POLICY IF EXISTS "users can manage own players" ON players;
DROP POLICY IF EXISTS "users can manage own logs" ON stats_logs;

-- ── 2. 外部キーをいったん削除 ──
ALTER TABLE teams DROP CONSTRAINT IF EXISTS teams_game_id_fkey;
ALTER TABLE stats_logs DROP CONSTRAINT IF EXISTS stats_logs_game_id_fkey;
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_game_id_fkey;

-- ── 3. 型を text に変更 ──
ALTER TABLE teams ALTER COLUMN game_id TYPE text USING game_id::text;
ALTER TABLE stats_logs ALTER COLUMN game_id TYPE text USING game_id::text;
ALTER TABLE players ALTER COLUMN game_id TYPE text USING game_id::text;

-- ── 4. 外部キーを再作成 ──
ALTER TABLE teams
  ADD CONSTRAINT teams_game_id_fkey
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;

ALTER TABLE stats_logs
  ADD CONSTRAINT stats_logs_game_id_fkey
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;

ALTER TABLE players
  ADD CONSTRAINT players_game_id_fkey
  FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE;

-- ── 5. ポリシーを再作成 ──
CREATE POLICY "users can manage own games" ON games
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users can manage own teams" ON teams
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM games g WHERE g.id = teams.game_id AND g.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM games g WHERE g.id = teams.game_id AND g.user_id = auth.uid())
  );

CREATE POLICY "users can manage own players" ON players
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM games g WHERE g.id = players.game_id AND g.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM games g WHERE g.id = players.game_id AND g.user_id = auth.uid())
  );

CREATE POLICY "users can manage own logs" ON stats_logs
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM games g WHERE g.id = stats_logs.game_id AND g.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM games g WHERE g.id = stats_logs.game_id AND g.user_id = auth.uid())
  );
