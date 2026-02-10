-- ============================================
-- Migration 009: Enhance transition_plan_reviews
-- Adds columns the frontend ReviewForm expects,
-- plus effectiveness/implementation tracking.
-- ============================================

-- Columns the ReviewForm submits but don't exist yet
ALTER TABLE transition_plan_reviews ADD COLUMN IF NOT EXISTS progress_rating TEXT;
ALTER TABLE transition_plan_reviews ADD COLUMN IF NOT EXISTS behavioral_notes TEXT;
ALTER TABLE transition_plan_reviews ADD COLUMN IF NOT EXISTS academic_notes TEXT;
ALTER TABLE transition_plan_reviews ADD COLUMN IF NOT EXISTS parent_contact_notes TEXT;
ALTER TABLE transition_plan_reviews ADD COLUMN IF NOT EXISTS recommendations TEXT;
ALTER TABLE transition_plan_reviews ADD COLUMN IF NOT EXISTS next_steps TEXT;

-- Effectiveness and implementation tracking
ALTER TABLE transition_plan_reviews ADD COLUMN IF NOT EXISTS goals_progress JSONB DEFAULT '[]';
ALTER TABLE transition_plan_reviews ADD COLUMN IF NOT EXISTS intervention_effectiveness TEXT CHECK (intervention_effectiveness IN ('highly_effective','effective','somewhat_effective','ineffective','not_rated'));
ALTER TABLE transition_plan_reviews ADD COLUMN IF NOT EXISTS implementation_fidelity TEXT CHECK (implementation_fidelity IN ('full','partial','minimal','not_implemented'));
ALTER TABLE transition_plan_reviews ADD COLUMN IF NOT EXISTS implementation_notes TEXT;
ALTER TABLE transition_plan_reviews ADD COLUMN IF NOT EXISTS days_present INTEGER;
ALTER TABLE transition_plan_reviews ADD COLUMN IF NOT EXISTS days_absent INTEGER;

-- Add next_review_date to transition_plans (computed from review_30/60/90_date)
ALTER TABLE transition_plans ADD COLUMN IF NOT EXISTS next_review_date DATE;

-- Add parent_engagement_plan as TEXT column (separate from parent_engagement JSONB)
ALTER TABLE transition_plans ADD COLUMN IF NOT EXISTS parent_engagement_plan TEXT;
