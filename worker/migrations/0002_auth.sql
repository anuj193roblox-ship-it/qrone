-- Sign-in with an emailed link, and sessions.
-- Only SHA-256 fingerprints of tokens are stored: a leaked database can't be used to sign in.

CREATE TABLE login_tokens (
  token_hash TEXT    PRIMARY KEY,
  email      TEXT    NOT NULL,
  expires_at INTEGER NOT NULL,          -- 15 minutes after creation
  used_at    INTEGER,                   -- set when the link is used; a link works once
  created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER))
);
CREATE INDEX login_tokens_by_email ON login_tokens (email, created_at);

CREATE TABLE sessions (
  id_hash    TEXT    PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,          -- 30 days after sign-in
  created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER))
);
CREATE INDEX sessions_by_account ON sessions (account_id);
