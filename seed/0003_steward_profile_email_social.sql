INSERT OR IGNORE INTO circles (id, slug, name, color_token, status, description) VALUES
  (1, 'central', 'Central Circle', 'central', 'active', 'Coordination hub for WeAll Canada.'),
  (2, 'knowledge-building', 'Knowledge Building', 'knowledge', 'active', 'Learning and shared sense-making.'),
  (3, 'policy', 'Policy', 'policy', 'active', 'Policy work and public systems.'),
  (4, 'liberating-tools', 'Liberating Tools', 'liberating', 'active', 'Practical tools and methods.'),
  (5, 'grassroots', 'Grassroots', 'grassroots', 'dormant', 'Dormant — not a primary join target.');

INSERT OR IGNORE INTO circle_members (circle_id, user_id, role) VALUES
  (1, 1, 'lead'),
  (1, 3, 'member'),
  (2, 3, 'member'),
  (3, 1, 'member');

INSERT OR IGNORE INTO connections (id, from_user_id, to_user_id, strength, reason) VALUES
  (1, 3, 1, 3, 'learning');

INSERT OR IGNORE INTO email_threads (id, subject, status, last_message_at, created_at) VALUES
  (1, 'Hello from a community partner', 'open', '2026-02-01T15:00:00Z', '2026-02-01T14:00:00Z');

INSERT OR IGNORE INTO email_messages (id, thread_id, direction, from_addr, to_addrs, body_text, admin_user_id, created_at) VALUES
  (1, 1, 'inbound', 'partner@example.org', 'hello@weallcanada.com', 'Hi WeAll Canada — we would love to collaborate on a spring workshop.', NULL, '2026-02-01T14:00:00Z'),
  (2, 1, 'outbound', 'hello@weallcanada.com', 'partner@example.org', 'Thanks for reaching out! An admin will follow up with next steps.', 1, '2026-02-01T15:00:00Z');
