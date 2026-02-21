-- Migration 031: Scope daep-documents storage bucket policies by district
--
-- BEFORE (migration 016): Storage policies only checked auth.role() = 'authenticated'
-- Any authenticated user from ANY district could read/upload/delete DAEP documents
-- belonging to any other district — a FERPA violation.
--
-- AFTER: SELECT and INSERT validate that the first path segment of the object name
-- matches the caller's district_id. DELETE requires district match AND (owner OR admin).
--
-- Path convention enforced by DocumentUpload.jsx:
--   {district_id}/incidents/{incident_id}/{type}_{timestamp}_{filename}
-- The first segment is always the district UUID.

-- ─────────────────────────────────────────────────────────────────────────────
-- Drop the old unscoped policies
-- ─────────────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "District staff can view DAEP documents" ON storage.objects;
DROP POLICY IF EXISTS "Staff can upload DAEP documents"        ON storage.objects;
DROP POLICY IF EXISTS "Owners can delete DAEP documents"       ON storage.objects;

-- ─────────────────────────────────────────────────────────────────────────────
-- SELECT — authenticated staff can only view documents in their district's folder
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "District staff can view their district DAEP documents"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'daep-documents'
    AND auth.role() = 'authenticated'
    AND split_part(name, '/', 1)::uuid = public.user_district_id()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- INSERT — staff can only upload into their own district's folder
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "District staff can upload to their district DAEP folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'daep-documents'
    AND auth.role() = 'authenticated'
    AND split_part(name, '/', 1)::uuid = public.user_district_id()
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- DELETE — owner or district admin can remove documents, scoped to their district
-- ─────────────────────────────────────────────────────────────────────────────
CREATE POLICY "District staff can delete their district DAEP documents"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'daep-documents'
    AND split_part(name, '/', 1)::uuid = public.user_district_id()
    AND (
      auth.uid() = owner
      OR public.user_role() IN ('admin', 'principal', 'ap')
    )
  );
