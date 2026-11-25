-- Sample page views so admin analytics isn't empty on first load.
INSERT INTO page_views (path, user_id, created_at) VALUES
  ('/stewards/dashboard', 1, '2026-11-01T12:00:00Z'),
  ('/stewards/directory', 1, '2026-11-02T12:00:00Z'),
  ('/stewards/directory', 3, '2026-11-03T12:00:00Z'),
  ('/stewards/connect', 3, '2026-11-05T12:00:00Z'),
  ('/stewards/network', 3, '2026-11-06T12:00:00Z'),
  ('/stewards/events', 1, '2026-11-07T12:00:00Z'),
  ('/stewards/circles', 3, '2026-11-08T12:00:00Z'),
  ('/stewards/messages', 1, '2026-11-09T12:00:00Z'),
  ('/stewards/faq', 3, '2026-11-10T12:00:00Z'),
  ('/stewards/directory', 1, '2026-11-11T12:00:00Z'),
  ('/stewards/dashboard', 3, '2026-11-12T12:00:00Z'),
  ('/stewards/connect', 1, '2026-11-13T10:00:00Z');
