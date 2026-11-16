-- Extra circle page fields for lead/admin editing.
-- SQLite ALTER TABLE only allows constant defaults.
ALTER TABLE circles ADD COLUMN welcome_note TEXT NOT NULL DEFAULT '';
ALTER TABLE circles ADD COLUMN resources_blurb TEXT NOT NULL DEFAULT '';
ALTER TABLE circles ADD COLUMN updated_at TEXT NOT NULL DEFAULT '';
