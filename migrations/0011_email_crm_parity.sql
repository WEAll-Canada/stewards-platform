-- Festival-parity email CRM: templates, richer campaigns, inbox reply metadata.

CREATE TABLE email_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  header_variant TEXT NOT NULL DEFAULT 'weall_banner',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'))
);

CREATE INDEX idx_email_templates_name ON email_templates (name);

ALTER TABLE email_campaigns ADD COLUMN body_html TEXT NOT NULL DEFAULT '';
ALTER TABLE email_campaigns ADD COLUMN campaign_type TEXT NOT NULL DEFAULT 'marketing';
ALTER TABLE email_campaigns ADD COLUMN header_variant TEXT NOT NULL DEFAULT 'weall_banner';
ALTER TABLE email_campaigns ADD COLUMN stats_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE email_campaigns ADD COLUMN updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now'));

CREATE INDEX idx_email_campaigns_updated_at ON email_campaigns (updated_at);

ALTER TABLE email_threads ADD COLUMN from_addr TEXT NOT NULL DEFAULT '';
ALTER TABLE email_threads ADD COLUMN last_admin_name TEXT NOT NULL DEFAULT '';

CREATE INDEX idx_email_messages_admin_user_id ON email_messages (admin_user_id);
CREATE INDEX idx_email_messages_direction ON email_messages (direction);
