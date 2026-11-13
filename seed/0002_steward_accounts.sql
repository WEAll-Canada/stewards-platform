-- Sample stewards for local preview. Password for admin@weallcanada.local is: local-admin-pass
-- Hash generated with PBKDF2-SHA256, 100000 iterations (matches src/lib/auth.ts).

INSERT OR IGNORE INTO users (id, email, password_hash, status, created_at) VALUES
  (1, 'admin@weallcanada.local', 'dsjh7/ms1PQmQz47Wqg+tQ==:A3LR7dllIwObfQTZX8rzhhz6ev7yhe5V0ChF1ULMP48=', 'active', '2026-01-01T10:00:00Z'),
  (2, 'pending@weallcanada.local', 'dsjh7/ms1PQmQz47Wqg+tQ==:A3LR7dllIwObfQTZX8rzhhz6ev7yhe5V0ChF1ULMP48=', 'applicant', '2026-01-02T10:00:00Z'),
  (3, 'alex@weallcanada.local', 'dsjh7/ms1PQmQz47Wqg+tQ==:A3LR7dllIwObfQTZX8rzhhz6ev7yhe5V0ChF1ULMP48=', 'active', '2026-01-03T10:00:00Z');

INSERT OR IGNORE INTO profiles (user_id, display_name, bio, location, partner_org, visibility, avatar_url) VALUES
  (1, 'Platform Admin', 'Local admin account for approving stewards.', 'Canada', 'WeAll Canada', 'stewards', 'preset:admin'),
  (2, 'Pending Applicant', 'Waiting for approval.', 'Toronto', '', 'stewards', ''),
  (3, 'Alex Steward', 'Sample active steward in the directory.', 'Montreal', 'Local hub', 'stewards', 'preset:alex');

UPDATE profiles SET avatar_url = 'preset:admin' WHERE user_id = 1 AND (avatar_url IS NULL OR avatar_url = '');
UPDATE profiles SET avatar_url = 'preset:alex' WHERE user_id = 3 AND (avatar_url IS NULL OR avatar_url = '');

INSERT OR IGNORE INTO preferences (user_id, allow_directory, allow_messages, email_updates) VALUES
  (1, 1, 1, 1),
  (2, 0, 0, 1),
  (3, 1, 1, 1);

INSERT OR IGNORE INTO user_roles (user_id, role_id) VALUES
  (1, 3),
  (1, 1),
  (3, 1);

INSERT OR IGNORE INTO applications (id, user_id, why, status, created_at) VALUES
  (1, 2, 'I want to help grow wellbeing economies in my city and learn with other stewards.', 'pending', '2026-01-02T10:05:00Z');
