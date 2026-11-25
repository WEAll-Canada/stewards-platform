-- Remove demo directory stewards that shipped via migration 0007 (and local seed mirrors).
-- Real members are loaded into production separately and must never live in committed seed.

DELETE FROM page_views
WHERE user_id IN (
  SELECT id FROM users
  WHERE lower(email) IN (
    'kai@weallcanada.local',
    'jordan@weallcanada.local',
    'priya@weallcanada.local'
  )
);

DELETE FROM users
WHERE lower(email) IN (
  'kai@weallcanada.local',
  'jordan@weallcanada.local',
  'priya@weallcanada.local'
);
