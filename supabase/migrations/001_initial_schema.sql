-- ============================================================
-- Basketball Score Stats App — Initial Schema
-- ============================================================

-- 試合メタデータ
CREATE TABLE games (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  game_name      TEXT        NOT NULL,
  date           DATE        NOT NULL DEFAULT CURRENT_DATE,
  status         TEXT        NOT NULL DEFAULT 'progress'
                             CHECK (status IN ('progress', 'finished')),
  current_period INTEGER     NOT NULL DEFAULT 1
                             CHECK (current_period BETWEEN 1 AND 4),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- チーム情報
CREATE TABLE teams (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id    UUID        NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  team_name  TEXT        NOT NULL,
  is_ours    BOOLEAN     NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 選手
CREATE TABLE players (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id      UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  back_number  TEXT        NOT NULL,
  name         TEXT        NOT NULL DEFAULT '',
  is_on_court  BOOLEAN     NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- スタッツ履歴
CREATE TABLE stats_logs (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id     UUID        NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  team_id     UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  player_id   UUID        REFERENCES players(id) ON DELETE SET NULL,
  period      INTEGER     NOT NULL CHECK (period BETWEEN 1 AND 4),
  timestamp   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  action_type TEXT        NOT NULL CHECK (action_type IN (
                '2PT_MADE','2PT_MISS',
                '3PT_MADE','3PT_MISS',
                'FT_MADE', 'FT_MISS',
                'ORBD','DRBD','AST','STL','BLK','TOV','FOUL'
              )),
  points      INTEGER     NOT NULL DEFAULT 0,
  is_deleted  BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- インデックス（高頻度クエリの最適化）
-- ============================================================
CREATE INDEX idx_teams_game_id        ON teams(game_id);
CREATE INDEX idx_players_team_id      ON players(team_id);
CREATE INDEX idx_stats_logs_game_id   ON stats_logs(game_id);
CREATE INDEX idx_stats_logs_player_id ON stats_logs(player_id);
CREATE INDEX idx_stats_logs_timestamp ON stats_logs(timestamp DESC);

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
ALTER TABLE games      ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams      ENABLE ROW LEVEL SECURITY;
ALTER TABLE players    ENABLE ROW LEVEL SECURITY;
ALTER TABLE stats_logs ENABLE ROW LEVEL SECURITY;

-- 開発用: 全公開ポリシー（本番時は認証ベースに変更）
CREATE POLICY "Allow all on games"      ON games      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on teams"      ON teams      FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on players"    ON players    FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on stats_logs" ON stats_logs FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- Realtime (スコアのリアルタイム同期用)
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE stats_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE games;
