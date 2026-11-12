-- Sample welcome-survey fields for local preview accounts.
UPDATE profiles SET
  profile_type = 'steward',
  contact_links = 'admin@weallcanada.local',
  regions = 'Canada (national)',
  map_address = '',
  sector = 'Network',
  sector_other = '',
  interests = 'Community Economics|Leadership|Systemic Innovation',
  interest_other = '',
  about = 'Coordinates the WEAll Canada Stewards Platform preview.'
WHERE user_id = 1;

UPDATE profiles SET
  profile_type = 'steward',
  contact_links = 'pending@weallcanada.local',
  regions = 'Ontario',
  map_address = 'Toronto',
  sector = 'NGO',
  sector_other = '',
  interests = 'Housing|Climate',
  interest_other = '',
  about = 'Waiting for approval on the Stewards Platform.'
WHERE user_id = 2;

UPDATE profiles SET
  profile_type = 'steward',
  contact_links = 'alex@weallcanada.local · https://example.com',
  regions = 'Quebec',
  map_address = 'Montreal',
  sector = 'NGO',
  sector_other = '',
  interests = 'Climate|Justice & Equity|Food & Agriculture',
  interest_other = '',
  about = 'Sample steward for local testing.'
WHERE user_id = 3;

-- Operator test account (staging apply + local if present): circles + RSVP for dashboard testing.
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

-- Ensure local admin also has enough circle/event signal for dashboard demos.
INSERT OR IGNORE INTO event_rsvps (event_id, user_id, status) VALUES
  (1, 1, 'going');
