-- Migration 079: Parent role gets audit_log SELECT for own children's records (T1-8)
--
-- CC22 R1 finding F7 — Reyes + Patricia convergent: migration 035's audit_log
-- RLS policy explicitly restricts SELECT to admin/principal + waypoint_admin.
-- The parent role has no audit_log access at all. Patricia named this as
-- "the whole point of an audit log in a discipline system is the parent's
-- evidentiary right under FERPA §99.10. The district shouldn't be the only
-- one who gets to see who edited what."
--
-- This migration adds a SELECT policy giving parents access to audit_log
-- rows that pertain to their own children's incidents, compliance_checklists,
-- and transition_plans. Linkage is via student_guardians.portal_user_id
-- (migration 034).

CREATE POLICY "parent_read_own_children" ON audit_log
  FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'parent'
    AND (
      (entity_type = 'incidents' AND entity_id IN (
        SELECT i.id FROM incidents i
        WHERE i.student_id IN (
          SELECT sg.student_id FROM student_guardians sg
          WHERE sg.portal_user_id = auth.uid()
        )
      ))
      OR
      (entity_type = 'compliance_checklists' AND entity_id IN (
        SELECT c.id FROM compliance_checklists c
        WHERE c.student_id IN (
          SELECT sg.student_id FROM student_guardians sg
          WHERE sg.portal_user_id = auth.uid()
        )
      ))
      OR
      (entity_type = 'transition_plans' AND entity_id IN (
        SELECT t.id FROM transition_plans t
        WHERE t.student_id IN (
          SELECT sg.student_id FROM student_guardians sg
          WHERE sg.portal_user_id = auth.uid()
        )
      ))
      OR
      (entity_type = 'compliance_override_requests' AND entity_id IN (
        SELECT r.id FROM compliance_override_requests r
        JOIN compliance_checklists c ON c.id = r.compliance_checklist_id
        WHERE c.student_id IN (
          SELECT sg.student_id FROM student_guardians sg
          WHERE sg.portal_user_id = auth.uid()
        )
      ))
    )
  );

-- Note: Performance.
-- The subqueries are bounded by the parent's child count (typically 1-5) and
-- exploit idx_audit_log_entity (entity_type, entity_id) from migration 035.
-- For a parent browsing a single incident's edit history, the planner reads
-- ~5-50 audit_log rows after RLS filtering. Acceptable.
--
-- Note: transition_plans table is referenced. If absent in this environment,
-- the policy clause for that branch never matches (subquery returns nothing),
-- which is the correct fallback. Same for compliance_override_requests
-- (created in migration 078). Both should land before this migration.
