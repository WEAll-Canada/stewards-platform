-- Sample table: messages left by site visitors.
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

-- Messages are listed newest first; index the sort column so reads stay cheap.
CREATE INDEX idx_messages_created_at ON messages (created_at);
