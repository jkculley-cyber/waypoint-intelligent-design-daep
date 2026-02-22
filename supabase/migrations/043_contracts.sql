-- Migration 043: contracts table for owner business dashboard
-- Apply via Supabase SQL Editor: https://supabase.com/dashboard/project/kvxecksvkimcgwhxxyhw/sql/new

CREATE TABLE contracts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id      UUID REFERENCES districts(id) ON DELETE SET NULL,  -- nullable: prospects not yet provisioned
  district_name    TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'prospect'
                     CHECK (status IN ('prospect','demo','pilot','active','churned')),
  products         TEXT[] NOT NULL DEFAULT '{}',
  tier             TEXT NOT NULL DEFAULT 'professional'
                     CHECK (tier IN ('essential','professional','enterprise')),
  annual_value     NUMERIC(10,2) NOT NULL DEFAULT 0,
  enrollment_band  TEXT CHECK (enrollment_band IN ('micro','small','medium','large','enterprise')),
  start_date       DATE,
  end_date         DATE,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;

-- Only waypoint_admin can access contracts
CREATE POLICY "waypoint_admin_full" ON contracts
  USING (is_waypoint_admin())
  WITH CHECK (is_waypoint_admin());
