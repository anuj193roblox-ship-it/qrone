-- One row per Dodo payment. payment_id is the key, so a payment Dodo reports twice is applied once.
CREATE TABLE payments (
  payment_id  TEXT    PRIMARY KEY,
  account_id  INTEGER NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  from_plan   TEXT    NOT NULL,
  to_plan     TEXT    NOT NULL,
  amount      INTEGER NOT NULL,             -- smallest currency unit (cents), as Dodo reports it
  currency    TEXT    NOT NULL,
  status      TEXT    NOT NULL CHECK (status IN ('paid', 'refunded')),
  created_at  INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER)),
  refunded_at INTEGER
);
CREATE INDEX payments_by_account ON payments (account_id);
