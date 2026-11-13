-- Interests + connections for Connect matching and the thin network map.

UPDATE profiles SET
  interests = 'Community Economics|Housing|Leadership',
  interest_other = 'co-ops',
  about = 'Works on community economics and housing experiments in Toronto.'
WHERE user_id = 901;

UPDATE profiles SET
  interests = 'Education & Childcare|Measurement & Goals|Leadership',
  interest_other = '',
  about = 'Facilitates learning journeys and measurement for wellbeing goals.'
WHERE user_id = 902;

UPDATE profiles SET
  interests = 'Policy & Regulation|Climate|Justice & Equity',
  interest_other = 'municipal framing',
  about = 'Collects wellbeing economy framing in municipal and provincial policy.'
WHERE user_id = 903;

INSERT OR IGNORE INTO connections (id, from_user_id, to_user_id, strength, reason) VALUES
  (2, 1, 901, 2, 'work'),
  (3, 1, 902, 2, 'learning'),
  (4, 3, 901, 3, 'work|learning'),
  (5, 3, 903, 2, 'learning'),
  (6, 901, 902, 3, 'social|learning'),
  (7, 902, 903, 2, 'work'),
  (8, 901, 903, 1, 'social');
