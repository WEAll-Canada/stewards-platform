-- Welcome survey fields (aligned with weallcanada.org/connect) + bootstrap operator access.

ALTER TABLE profiles ADD COLUMN profile_type TEXT NOT NULL DEFAULT 'steward';
ALTER TABLE profiles ADD COLUMN contact_links TEXT NOT NULL DEFAULT '';
ALTER TABLE profiles ADD COLUMN regions TEXT NOT NULL DEFAULT '';
ALTER TABLE profiles ADD COLUMN map_address TEXT NOT NULL DEFAULT '';
ALTER TABLE profiles ADD COLUMN sector TEXT NOT NULL DEFAULT '';
ALTER TABLE profiles ADD COLUMN sector_other TEXT NOT NULL DEFAULT '';
ALTER TABLE profiles ADD COLUMN interests TEXT NOT NULL DEFAULT '';
ALTER TABLE profiles ADD COLUMN interest_other TEXT NOT NULL DEFAULT '';
ALTER TABLE profiles ADD COLUMN about TEXT NOT NULL DEFAULT '';

ALTER TABLE applications ADD COLUMN profile_type TEXT NOT NULL DEFAULT 'steward';
ALTER TABLE applications ADD COLUMN contact_links TEXT NOT NULL DEFAULT '';
ALTER TABLE applications ADD COLUMN regions TEXT NOT NULL DEFAULT '';
ALTER TABLE applications ADD COLUMN map_address TEXT NOT NULL DEFAULT '';
ALTER TABLE applications ADD COLUMN sector TEXT NOT NULL DEFAULT '';
ALTER TABLE applications ADD COLUMN sector_other TEXT NOT NULL DEFAULT '';
ALTER TABLE applications ADD COLUMN interests TEXT NOT NULL DEFAULT '';
ALTER TABLE applications ADD COLUMN interest_other TEXT NOT NULL DEFAULT '';
ALTER TABLE applications ADD COLUMN about TEXT NOT NULL DEFAULT '';
ALTER TABLE applications ADD COLUMN charter_agreed INTEGER NOT NULL DEFAULT 0;

-- If this email already applied on staging, activate as steward + admin so testing can continue.
UPDATE users SET status = 'active' WHERE lower(email) = 'naryan@gmail.com';

INSERT OR IGNORE INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u
JOIN roles r ON r.name IN ('steward', 'admin')
WHERE lower(u.email) = 'naryan@gmail.com';

UPDATE applications
SET status = 'approved', reviewed_at = strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
WHERE status = 'pending'
  AND user_id IN (SELECT id FROM users WHERE lower(email) = 'naryan@gmail.com');
