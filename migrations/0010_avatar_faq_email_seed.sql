-- Avatar thumbs already use profiles.avatar_url.
-- Clean 3-party DM threads, seed avatars + richer alliance email threads + open FAQ asks.
-- Only reference users that migrations create (901–903, naryan). Local admin (id 1) is seed-only.

-- Keep DM threads pairwise: remove Platform Admin from naryan's sample conversations when present.
DELETE FROM steward_thread_participants
WHERE thread_id IN (201, 202, 203) AND user_id = 1;

-- Prefer naryan's authorship on replies that were seeded as admin locally.
UPDATE steward_messages
SET from_user_id = (SELECT id FROM users WHERE lower(email) = 'naryan@gmail.com' LIMIT 1)
WHERE id IN (2012, 2013, 2022, 2032)
  AND from_user_id = 1
  AND EXISTS (SELECT 1 FROM users WHERE lower(email) = 'naryan@gmail.com');

-- Compact preset keys (resolved in app to ~96px SVG thumbs).
UPDATE profiles SET avatar_url = 'preset:kai' WHERE user_id = 901 AND (avatar_url IS NULL OR avatar_url = '');
UPDATE profiles SET avatar_url = 'preset:jordan' WHERE user_id = 902 AND (avatar_url IS NULL OR avatar_url = '');
UPDATE profiles SET avatar_url = 'preset:priya' WHERE user_id = 903 AND (avatar_url IS NULL OR avatar_url = '');
UPDATE profiles SET avatar_url = 'preset:naryan'
WHERE user_id = (SELECT id FROM users WHERE lower(email) = 'naryan@gmail.com' LIMIT 1)
  AND (avatar_url IS NULL OR avatar_url = '');
UPDATE profiles SET avatar_url = 'preset:admin'
WHERE user_id IN (SELECT id FROM users WHERE id = 1) AND (avatar_url IS NULL OR avatar_url = '');
UPDATE profiles SET avatar_url = 'preset:alex'
WHERE user_id IN (SELECT id FROM users WHERE id = 3) AND (avatar_url IS NULL OR avatar_url = '');

-- Richer alliance email threads (multi-turn conversations).
INSERT OR IGNORE INTO email_threads (id, subject, status, last_message_at, created_at) VALUES
  (2, 'Workshop follow-up — room capacity', 'open', '2026-02-08T16:40:00Z', '2026-02-06T11:00:00Z'),
  (3, 'Media request: wellbeing economy explainer', 'open', '2026-02-10T09:20:00Z', '2026-02-09T14:30:00Z'),
  (4, 'Volunteer offer from Halifax', 'closed', '2026-01-28T13:00:00Z', '2026-01-27T09:00:00Z');

INSERT OR IGNORE INTO email_messages (id, thread_id, direction, from_addr, to_addrs, body_text, admin_user_id, created_at) VALUES
  (3, 2, 'inbound', 'events@communityhub.example', 'hello@weallcanada.com',
   'Thanks for the call yesterday. Can your team host 40 people on March 12, or should we cap at 25?', NULL, '2026-02-06T11:00:00Z'),
  (4, 2, 'outbound', 'hello@weallcanada.com', 'events@communityhub.example',
   'We can do 40 if we use the side room for breakouts. I will confirm AV by Friday.', NULL, '2026-02-06T15:20:00Z'),
  (5, 2, 'inbound', 'events@communityhub.example', 'hello@weallcanada.com',
   'Perfect. Also — do you want vegetarian catering as the default?', NULL, '2026-02-07T10:05:00Z'),
  (6, 2, 'outbound', 'hello@weallcanada.com', 'events@communityhub.example',
   'Yes — vegetarian default, with a clear allergen note on the signup form.', NULL, '2026-02-08T16:40:00Z'),
  (7, 3, 'inbound', 'reporter@localnews.example', 'hello@weallcanada.com',
   'Hi — writing a short explainer on wellbeing economy approaches in Canada. Who is the best contact for a quote this week?', NULL, '2026-02-09T14:30:00Z'),
  (8, 3, 'outbound', 'hello@weallcanada.com', 'reporter@localnews.example',
   'Thanks for reaching out. I can connect you with our Policy circle lead. What is your deadline?', NULL, '2026-02-09T17:00:00Z'),
  (9, 3, 'inbound', 'reporter@localnews.example', 'hello@weallcanada.com',
   'Filing Thursday noon. A 15-minute call Wednesday would be ideal.', NULL, '2026-02-10T09:20:00Z'),
  (10, 4, 'inbound', 'sam.volunteer@example.org', 'hello@weallcanada.com',
   'I am in Halifax and would love to help with event setup or note-taking.', NULL, '2026-01-27T09:00:00Z'),
  (11, 4, 'outbound', 'hello@weallcanada.com', 'sam.volunteer@example.org',
   'Wonderful — I have added you to our volunteer list and a steward will follow up with the next local gathering.', NULL, '2026-01-28T13:00:00Z');

INSERT OR IGNORE INTO faqs (id, question, answer, sort_order, updated_by) VALUES
  (100, 'Can partners join a circle without becoming stewards first?', '', 50, NULL);
