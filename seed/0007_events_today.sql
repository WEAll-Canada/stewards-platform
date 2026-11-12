-- Demo event that stays "today" / ongoing in local preview (relative to seed apply time).
INSERT OR IGNORE INTO events (id, title, description, starts_at, ends_at, location, visibility, circle_id, created_by)
VALUES (
  3,
  'Stewards open office hours',
  'Drop in for questions, introductions, and circle updates.',
  strftime('%Y-%m-%dT14:00:00Z', 'now'),
  strftime('%Y-%m-%dT23:00:00Z', 'now'),
  'Online',
  'stewards',
  1,
  1
);
