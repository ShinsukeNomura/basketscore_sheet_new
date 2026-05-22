-- Optional scorekeeper name on games (create-game sheet)

ALTER TABLE games ADD COLUMN IF NOT EXISTS scorekeeper TEXT;
