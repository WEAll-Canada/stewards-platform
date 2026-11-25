-- Local preview DMs between Admin and Alex (no placeholder directory people).

INSERT OR IGNORE INTO steward_threads (id, created_at, last_message_at) VALUES
  (204, '2026-11-02T10:00:00Z', '2026-11-11T09:15:00Z');

INSERT OR IGNORE INTO steward_thread_participants (thread_id, user_id) VALUES
  (204, 1),
  (204, 3);

INSERT OR IGNORE INTO steward_messages (id, thread_id, from_user_id, body, created_at) VALUES
  (2041, 204, 3, 'Hi admin — can you confirm the directory filters are live on staging?', '2026-11-02T10:05:00Z'),
  (2042, 204, 1, 'Yes — search + sector filters are up. Ping if anything looks off.', '2026-11-11T09:15:00Z');
