-- Migration 052: Compliance checklist completed_by tracking + alert plan linkage
--
-- 1. item_completed_by JSONB on compliance_checklists:
--    Stores { "field_name": { "id": "uuid", "name": "Full Name" } }
--    Updated from the client each time a checklist item is checked/unchecked.
--    Enables TEA-auditable "who completed each step" in the PDF export.
--
-- 2. plan_id on alerts:
--    Links an alert to a specific transition plan.
--    Used by the client-side overdue review alert deduplication check —
--    prevents creating duplicate transition_review_overdue alerts for the same plan.

ALTER TABLE compliance_checklists
  ADD COLUMN IF NOT EXISTS item_completed_by JSONB DEFAULT '{}';

ALTER TABLE alerts
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES transition_plans(id) ON DELETE SET NULL;
