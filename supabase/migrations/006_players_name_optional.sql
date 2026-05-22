-- 任意: players.name が無い本番 DB 用（アプリは name なしでも同期可能）
ALTER TABLE players ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
