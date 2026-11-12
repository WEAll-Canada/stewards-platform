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
  contact_links = 'alex@weallcanada.local · https://example.com',
  regions = 'Quebec',
  map_address = 'Montreal',
  sector = 'NGO',
  sector_other = '',
  interests = 'Climate|Justice & Equity|Food & Agriculture',
  interest_other = '',
  about = 'Sample steward for local testing.'
WHERE user_id = 2;
