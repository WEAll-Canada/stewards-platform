INSERT OR IGNORE INTO events (id, title, description, starts_at, ends_at, location, visibility, circle_id, created_by) VALUES
  (1, 'Stewards welcome call', 'An open call for new and returning stewards.', '2026-12-01T17:00:00Z', '2026-12-01T18:00:00Z', 'Online', 'stewards', 1, 1),
  (2, 'Policy circle working session', 'Draft updates and next actions.', '2026-12-08T16:00:00Z', '2026-12-08T17:30:00Z', 'Online', 'circle', 3, 1);

INSERT OR IGNORE INTO faqs (id, question, answer, sort_order) VALUES
  (1, 'How do I become a steward?', 'Apply on the Stewards Platform. An admin reviews and approves applications.', 1),
  (2, 'What are circles?', 'Circles are sociocratic working groups such as Policy and Knowledge Building. Request to join from the Circles page.', 2),
  (3, 'Who can use alliance email?', 'Platform admins and circle leads can work the shared inbox and (admins) send campaigns.', 3),
  (100, 'Can partners join a circle without becoming stewards first?', '', 50);
