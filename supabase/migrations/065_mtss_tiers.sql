-- MTSS Tier tracking for students and supports

-- Student tier assignment (1=Universal, 2=Targeted, 3=Intensive, NULL=not in MTSS)
ALTER TABLE students ADD COLUMN IF NOT EXISTS mtss_tier INTEGER CHECK (mtss_tier IN (1, 2, 3));

-- Support tier tagging (a support can apply to multiple tiers)
ALTER TABLE navigator_supports ADD COLUMN IF NOT EXISTS tiers INTEGER[] DEFAULT '{}';

-- Index for tier-based queries
CREATE INDEX IF NOT EXISTS idx_students_mtss_tier ON students(district_id, mtss_tier) WHERE mtss_tier IS NOT NULL;
