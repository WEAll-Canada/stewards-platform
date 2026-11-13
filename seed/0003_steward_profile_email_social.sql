INSERT OR IGNORE INTO circles (id, slug, name, color_token, status, description) VALUES
  (1, 'central', 'Central Circle', 'central', 'active', 'Coordination hub for WeAll Canada.'),
  (2, 'knowledge-building', 'Knowledge Building', 'knowledge', 'active', 'Learning and shared sense-making.'),
  (3, 'policy', 'Policy', 'policy', 'active', 'Policy work and public systems.'),
  (4, 'liberating-tools', 'Liberating Tools', 'liberating', 'active', 'Practical tools and methods.'),
  (5, 'grassroots', 'Grassroots', 'grassroots', 'dormant', 'Dormant — not a primary join target.');

INSERT OR IGNORE INTO circle_members (circle_id, user_id, role) VALUES
  (1, 1, 'lead'),
  (1, 3, 'member'),
  (2, 3, 'member'),
  (3, 1, 'member');

INSERT OR IGNORE INTO connections (id, from_user_id, to_user_id, strength, reason) VALUES
  (1, 3, 1, 3, 'learning');

INSERT OR IGNORE INTO email_threads (id, subject, status, last_message_at, created_at) VALUES
  (1, 'Hello from a community partner', 'open', '2026-02-01T15:00:00Z', '2026-02-01T14:00:00Z'),
  (2, 'Workshop follow-up — room capacity', 'open', '2026-02-08T16:40:00Z', '2026-02-06T11:00:00Z'),
  (3, 'Media request: wellbeing economy explainer', 'open', '2026-02-10T09:20:00Z', '2026-02-09T14:30:00Z'),
  (4, 'Volunteer offer from Halifax', 'closed', '2026-01-28T13:00:00Z', '2026-01-27T09:00:00Z');

INSERT OR IGNORE INTO email_messages (id, thread_id, direction, from_addr, to_addrs, body_text, admin_user_id, created_at) VALUES
  (1, 1, 'inbound', 'partner@example.org', 'hello@weallcanada.com', 'Hi WeAll Canada — we would love to collaborate on a spring workshop.', NULL, '2026-02-01T14:00:00Z'),
  (2, 1, 'outbound', 'hello@weallcanada.com', 'partner@example.org', 'Thanks for reaching out! An admin will follow up with next steps.', 1, '2026-02-01T15:00:00Z'),
  (3, 2, 'inbound', 'events@communityhub.example', 'hello@weallcanada.com', 'Thanks for the call yesterday. Can your team host 40 people on March 12, or should we cap at 25?', NULL, '2026-02-06T11:00:00Z'),
  (4, 2, 'outbound', 'hello@weallcanada.com', 'events@communityhub.example', 'We can do 40 if we use the side room for breakouts. I will confirm AV by Friday.', 1, '2026-02-06T15:20:00Z'),
  (5, 2, 'inbound', 'events@communityhub.example', 'hello@weallcanada.com', 'Perfect. Also — do you want vegetarian catering as the default?', NULL, '2026-02-07T10:05:00Z'),
  (6, 2, 'outbound', 'hello@weallcanada.com', 'events@communityhub.example', 'Yes — vegetarian default, with a clear allergen note on the signup form.', 1, '2026-02-08T16:40:00Z'),
  (7, 3, 'inbound', 'reporter@localnews.example', 'hello@weallcanada.com', 'Hi — writing a short explainer on wellbeing economy approaches in Canada. Who is the best contact for a quote this week?', NULL, '2026-02-09T14:30:00Z'),
  (8, 3, 'outbound', 'hello@weallcanada.com', 'reporter@localnews.example', 'Thanks for reaching out. I can connect you with our Policy circle lead. What is your deadline?', 1, '2026-02-09T17:00:00Z'),
  (9, 3, 'inbound', 'reporter@localnews.example', 'hello@weallcanada.com', 'Filing Thursday noon. A 15-minute call Wednesday would be ideal.', NULL, '2026-02-10T09:20:00Z'),
  (10, 4, 'inbound', 'sam.volunteer@example.org', 'hello@weallcanada.com', 'I am in Halifax and would love to help with event setup or note-taking.', NULL, '2026-01-27T09:00:00Z'),
  (11, 4, 'outbound', 'hello@weallcanada.com', 'sam.volunteer@example.org', 'Wonderful — I have added you to our volunteer list and a steward will follow up with the next local gathering.', 1, '2026-01-28T13:00:00Z');
