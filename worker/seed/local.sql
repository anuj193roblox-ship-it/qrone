-- Test data for LOCAL development only (wrangler d1 execute ... --local). Never run this against the real database.
-- Hostname is "localhost" because that is what the local dev server sees.
INSERT INTO accounts (id, email, plan) VALUES (1, 'test@example.com', 'free');
INSERT INTO codes (account_id, hostname, slug, destination, expires_at, disabled) VALUES
  (1, 'localhost', 'menu',    'https://example.com/menu', NULL, 0),   -- live, never expires
  (1, 'localhost', 'trial',   'https://example.com/trial', 4102444800, 0), -- live until 2100
  (1, 'localhost', 'old',     'https://example.com/old',  1,    0),   -- expired long ago
  (1, 'localhost', 'off',     'https://example.com/off',  NULL, 1),   -- disabled after a report
  (1, 'localhost', 'bad',     'javascript:alert(1)',      NULL, 0),   -- must never be followed
  (1, 'localhost', 'loop',    'https://localhost/menu',   NULL, 0);   -- points back at us: refused
