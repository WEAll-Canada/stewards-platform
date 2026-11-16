-- Knowledge Commons (link + notes for now; binary files need R2 later).
CREATE TABLE knowledge_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  url TEXT NOT NULL DEFAULT '',
  body_text TEXT NOT NULL DEFAULT '',
  tags TEXT NOT NULL DEFAULT '',
  created_by INTEGER NOT NULL REFERENCES users (id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX idx_knowledge_items_created_at ON knowledge_items (created_at);
CREATE INDEX idx_knowledge_items_created_by ON knowledge_items (created_by);

-- Circle shared resources and decision log.
CREATE TABLE circle_resources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  circle_id INTEGER NOT NULL REFERENCES circles (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  created_by INTEGER NOT NULL REFERENCES users (id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX idx_circle_resources_circle_id ON circle_resources (circle_id);
CREATE INDEX idx_circle_resources_created_at ON circle_resources (created_at);

CREATE TABLE circle_decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  circle_id INTEGER NOT NULL REFERENCES circles (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  decided_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  created_by INTEGER NOT NULL REFERENCES users (id),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX idx_circle_decisions_circle_id ON circle_decisions (circle_id);
CREATE INDEX idx_circle_decisions_decided_at ON circle_decisions (decided_at);

-- Expand RSVP statuses with "maybe" (SQLite cannot alter CHECK in place).
CREATE TABLE event_rsvps_new (
  event_id INTEGER NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'going' CHECK (status IN ('going', 'interested', 'maybe', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  PRIMARY KEY (event_id, user_id)
);

INSERT INTO event_rsvps_new (event_id, user_id, status, created_at)
SELECT event_id, user_id, status, created_at FROM event_rsvps;

DROP TABLE event_rsvps;
ALTER TABLE event_rsvps_new RENAME TO event_rsvps;
CREATE INDEX idx_event_rsvps_user_id ON event_rsvps (user_id);
CREATE INDEX idx_event_rsvps_event_status ON event_rsvps (event_id, status);
