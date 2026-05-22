-- 登録チーム（マイチーム）— アカウント単位で端末間同期

CREATE TABLE IF NOT EXISTS user_teams (
  id           TEXT        PRIMARY KEY,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  team_name    TEXT        NOT NULL,
  color        TEXT        NOT NULL DEFAULT 'white',
  back_numbers JSONB       NOT NULL DEFAULT '[]'::jsonb,
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_teams_user_id ON user_teams(user_id);

ALTER TABLE user_teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users manage own user_teams" ON user_teams;
CREATE POLICY "users manage own user_teams" ON user_teams
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
