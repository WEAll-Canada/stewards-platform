-- Sample templates + backfill inbox metadata for email CRM parity.

INSERT OR IGNORE INTO email_templates (id, name, subject, body_html, header_variant) VALUES
  (
    1,
    'Alliance update',
    'WeAll Canada update for {{display_name}}',
    '<p>Hi {{display_name}},</p><p>Here is a short update from the alliance.</p><p><a href="{{dashboard_url}}">Open your steward dashboard</a></p><p>— WeAll Canada</p>',
    'weall_banner'
  ),
  (
    2,
    'Circle invitation',
    'You''re invited to join a circle',
    '<p>Hi {{display_name}},</p><p>We''d love you to join an upcoming circle conversation.</p><p>Reply to this email or visit your <a href="{{dashboard_url}}">dashboard</a>.</p>',
    'circle_accent'
  ),
  (
    3,
    'Event reminder',
    'Reminder: upcoming WeAll Canada event',
    '<p>Hi {{display_name}},</p><p>This is a friendly reminder about an upcoming event on the steward calendar.</p><p>See you there!</p>',
    'plain'
  );

UPDATE email_threads
SET from_addr = COALESCE((
  SELECT m.from_addr FROM email_messages m
  WHERE m.thread_id = email_threads.id AND m.direction = 'inbound'
  ORDER BY m.created_at DESC, m.id DESC LIMIT 1
), from_addr);

UPDATE email_threads
SET last_admin_name = COALESCE((
  SELECT COALESCE(p.display_name, u.email)
  FROM email_messages m
  JOIN users u ON u.id = m.admin_user_id
  LEFT JOIN profiles p ON p.user_id = u.id
  WHERE m.thread_id = email_threads.id AND m.direction = 'outbound' AND m.admin_user_id IS NOT NULL
  ORDER BY m.created_at DESC, m.id DESC LIMIT 1
), last_admin_name);
