-- Editable survey options, site agreement (ToR/charter), and admin activity trail.

CREATE TABLE survey_options (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK (kind IN ('sector', 'interest')),
  label TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT ''
);

CREATE INDEX idx_survey_options_kind_active ON survey_options (kind, active);
CREATE INDEX idx_survey_options_sort ON survey_options (kind, sort_order, id);
CREATE UNIQUE INDEX idx_survey_options_kind_label ON survey_options (kind, label);

CREATE TABLE site_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT '',
  updated_by INTEGER REFERENCES users (id)
);

CREATE TABLE activity_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id INTEGER REFERENCES users (id),
  action TEXT NOT NULL,
  subject_type TEXT NOT NULL DEFAULT '',
  subject_id TEXT NOT NULL DEFAULT '',
  detail TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT ''
);

CREATE INDEX idx_activity_log_created_at ON activity_log (created_at);
CREATE INDEX idx_activity_log_actor_id ON activity_log (actor_id);
CREATE INDEX idx_activity_log_action ON activity_log (action);
