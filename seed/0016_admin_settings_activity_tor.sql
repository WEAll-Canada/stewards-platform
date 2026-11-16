-- Default survey options (mirror survey.ts), Living Charter / ToR, sample activity.

INSERT OR IGNORE INTO survey_options (kind, label, sort_order, active, created_at) VALUES
  ('sector', 'Academic', 10, 1, '2026-01-01T00:00:00Z'),
  ('sector', 'Business/Enterprise', 20, 1, '2026-01-01T00:00:00Z'),
  ('sector', 'Co-op', 30, 1, '2026-01-01T00:00:00Z'),
  ('sector', 'Faith', 40, 1, '2026-01-01T00:00:00Z'),
  ('sector', 'Government', 50, 1, '2026-01-01T00:00:00Z'),
  ('sector', 'Investment Fund', 60, 1, '2026-01-01T00:00:00Z'),
  ('sector', 'Labour', 70, 1, '2026-01-01T00:00:00Z'),
  ('sector', 'Media', 80, 1, '2026-01-01T00:00:00Z'),
  ('sector', 'Network', 90, 1, '2026-01-01T00:00:00Z'),
  ('sector', 'NGO', 100, 1, '2026-01-01T00:00:00Z'),
  ('sector', 'Philanthropy', 110, 1, '2026-01-01T00:00:00Z'),
  ('sector', 'Other', 999, 1, '2026-01-01T00:00:00Z');

INSERT OR IGNORE INTO survey_options (kind, label, sort_order, active, created_at) VALUES
  ('interest', 'Basic Income', 10, 1, '2026-01-01T00:00:00Z'),
  ('interest', 'Basic Needs', 20, 1, '2026-01-01T00:00:00Z'),
  ('interest', 'Business', 30, 1, '2026-01-01T00:00:00Z'),
  ('interest', 'Changemaking', 40, 1, '2026-01-01T00:00:00Z'),
  ('interest', 'Climate', 50, 1, '2026-01-01T00:00:00Z'),
  ('interest', 'Community Economics', 60, 1, '2026-01-01T00:00:00Z'),
  ('interest', 'Democracy & Governance', 70, 1, '2026-01-01T00:00:00Z'),
  ('interest', 'Education & Childcare', 80, 1, '2026-01-01T00:00:00Z'),
  ('interest', 'Energy', 90, 1, '2026-01-01T00:00:00Z'),
  ('interest', 'Finance', 100, 1, '2026-01-01T00:00:00Z'),
  ('interest', 'Food & Agriculture', 110, 1, '2026-01-01T00:00:00Z'),
  ('interest', 'Health', 120, 1, '2026-01-01T00:00:00Z'),
  ('interest', 'Housing', 130, 1, '2026-01-01T00:00:00Z'),
  ('interest', 'Indigenous Economies', 140, 1, '2026-01-01T00:00:00Z'),
  ('interest', 'Justice & Equity', 150, 1, '2026-01-01T00:00:00Z'),
  ('interest', 'Labour & Work', 160, 1, '2026-01-01T00:00:00Z'),
  ('interest', 'Leadership', 170, 1, '2026-01-01T00:00:00Z'),
  ('interest', 'Measurement & Goals', 180, 1, '2026-01-01T00:00:00Z'),
  ('interest', 'Movements & Visions', 190, 1, '2026-01-01T00:00:00Z'),
  ('interest', 'Nature', 200, 1, '2026-01-01T00:00:00Z'),
  ('interest', 'Policy & Regulation', 210, 1, '2026-01-01T00:00:00Z'),
  ('interest', 'Social Enterprise', 220, 1, '2026-01-01T00:00:00Z'),
  ('interest', 'Sustainable Communities', 230, 1, '2026-01-01T00:00:00Z'),
  ('interest', 'Systemic Innovation', 240, 1, '2026-01-01T00:00:00Z'),
  ('interest', 'Technology', 250, 1, '2026-01-01T00:00:00Z'),
  ('interest', 'Trade & Localization', 260, 1, '2026-01-01T00:00:00Z'),
  ('interest', 'Transit', 270, 1, '2026-01-01T00:00:00Z'),
  ('interest', 'Other', 999, 1, '2026-01-01T00:00:00Z');

INSERT OR IGNORE INTO site_settings (key, value, updated_at, updated_by) VALUES
  (
    'charter_title',
    'Living Charter',
    '2026-01-01T00:00:00Z',
    1
  ),
  (
    'charter_body',
    'As a WeAll Canada steward I will act with care for people and planet, share learning openly, honour consent and privacy in the directory, and help the alliance stay purposeful, hospitable, and accountable.',
    '2026-01-01T00:00:00Z',
    1
  ),
  (
    'charter_version',
    '2026.1',
    '2026-01-01T00:00:00Z',
    1
  ),
  (
    'about_prompt',
    'What else would you like to share about yourself?',
    '2026-01-01T00:00:00Z',
    1
  ),
  (
    'about_hint',
    'A free space to share as much or as little as you’d like — your work, keywords, or even a favourite poem.',
    '2026-01-01T00:00:00Z',
    1
  ),
  (
    'tor_fields',
    'Care for people and planet|Share learning openly|Honour consent and privacy|Stay purposeful and accountable',
    '2026-01-01T00:00:00Z',
    1
  );

INSERT OR IGNORE INTO activity_log (id, actor_id, action, subject_type, subject_id, detail, created_at) VALUES
  (1, 1, 'seed.notice', 'system', '', 'Activity trail enabled for admin review.', '2026-02-01T10:00:00Z'),
  (2, 1, 'circle.updated', 'circle', '1', 'Central Circle page details refreshed.', '2026-02-02T11:00:00Z');
