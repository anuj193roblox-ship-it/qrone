-- QrOne: accounts and their dynamic QR codes.
-- Times are Unix seconds (UTC). Each migration runs once, in order; never edit one that has run.

CREATE TABLE accounts (
  id         INTEGER PRIMARY KEY,
  email      TEXT    NOT NULL UNIQUE,
  plan       TEXT    NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'plus', 'pro')),
  created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER))
);

CREATE TABLE codes (
  id          INTEGER PRIMARY KEY,
  account_id  INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  hostname    TEXT    NOT NULL,              -- the domain the printed code points at
  slug        TEXT    NOT NULL,              -- the part after the slash, e.g. "menu"
  destination TEXT    NOT NULL,              -- where a scan is sent (http/https only)
  expires_at  INTEGER,                       -- NULL means it never expires (paid plans)
  disabled    INTEGER NOT NULL DEFAULT 0 CHECK (disabled IN (0, 1)),  -- 1 = switched off after an abuse report
  created_at  INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER)),
  UNIQUE (hostname, slug)                    -- also the index every scan uses: one row read per scan
);

CREATE INDEX codes_by_account ON codes (account_id);
