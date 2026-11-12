-- Circles, connections, in-app messaging, and alliance email.

CREATE TABLE circles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  color_token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'dormant')),
  description TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX idx_circles_status ON circles (status);

CREATE TABLE circle_members (
  circle_id INTEGER NOT NULL REFERENCES circles (id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'lead')),
  joined_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  PRIMARY KEY (circle_id, user_id)
);

CREATE INDEX idx_circle_members_user_id ON circle_members (user_id);

CREATE TABLE circle_join_requests (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  circle_id INTEGER NOT NULL REFERENCES circles (id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  reviewed_at TEXT
);

CREATE INDEX idx_circle_join_requests_status ON circle_join_requests (status);
CREATE INDEX idx_circle_join_requests_circle_id ON circle_join_requests (circle_id);
CREATE INDEX idx_circle_join_requests_user_id ON circle_join_requests (user_id);

CREATE TABLE connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  to_user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  strength INTEGER NOT NULL CHECK (strength BETWEEN 1 AND 4),
  reason TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  UNIQUE (from_user_id, to_user_id)
);

CREATE INDEX idx_connections_from_user_id ON connections (from_user_id);
CREATE INDEX idx_connections_to_user_id ON connections (to_user_id);

CREATE TABLE steward_threads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  last_message_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE TABLE steward_thread_participants (
  thread_id INTEGER NOT NULL REFERENCES steward_threads (id) ON DELETE CASCADE,
  user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  PRIMARY KEY (thread_id, user_id)
);

CREATE INDEX idx_steward_thread_participants_user_id ON steward_thread_participants (user_id);

CREATE TABLE steward_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id INTEGER NOT NULL REFERENCES steward_threads (id) ON DELETE CASCADE,
  from_user_id INTEGER NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX idx_steward_messages_thread_id ON steward_messages (thread_id);
CREATE INDEX idx_steward_messages_created_at ON steward_messages (created_at);

CREATE TABLE email_threads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  subject TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  last_message_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX idx_email_threads_last_message_at ON email_threads (last_message_at);
CREATE INDEX idx_email_threads_status ON email_threads (status);

CREATE TABLE email_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  thread_id INTEGER NOT NULL REFERENCES email_threads (id) ON DELETE CASCADE,
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  from_addr TEXT NOT NULL,
  to_addrs TEXT NOT NULL,
  body_text TEXT NOT NULL,
  admin_user_id INTEGER REFERENCES users (id),
  provider_id TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX idx_email_messages_thread_id ON email_messages (thread_id);
CREATE INDEX idx_email_messages_created_at ON email_messages (created_at);

CREATE TABLE email_campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_text TEXT NOT NULL,
  segment TEXT NOT NULL DEFAULT 'all_active',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'simulated')),
  created_by INTEGER NOT NULL REFERENCES users (id),
  recipient_count INTEGER NOT NULL DEFAULT 0,
  sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX idx_email_campaigns_status ON email_campaigns (status);
CREATE INDEX idx_email_campaigns_created_by ON email_campaigns (created_by);

CREATE TABLE email_campaign_recipients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL REFERENCES email_campaigns (id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users (id),
  email TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'sent', 'simulated', 'failed')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX idx_email_campaign_recipients_campaign_id ON email_campaign_recipients (campaign_id);
