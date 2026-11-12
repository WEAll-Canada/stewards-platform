-- Give the staging/operator test account circle membership + RSVP so dashboard tiles are exercisable.
-- Memberships are keyed by email so this works whether the user was seeded or applied on staging.

INSERT OR IGNORE INTO circle_members (circle_id, user_id, role)
SELECT 1, u.id, 'member'
FROM users u
WHERE lower(u.email) = 'naryan@gmail.com';

INSERT OR IGNORE INTO circle_members (circle_id, user_id, role)
SELECT 2, u.id, 'member'
FROM users u
WHERE lower(u.email) = 'naryan@gmail.com';

INSERT OR IGNORE INTO event_rsvps (event_id, user_id, status)
SELECT 1, u.id, 'going'
FROM users u
WHERE lower(u.email) = 'naryan@gmail.com';
