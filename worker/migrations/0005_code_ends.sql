-- An end time the owner chooses for a code (Unix seconds, NULL = no end time).
-- Kept apart from expires_at, which the plan controls (free codes, refunds) and an upgrade clears:
-- an upgrade must never wipe an end date the owner set on purpose.
ALTER TABLE codes ADD COLUMN ends_at INTEGER;
