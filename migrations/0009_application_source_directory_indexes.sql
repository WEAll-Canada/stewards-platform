-- Track apply vs activate (migrating stewards), and index directory filter columns.

ALTER TABLE applications ADD COLUMN source TEXT NOT NULL DEFAULT 'apply';

CREATE INDEX idx_applications_source ON applications (source);

CREATE INDEX idx_profiles_display_name ON profiles (display_name);
CREATE INDEX idx_profiles_sector ON profiles (sector);
CREATE INDEX idx_profiles_regions ON profiles (regions);
