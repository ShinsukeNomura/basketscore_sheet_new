-- players.game_id が未設定の行でも、所属チーム経由で読み取れるようにする（別端末同期の不具合対策）

DROP POLICY IF EXISTS "users can manage own players" ON players;

CREATE POLICY "users can manage own players" ON players
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM teams t
      JOIN games g ON g.id = t.game_id
      WHERE t.id = players.team_id AND g.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM games g
      WHERE g.id = players.game_id AND g.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM teams t
      JOIN games g ON g.id = t.game_id
      WHERE t.id = players.team_id AND g.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM games g
      WHERE g.id = players.game_id AND g.user_id = auth.uid()
    )
  );

-- 既存データ: game_id 未設定の選手行をチームから補完
UPDATE players p
SET game_id = t.game_id
FROM teams t
WHERE p.team_id = t.id AND (p.game_id IS NULL);
