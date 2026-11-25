-- Official circle-to-circle link roles (sociocracy double-linking).
-- A person who belongs to both circles can be named as the bridge between them.
-- circle_a_id is always the smaller id so each pair is stored once.

CREATE TABLE circle_links (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  circle_a_id INTEGER NOT NULL REFERENCES circles (id) ON DELETE CASCADE,
  circle_b_id INTEGER NOT NULL REFERENCES circles (id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'rejected')),
  nominated_by INTEGER NOT NULL REFERENCES users (id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  reviewed_at TEXT,
  reviewed_by INTEGER REFERENCES users (id),
  CHECK (circle_a_id < circle_b_id),
  UNIQUE (user_id, circle_a_id, circle_b_id)
);

CREATE INDEX idx_circle_links_user_id ON circle_links (user_id);
CREATE INDEX idx_circle_links_circle_a_id ON circle_links (circle_a_id);
CREATE INDEX idx_circle_links_circle_b_id ON circle_links (circle_b_id);
CREATE INDEX idx_circle_links_status ON circle_links (status);
