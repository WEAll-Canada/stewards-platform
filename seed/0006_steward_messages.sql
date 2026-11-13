-- Local preview DMs (mirrors migration 0007 + 0010 cleanup). Safe if migration already inserted the same ids/emails.
-- Pairwise threads only — each conversation shows one other person.

INSERT OR IGNORE INTO users (id, email, password_hash, status, created_at) VALUES
  (901, 'kai@weallcanada.local', 'dsjh7/ms1PQmQz47Wqg+tQ==:A3LR7dllIwObfQTZX8rzhhz6ev7yhe5V0ChF1ULMP48=', 'active', '2026-01-03T10:00:00Z'),
  (902, 'jordan@weallcanada.local', 'dsjh7/ms1PQmQz47Wqg+tQ==:A3LR7dllIwObfQTZX8rzhhz6ev7yhe5V0ChF1ULMP48=', 'active', '2026-01-04T10:00:00Z'),
  (903, 'priya@weallcanada.local', 'dsjh7/ms1PQmQz47Wqg+tQ==:A3LR7dllIwObfQTZX8rzhhz6ev7yhe5V0ChF1ULMP48=', 'active', '2026-01-05T10:00:00Z');

INSERT OR IGNORE INTO profiles (user_id, display_name, bio, location, partner_org, visibility, avatar_url) VALUES
  (901, 'Kai Chen', 'Directory steward — community economics.', 'Toronto', 'Local hub', 'stewards', 'preset:kai'),
  (902, 'Jordan Lee', 'Knowledge Building circle — learning journeys.', 'Vancouver', 'Knowledge hub', 'stewards', 'preset:jordan'),
  (903, 'Priya Nair', 'Policy circle — wellbeing economy framing.', 'Ottawa', 'Policy network', 'stewards', 'preset:priya');

UPDATE profiles SET avatar_url = 'preset:kai' WHERE user_id = 901 AND (avatar_url IS NULL OR avatar_url = '');
UPDATE profiles SET avatar_url = 'preset:jordan' WHERE user_id = 902 AND (avatar_url IS NULL OR avatar_url = '');
UPDATE profiles SET avatar_url = 'preset:priya' WHERE user_id = 903 AND (avatar_url IS NULL OR avatar_url = '');

INSERT OR IGNORE INTO preferences (user_id, allow_directory, allow_messages, email_updates) VALUES
  (901, 1, 1, 1),
  (902, 1, 1, 1),
  (903, 1, 1, 1);

INSERT OR IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.name = 'steward'
WHERE u.id IN (901, 902, 903);

INSERT OR IGNORE INTO circle_members (circle_id, user_id, role) VALUES
  (2, 902, 'member'),
  (3, 903, 'member');

INSERT OR IGNORE INTO steward_threads (id, created_at, last_message_at) VALUES
  (201, '2026-11-01T14:00:00Z', '2026-11-10T16:30:00Z'),
  (202, '2026-11-05T09:00:00Z', '2026-11-12T11:05:00Z'),
  (203, '2026-11-08T18:00:00Z', '2026-11-12T18:20:00Z'),
  (204, '2026-11-02T10:00:00Z', '2026-11-11T09:15:00Z');

INSERT OR IGNORE INTO steward_thread_participants (thread_id, user_id)
SELECT 201, u.id FROM users u WHERE lower(u.email) = 'naryan@gmail.com';
INSERT OR IGNORE INTO steward_thread_participants (thread_id, user_id) VALUES (201, 901);

INSERT OR IGNORE INTO steward_thread_participants (thread_id, user_id)
SELECT 202, u.id FROM users u WHERE lower(u.email) = 'naryan@gmail.com';
INSERT OR IGNORE INTO steward_thread_participants (thread_id, user_id) VALUES (202, 902);

INSERT OR IGNORE INTO steward_thread_participants (thread_id, user_id)
SELECT 203, u.id FROM users u WHERE lower(u.email) = 'naryan@gmail.com';
INSERT OR IGNORE INTO steward_thread_participants (thread_id, user_id) VALUES (203, 903);

-- Local admin 1:1 with Kai (so Messages is populated without naryan).
INSERT OR IGNORE INTO steward_thread_participants (thread_id, user_id) VALUES
  (204, 1),
  (204, 901);

INSERT OR IGNORE INTO steward_messages (id, thread_id, from_user_id, body, created_at) VALUES
  (2011, 201, 901, 'Hi — saw you in the directory. Are you free to compare notes on community economics?', '2026-11-01T14:05:00Z');

INSERT OR IGNORE INTO steward_messages (id, thread_id, from_user_id, body, created_at)
SELECT 2012, 201, u.id, 'Absolutely. Happy to share what we''re trying locally.', '2026-11-01T15:10:00Z'
FROM users u WHERE lower(u.email) = 'naryan@gmail.com';

INSERT OR IGNORE INTO steward_messages (id, thread_id, from_user_id, body, created_at)
SELECT 2013, 201, u.id, 'Great — I''ll send a short brief after the Central Circle sync.', '2026-11-10T16:30:00Z'
FROM users u WHERE lower(u.email) = 'naryan@gmail.com';

INSERT OR IGNORE INTO steward_messages (id, thread_id, from_user_id, body, created_at) VALUES
  (2021, 202, 902, 'Welcome! Knowledge Building is hosting a learning circle next week — want the agenda draft?', '2026-11-05T09:10:00Z');

INSERT OR IGNORE INTO steward_messages (id, thread_id, from_user_id, body, created_at)
SELECT 2022, 202, u.id, 'Yes please — especially anything on measurement & goals.', '2026-11-05T12:00:00Z'
FROM users u WHERE lower(u.email) = 'naryan@gmail.com';

INSERT OR IGNORE INTO steward_messages (id, thread_id, from_user_id, body, created_at) VALUES
  (2023, 202, 902, 'Attached in spirit: draft agenda + two readings. Ping me if you want a 15-min walkthrough.', '2026-11-12T11:05:00Z');

INSERT OR IGNORE INTO steward_messages (id, thread_id, from_user_id, body, created_at) VALUES
  (2031, 203, 903, 'Quick note from Policy: we''re collecting examples of wellbeing framing in municipal plans.', '2026-11-08T18:10:00Z');

INSERT OR IGNORE INTO steward_messages (id, thread_id, from_user_id, body, created_at)
SELECT 2032, 203, u.id, 'I can share a couple of Toronto-area references.', '2026-11-09T10:00:00Z'
FROM users u WHERE lower(u.email) = 'naryan@gmail.com';

INSERT OR IGNORE INTO steward_messages (id, thread_id, from_user_id, body, created_at) VALUES
  (2033, 203, 903, 'Perfect — drop them whenever. Also free Thursday if you want to jam on the brief.', '2026-11-12T18:20:00Z'),
  (2041, 204, 901, 'Hi admin — can you confirm the directory filters are live on staging?', '2026-11-02T10:05:00Z'),
  (2042, 204, 1, 'Yes — search + sector filters are up. Ping if anything looks off.', '2026-11-11T09:15:00Z');
