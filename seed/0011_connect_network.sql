-- Extra connection edge for the thin network map (Alex ↔ Admin already seeded in 0003).
-- Keep Admin discoverable in Climate interest matching for local tests.

UPDATE profiles SET
  interests = 'Community Economics|Leadership|Climate',
  interest_other = '',
  about = 'Coordinates the WEAll Canada Stewards Platform preview.'
WHERE user_id = 1;
