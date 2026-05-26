-- AI分析レポートをクラウドに保存するテーブル
-- キーはチーム名・選手名・ゲームIDベースの文字列
CREATE TABLE IF NOT EXISTS ai_reports (
  user_id    UUID REFERENCES auth.users NOT NULL,
  report_key TEXT NOT NULL,
  report     TEXT NOT NULL,
  cached_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, report_key)
);

ALTER TABLE ai_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own ai_reports"
  ON ai_reports FOR ALL
  TO authenticated
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
