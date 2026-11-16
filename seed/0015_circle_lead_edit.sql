UPDATE circles
SET welcome_note = 'Central Circle holds alliance-wide coordination. Use this page for shared context, resources, and decisions.',
    resources_blurb = 'Charters, working docs, and links that help the whole alliance.',
    updated_at = '2026-02-01T12:00:00Z'
WHERE slug = 'central';

UPDATE circles
SET welcome_note = 'Knowledge Building is where we learn together and keep useful notes close at hand.',
    resources_blurb = 'Reading lists and sense-making notes for the circle.',
    updated_at = '2026-02-03T12:00:00Z'
WHERE slug = 'knowledge-building';
