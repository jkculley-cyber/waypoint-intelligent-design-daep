-- ============================================
-- Migration 010: Data Import System
-- Adds import_history and import_errors tables
-- for CSV/Excel bulk data import tracking
-- ============================================

-- ============================================
-- 1. IMPORT HISTORY
-- ============================================
CREATE TABLE IF NOT EXISTS import_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  district_id UUID NOT NULL REFERENCES districts(id),
  imported_by UUID NOT NULL REFERENCES profiles(id),
  import_type TEXT NOT NULL CHECK (import_type IN ('campuses','students','profiles','incidents')),
  file_name TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('processing','completed','failed','partial')),
  total_rows INTEGER NOT NULL,
  success_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  skipped_count INTEGER DEFAULT 0,
  duplicate_strategy TEXT NOT NULL CHECK (duplicate_strategy IN ('skip','upsert','prompt')),
  column_mapping JSONB NOT NULL DEFAULT '{}',
  scoped_campus_id UUID REFERENCES campuses(id),
  notes TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_import_history_district ON import_history(district_id);
CREATE INDEX idx_import_history_imported_by ON import_history(imported_by);
CREATE INDEX idx_import_history_status ON import_history(status);
CREATE INDEX idx_import_history_type ON import_history(import_type);

-- ============================================
-- 2. IMPORT ERRORS
-- ============================================
CREATE TABLE IF NOT EXISTS import_errors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  import_history_id UUID NOT NULL REFERENCES import_history(id) ON DELETE CASCADE,
  row_number INTEGER NOT NULL,
  error_type TEXT NOT NULL,
  error_message TEXT NOT NULL,
  row_data JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_import_errors_history ON import_errors(import_history_id);

-- ============================================
-- 3. RLS POLICIES
-- ============================================
ALTER TABLE import_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_errors ENABLE ROW LEVEL SECURITY;

-- Import history: users can see imports from their district
CREATE POLICY "import_history_select" ON import_history
  FOR SELECT USING (
    district_id = (SELECT district_id FROM profiles WHERE id = auth.uid())
  );

-- Import history: users can insert for their district
CREATE POLICY "import_history_insert" ON import_history
  FOR INSERT WITH CHECK (
    district_id = (SELECT district_id FROM profiles WHERE id = auth.uid())
    AND imported_by = auth.uid()
  );

-- Import history: users can update their own imports
CREATE POLICY "import_history_update" ON import_history
  FOR UPDATE USING (imported_by = auth.uid());

-- Import errors: users can see errors from their district's imports
CREATE POLICY "import_errors_select" ON import_errors
  FOR SELECT USING (
    import_history_id IN (
      SELECT id FROM import_history
      WHERE district_id = (SELECT district_id FROM profiles WHERE id = auth.uid())
    )
  );

-- Import errors: users can insert errors for their own imports
CREATE POLICY "import_errors_insert" ON import_errors
  FOR INSERT WITH CHECK (
    import_history_id IN (
      SELECT id FROM import_history WHERE imported_by = auth.uid()
    )
  );

-- ============================================
-- 4. Add import_tier setting to districts
-- ============================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'districts' AND column_name = 'settings'
  ) THEN
    ALTER TABLE districts ADD COLUMN settings JSONB DEFAULT '{}';
  END IF;
END $$;

COMMENT ON TABLE import_history IS 'Tracks bulk data import operations (CSV/Excel uploads)';
COMMENT ON TABLE import_errors IS 'Per-row errors from import operations';
