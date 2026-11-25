-- Richer circle memberships so the circle map has faces, bridges, and a pending join.
-- Uses demo-network users from seed/0017_demo_network.sql (901–903 were removed in migration 0016).

INSERT OR IGNORE INTO circle_members (circle_id, user_id, role) VALUES
  -- Demo network faces across circles (and a few multi-circle bridges)
  (1, 100, 'member'),
  (1, 101, 'member'),
  (1, 102, 'member'),
  (2, 103, 'member'),
  (2, 104, 'member'),
  (2, 105, 'member'),
  (2, 100, 'member'),
  (3, 106, 'member'),
  (3, 107, 'member'),
  (3, 108, 'member'),
  (3, 101, 'member'),
  (4, 109, 'member'),
  (4, 110, 'member'),
  (4, 111, 'member'),
  (4, 104, 'member'),
  (1, 112, 'member'),
  (2, 113, 'member'),
  (3, 114, 'lead'),
  (4, 115, 'lead');

-- Alex (user 3) already bridges Central + Knowledge; mark as an official link.
INSERT OR IGNORE INTO circle_links (user_id, circle_a_id, circle_b_id, status, nominated_by, reviewed_at, reviewed_by)
VALUES (3, 1, 2, 'active', 1, '2026-02-01T12:00:00Z', 1);

-- Official link for Maya (100) between Central and Knowledge.
INSERT OR IGNORE INTO circle_links (user_id, circle_a_id, circle_b_id, status, nominated_by, reviewed_at, reviewed_by)
VALUES (100, 1, 2, 'active', 1, '2026-03-05T12:00:00Z', 1);

-- Samir (101) self-nominates as a pending bridge between Central and Policy.
INSERT OR IGNORE INTO circle_links (user_id, circle_a_id, circle_b_id, status, nominated_by)
VALUES (101, 1, 3, 'pending', 101);

-- Pending join so the map can show a faded face.
INSERT OR IGNORE INTO circle_join_requests (circle_id, user_id, status, created_at)
VALUES (4, 116, 'pending', '2026-02-15T10:00:00Z');
