-- Link watchdog: we regularly check that each code's destination still loads.
-- If it fails 3 checks in a row and the owner set a backup link, scans go there until it recovers.
ALTER TABLE codes ADD COLUMN backup_destination TEXT;            -- optional; same rules as destination
ALTER TABLE codes ADD COLUMN check_status TEXT;                  -- NULL = not checked yet | 'ok' | 'unknown' | 'failing'
ALTER TABLE codes ADD COLUMN check_fails INTEGER NOT NULL DEFAULT 0;  -- failed checks in a row
ALTER TABLE codes ADD COLUMN checked_at INTEGER;                 -- Unix seconds of the last check
ALTER TABLE codes ADD COLUMN failing_since INTEGER;              -- set when check_status becomes 'failing'
