-- Sample data for local preview and staging. Safe to run more than once.
INSERT OR IGNORE INTO messages (id, name, body, created_at) VALUES
  (1, 'Sample Visitor', 'This is a sample message from the seed data.', '2026-01-01T09:00:00Z'),
  (2, 'Another Visitor', 'Seed data makes the preview work offline.', '2026-01-02T09:00:00Z');
