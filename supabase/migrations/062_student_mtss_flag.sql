-- Migration 062: Add MTSS flag to students
ALTER TABLE students ADD COLUMN IF NOT EXISTS is_mtss BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN students.is_mtss IS 'Student is in Multi-Tiered System of Supports (MTSS).';
