-- Lightweight steward page-view log for admin analytics (Festival page_views pattern).

CREATE TABLE page_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  path TEXT NOT NULL,
  user_id INTEGER REFERENCES users (id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX idx_page_views_created_at ON page_views (created_at);
CREATE INDEX idx_page_views_path ON page_views (path);
CREATE INDEX idx_page_views_user_id ON page_views (user_id);
