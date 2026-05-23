-- 試合データのクラウド転送（アカウント間）

CREATE TABLE IF NOT EXISTS game_transfers (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id   UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  to_email       TEXT        NOT NULL,
  from_email     TEXT,
  source_game_id TEXT        NOT NULL,
  game_name      TEXT        NOT NULL,
  payload        JSONB       NOT NULL,
  status         TEXT        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at     TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  CONSTRAINT game_transfers_no_self CHECK (from_user_id <> to_user_id)
);

CREATE INDEX IF NOT EXISTS idx_game_transfers_to_pending
  ON game_transfers (to_user_id, created_at DESC)
  WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_game_transfers_from
  ON game_transfers (from_user_id, created_at DESC);

ALTER TABLE game_transfers ENABLE ROW LEVEL SECURITY;

-- 読み取りのみ（更新は API / service_role）
CREATE POLICY "users read own transfers" ON game_transfers
  FOR SELECT USING (auth.uid() = to_user_id OR auth.uid() = from_user_id);
