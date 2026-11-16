-- Sample Knowledge Commons items, circle resources/decisions, and a maybe RSVP.

INSERT OR IGNORE INTO knowledge_items (id, title, summary, url, body_text, tags, created_by, created_at) VALUES
  (
    1,
    'Wellbeing Economy primer',
    'A short overview of wellbeing economy ideas for new stewards.',
    'https://weall.org/',
    'Start here if you are new to wellbeing economies. Share with applicants who ask what WEAll is about.',
    'onboarding|wellbeing',
    1,
    '2026-02-01T12:00:00Z'
  ),
  (
    2,
    'Circle meeting template',
    'Agenda and roles template for circle gatherings.',
    '',
    '1. Check-in
2. Purpose reminder
3. Updates
4. Decisions
5. Closing

Rotate facilitator and note-taker.',
    'circles|meetings',
    1,
    '2026-02-05T12:00:00Z'
  ),
  (
    3,
    'Festivals as learning labs',
    'Notes from Re-imagining the Economy festival patterns that transfer to steward work.',
    'https://reimaginefestival.ca',
    'Directory, connections, and harvest-style knowledge sharing are useful patterns for ongoing stewardship.',
    'learning|festival',
    3,
    '2026-02-10T12:00:00Z'
  );

INSERT OR IGNORE INTO circle_resources (id, circle_id, title, url, note, created_by, created_at) VALUES
  (
    1,
    1,
    'Central Circle charter draft',
    'https://weall.org/',
    'Working draft for how Central Circle holds alliance-wide purpose.',
    1,
    '2026-02-02T12:00:00Z'
  ),
  (
    2,
    2,
    'Knowledge Building reading list',
    '',
    'Collect shared readings here as the circle grows. Add links when you find good sources.',
    1,
    '2026-02-03T12:00:00Z'
  );

INSERT OR IGNORE INTO circle_decisions (id, circle_id, title, detail, decided_at, created_by, created_at) VALUES
  (
    1,
    1,
    'Open circle join requests to all active stewards',
    'Anyone can request; admins approve. Review after the first twenty stewards join.',
    '2026-01-15T15:00:00Z',
    1,
    '2026-01-15T15:00:00Z'
  ),
  (
    2,
    2,
    'Keep resources link-first until file storage is ready',
    'Prefer URLs and short notes over large file uploads for the prototype.',
    '2026-02-04T16:00:00Z',
    1,
    '2026-02-04T16:00:00Z'
  );

INSERT INTO event_rsvps (event_id, user_id, status)
VALUES (1, 1, 'going')
ON CONFLICT(event_id, user_id) DO UPDATE SET status = excluded.status;

INSERT INTO event_rsvps (event_id, user_id, status)
SELECT 1, u.id, 'maybe'
FROM users u
WHERE lower(u.email) = 'alex@weallcanada.local'
ON CONFLICT(event_id, user_id) DO UPDATE SET status = excluded.status;
