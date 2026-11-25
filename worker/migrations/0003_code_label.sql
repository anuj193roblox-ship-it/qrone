-- An optional name for each code, shown in the dashboard (for example "Table menu").
ALTER TABLE codes ADD COLUMN label TEXT NOT NULL DEFAULT '';
