-- ============================================
-- Migration 007: Demo Seed Data
-- Creates a complete demo district with
-- sample campuses, students, incidents,
-- compliance records, alerts, plans, etc.
--
-- IMPORTANT: Run this AFTER creating a Supabase
-- auth user. Then update the admin profile below
-- with your auth user ID.
-- ============================================

-- ============================================
-- 1. DISTRICT
-- ============================================
INSERT INTO districts (id, name, tea_district_id, state, settings)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'Lone Star Independent School District',
  '123456',
  'TX',
  '{"school_year": "2025-2026", "default_consequence_days": {"iss": 3, "oss": 3, "daep": 30}}'::jsonb
);

-- ============================================
-- 2. CAMPUSES
-- ============================================
INSERT INTO campuses (id, district_id, name, tea_campus_id, campus_type) VALUES
('aaaa0001-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'Lone Star High School', '123456001', 'high'),
('aaaa0001-0001-0001-0001-000000000002', '11111111-1111-1111-1111-111111111111', 'Lone Star Middle School', '123456002', 'middle'),
('aaaa0001-0001-0001-0001-000000000003', '11111111-1111-1111-1111-111111111111', 'Bluebonnet Elementary', '123456003', 'elementary'),
('aaaa0001-0001-0001-0001-000000000004', '11111111-1111-1111-1111-111111111111', 'Lone Star DAEP', '123456004', 'daep');

-- ============================================
-- 3. STUDENTS (20 diverse students)
-- ============================================
INSERT INTO students (id, district_id, campus_id, student_id_number, first_name, last_name, middle_name, date_of_birth, grade_level, gender, race, is_sped, sped_eligibility, is_504, is_ell, is_homeless, is_foster_care, is_active) VALUES
-- High School students
('bbbb0001-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'aaaa0001-0001-0001-0001-000000000001', 'LS-10001', 'Marcus', 'Johnson', 'D', '2008-03-15', 10, 'M', 'Black', false, NULL, false, false, false, false, true),
('bbbb0001-0001-0001-0001-000000000002', '11111111-1111-1111-1111-111111111111', 'aaaa0001-0001-0001-0001-000000000001', 'LS-10002', 'Sofia', 'Garcia', 'M', '2008-07-22', 10, 'F', 'Hispanic', false, NULL, false, true, false, false, true),
('bbbb0001-0001-0001-0001-000000000003', '11111111-1111-1111-1111-111111111111', 'aaaa0001-0001-0001-0001-000000000001', 'LS-10003', 'Tyler', 'Williams', NULL, '2007-11-08', 11, 'M', 'White', true, 'ED', false, false, false, false, true),
('bbbb0001-0001-0001-0001-000000000004', '11111111-1111-1111-1111-111111111111', 'aaaa0001-0001-0001-0001-000000000001', 'LS-10004', 'Aaliyah', 'Brown', 'R', '2008-01-30', 10, 'F', 'Black', false, NULL, true, false, false, false, true),
('bbbb0001-0001-0001-0001-000000000005', '11111111-1111-1111-1111-111111111111', 'aaaa0001-0001-0001-0001-000000000001', 'LS-10005', 'David', 'Nguyen', NULL, '2007-09-12', 11, 'M', 'Asian', false, NULL, false, true, false, false, true),
('bbbb0001-0001-0001-0001-000000000006', '11111111-1111-1111-1111-111111111111', 'aaaa0001-0001-0001-0001-000000000001', 'LS-10006', 'Emily', 'Martinez', 'A', '2009-04-18', 9, 'F', 'Hispanic', true, 'LD', false, false, false, false, true),
('bbbb0001-0001-0001-0001-000000000007', '11111111-1111-1111-1111-111111111111', 'aaaa0001-0001-0001-0001-000000000001', 'LS-10007', 'Jayden', 'Smith', NULL, '2008-12-05', 10, 'M', 'Black', false, NULL, false, false, true, false, true),

-- Middle School students
('bbbb0001-0001-0001-0001-000000000008', '11111111-1111-1111-1111-111111111111', 'aaaa0001-0001-0001-0001-000000000002', 'LS-20001', 'Isabella', 'Rodriguez', NULL, '2011-06-20', 7, 'F', 'Hispanic', false, NULL, false, true, false, false, true),
('bbbb0001-0001-0001-0001-000000000009', '11111111-1111-1111-1111-111111111111', 'aaaa0001-0001-0001-0001-000000000002', 'LS-20002', 'Ethan', 'Davis', 'J', '2011-02-14', 7, 'M', 'White', true, 'AU', false, false, false, false, true),
('bbbb0001-0001-0001-0001-000000000010', '11111111-1111-1111-1111-111111111111', 'aaaa0001-0001-0001-0001-000000000002', 'LS-20003', 'Aisha', 'Thompson', NULL, '2010-10-30', 8, 'F', 'Black', false, NULL, false, false, false, true, true),
('bbbb0001-0001-0001-0001-000000000011', '11111111-1111-1111-1111-111111111111', 'aaaa0001-0001-0001-0001-000000000002', 'LS-20004', 'Carlos', 'Hernandez', 'R', '2010-08-25', 8, 'M', 'Hispanic', false, NULL, false, true, false, false, true),
('bbbb0001-0001-0001-0001-000000000012', '11111111-1111-1111-1111-111111111111', 'aaaa0001-0001-0001-0001-000000000002', 'LS-20005', 'Lily', 'Chen', NULL, '2011-05-03', 7, 'F', 'Asian', false, NULL, false, false, false, false, true),
('bbbb0001-0001-0001-0001-000000000013', '11111111-1111-1111-1111-111111111111', 'aaaa0001-0001-0001-0001-000000000002', 'LS-20006', 'DeShawn', 'Jackson', NULL, '2010-01-17', 8, 'M', 'Black', true, 'OHI', false, false, false, false, true),

-- Elementary students
('bbbb0001-0001-0001-0001-000000000014', '11111111-1111-1111-1111-111111111111', 'aaaa0001-0001-0001-0001-000000000003', 'LS-30001', 'Emma', 'Wilson', NULL, '2015-03-12', 3, 'F', 'White', false, NULL, false, false, false, false, true),
('bbbb0001-0001-0001-0001-000000000015', '11111111-1111-1111-1111-111111111111', 'aaaa0001-0001-0001-0001-000000000003', 'LS-30002', 'Luis', 'Morales', 'A', '2014-09-08', 4, 'M', 'Hispanic', true, 'SI', false, true, false, false, true),
('bbbb0001-0001-0001-0001-000000000016', '11111111-1111-1111-1111-111111111111', 'aaaa0001-0001-0001-0001-000000000003', 'LS-30003', 'Zoe', 'Anderson', NULL, '2015-11-21', 3, 'F', 'White', false, NULL, true, false, false, false, true),
('bbbb0001-0001-0001-0001-000000000017', '11111111-1111-1111-1111-111111111111', 'aaaa0001-0001-0001-0001-000000000003', 'LS-30004', 'Kwame', 'Osei', NULL, '2014-07-04', 4, 'M', 'Black', false, NULL, false, false, true, false, true),
('bbbb0001-0001-0001-0001-000000000018', '11111111-1111-1111-1111-111111111111', 'aaaa0001-0001-0001-0001-000000000003', 'LS-30005', 'Maya', 'Patel', NULL, '2016-02-28', 2, 'F', 'Asian', false, NULL, false, false, false, false, true),

-- DAEP students
('bbbb0001-0001-0001-0001-000000000019', '11111111-1111-1111-1111-111111111111', 'aaaa0001-0001-0001-0001-000000000004', 'LS-40001', 'Jordan', 'Taylor', 'L', '2008-06-10', 10, 'M', 'Multiracial', false, NULL, false, false, false, false, true),
('bbbb0001-0001-0001-0001-000000000020', '11111111-1111-1111-1111-111111111111', 'aaaa0001-0001-0001-0001-000000000004', 'LS-40002', 'Destiny', 'Moore', NULL, '2009-04-22', 9, 'F', 'Black', true, 'ED', false, false, false, false, true);

-- ============================================
-- 4. INCIDENTS (15 incidents across campuses)
--    NOTE: We reference offense codes by looking up their code.
--    The SPED compliance trigger will auto-fire for DAEP/expulsion.
-- ============================================

-- Get offense code IDs (using a DO block for variable assignment)
DO $$
DECLARE
  v_district UUID := '11111111-1111-1111-1111-111111111111';
  v_hs UUID := 'aaaa0001-0001-0001-0001-000000000001';
  v_ms UUID := 'aaaa0001-0001-0001-0001-000000000002';
  v_el UUID := 'aaaa0001-0001-0001-0001-000000000003';
  v_daep UUID := 'aaaa0001-0001-0001-0001-000000000004';
  v_admin UUID := '00000000-0000-0000-0000-000000000001'; -- Placeholder, update after creating auth user
  -- Offense code IDs
  oc_fight1 UUID;
  oc_fight2 UUID;
  oc_drug3 UUID;
  oc_vape1 UUID;
  oc_bully1 UUID;
  oc_bully2 UUID;
  oc_defy1 UUID;
  oc_defy2 UUID;
  oc_defy3 UUID;
  oc_theft1 UUID;
  oc_truan2 UUID;
  oc_harass1 UUID;
  oc_drug1 UUID;
BEGIN
  -- Look up offense code IDs
  SELECT id INTO oc_fight1 FROM offense_codes WHERE code = 'FIGHT-01' LIMIT 1;
  SELECT id INTO oc_fight2 FROM offense_codes WHERE code = 'FIGHT-02' LIMIT 1;
  SELECT id INTO oc_drug3 FROM offense_codes WHERE code = 'DRUG-03' LIMIT 1;
  SELECT id INTO oc_vape1 FROM offense_codes WHERE code = 'VAPE-01' LIMIT 1;
  SELECT id INTO oc_bully1 FROM offense_codes WHERE code = 'BULLY-01' LIMIT 1;
  SELECT id INTO oc_bully2 FROM offense_codes WHERE code = 'BULLY-02' LIMIT 1;
  SELECT id INTO oc_defy1 FROM offense_codes WHERE code = 'DEFY-01' LIMIT 1;
  SELECT id INTO oc_defy2 FROM offense_codes WHERE code = 'DEFY-02' LIMIT 1;
  SELECT id INTO oc_defy3 FROM offense_codes WHERE code = 'DEFY-03' LIMIT 1;
  SELECT id INTO oc_theft1 FROM offense_codes WHERE code = 'THEFT-01' LIMIT 1;
  SELECT id INTO oc_truan2 FROM offense_codes WHERE code = 'TRUAN-02' LIMIT 1;
  SELECT id INTO oc_harass1 FROM offense_codes WHERE code = 'HARASS-01' LIMIT 1;
  SELECT id INTO oc_drug1 FROM offense_codes WHERE code = 'DRUG-01' LIMIT 1;

  -- ============================================
  -- HIGH SCHOOL INCIDENTS
  -- ============================================

  -- 1. Marcus Johnson - Fighting (ISS, completed)
  INSERT INTO incidents (id, district_id, campus_id, student_id, reported_by, incident_date, incident_time, location, offense_code_id, description, consequence_type, consequence_days, consequence_start, consequence_end, status, sped_compliance_required, compliance_cleared)
  VALUES ('cccc0001-0001-0001-0001-000000000001', v_district, v_hs, 'bbbb0001-0001-0001-0001-000000000001', v_admin, '2025-09-15', '10:30', 'Hallway', oc_fight1, 'Marcus was involved in a physical altercation with another student in the hallway between 2nd and 3rd period. Both students were pushing and shoving. No serious injuries reported. Witnesses confirmed mutual combat.', 'iss', 3, '2025-09-16', '2025-09-18', 'completed', false, false);

  -- 2. Marcus Johnson - Defiance (ISS, completed) — repeat offender setup
  INSERT INTO incidents (id, district_id, campus_id, student_id, reported_by, incident_date, incident_time, location, offense_code_id, description, consequence_type, consequence_days, consequence_start, consequence_end, status)
  VALUES ('cccc0001-0001-0001-0001-000000000002', v_district, v_hs, 'bbbb0001-0001-0001-0001-000000000001', v_admin, '2025-10-08', '14:15', 'Classroom', oc_defy2, 'Marcus was disruptive in class, repeatedly talking over the teacher and refusing to put away his phone. After multiple warnings, he was removed from class.', 'iss', 2, '2025-10-09', '2025-10-10', 'completed');

  -- 3. Marcus Johnson - Fighting again (OSS, active) — triggers yellow alert
  INSERT INTO incidents (id, district_id, campus_id, student_id, reported_by, incident_date, incident_time, location, offense_code_id, description, consequence_type, consequence_days, consequence_start, consequence_end, status)
  VALUES ('cccc0001-0001-0001-0001-000000000003', v_district, v_hs, 'bbbb0001-0001-0001-0001-000000000001', v_admin, '2025-11-12', '12:45', 'Cafeteria', oc_fight2, 'Marcus was involved in a second fighting incident, this time in the cafeteria. Another student suffered a minor injury (bloody nose). Security footage reviewed.', 'oss', 5, '2025-11-13', '2025-11-19', 'active');

  -- 4. Tyler Williams (SPED) - Drug possession (DAEP)
  -- This should trigger the SPED compliance checkpoint
  INSERT INTO incidents (id, district_id, campus_id, student_id, reported_by, incident_date, incident_time, location, offense_code_id, description, consequence_type, consequence_days, consequence_start, consequence_end, status)
  VALUES ('cccc0001-0001-0001-0001-000000000004', v_district, v_hs, 'bbbb0001-0001-0001-0001-000000000003', v_admin, '2025-10-22', '08:30', 'Parking Lot', oc_drug3, 'Tyler was found in possession of marijuana in the school parking lot during arrival. School resource officer confirmed substance. Student admitted to having it for personal use.', 'daep', 30, '2025-10-23', '2025-11-21', 'compliance_hold');

  -- 5. Sofia Garcia - Vaping (detention, completed)
  INSERT INTO incidents (id, district_id, campus_id, student_id, reported_by, incident_date, incident_time, location, offense_code_id, description, consequence_type, consequence_days, status)
  VALUES ('cccc0001-0001-0001-0001-000000000005', v_district, v_hs, 'bbbb0001-0001-0001-0001-000000000002', v_admin, '2025-09-28', '11:00', 'Restroom', oc_vape1, 'Sofia was found vaping (nicotine) in the girls restroom. Device was confiscated. First offense.', 'detention', 2, 'completed');

  -- 6. Jayden Smith - Bullying (ISS, active)
  INSERT INTO incidents (id, district_id, campus_id, student_id, reported_by, incident_date, incident_time, location, offense_code_id, description, consequence_type, consequence_days, consequence_start, consequence_end, status)
  VALUES ('cccc0001-0001-0001-0001-000000000006', v_district, v_hs, 'bbbb0001-0001-0001-0001-000000000007', v_admin, '2025-11-05', '13:30', 'Gymnasium', oc_bully1, 'Jayden was reported for persistent bullying behavior toward a younger student. Multiple witnesses corroborated the report. This is the first documented incident.', 'iss', 3, '2025-11-06', '2025-11-08', 'active');

  -- 7. Emily Martinez (SPED) - Defiance (warning, completed)
  INSERT INTO incidents (id, district_id, campus_id, student_id, reported_by, incident_date, incident_time, location, offense_code_id, description, consequence_type, status)
  VALUES ('cccc0001-0001-0001-0001-000000000007', v_district, v_hs, 'bbbb0001-0001-0001-0001-000000000006', v_admin, '2025-10-15', '09:45', 'Classroom', oc_defy1, 'Emily refused to participate in class activity and became verbally defiant when redirected. De-escalation was successful. Teacher conference with parent scheduled.', 'warning', 'completed');

  -- ============================================
  -- MIDDLE SCHOOL INCIDENTS
  -- ============================================

  -- 8. Ethan Davis (SPED/Autism) - Disruptive behavior (ISS, completed)
  INSERT INTO incidents (id, district_id, campus_id, student_id, reported_by, incident_date, incident_time, location, offense_code_id, description, consequence_type, consequence_days, consequence_start, consequence_end, status)
  VALUES ('cccc0001-0001-0001-0001-000000000008', v_district, v_ms, 'bbbb0001-0001-0001-0001-000000000009', v_admin, '2025-09-20', '10:00', 'Classroom', oc_defy2, 'Ethan had a meltdown during a schedule change and became disruptive. Behavioral aide was unable to de-escalate initially. No physical harm occurred. Crisis team responded.', 'iss', 1, '2025-09-21', '2025-09-21', 'completed');

  -- 9. Carlos Hernandez - Cyberbullying (OSS, active)
  INSERT INTO incidents (id, district_id, campus_id, student_id, reported_by, incident_date, incident_time, location, offense_code_id, description, consequence_type, consequence_days, consequence_start, consequence_end, status)
  VALUES ('cccc0001-0001-0001-0001-000000000009', v_district, v_ms, 'bbbb0001-0001-0001-0001-000000000011', v_admin, '2025-11-01', '08:00', 'Online/Virtual', oc_bully2, 'Carlos posted threatening messages toward another student on social media. Screenshots were provided by the victim''s parent. Messages included derogatory language.', 'oss', 3, '2025-11-02', '2025-11-04', 'active');

  -- 10. DeShawn Jackson (SPED) - Theft (ISS, completed)
  INSERT INTO incidents (id, district_id, campus_id, student_id, reported_by, incident_date, incident_time, location, offense_code_id, description, consequence_type, consequence_days, consequence_start, consequence_end, status)
  VALUES ('cccc0001-0001-0001-0001-000000000010', v_district, v_ms, 'bbbb0001-0001-0001-0001-000000000013', v_admin, '2025-10-05', '12:30', 'Cafeteria', oc_theft1, 'DeShawn took another student''s phone from their backpack. Phone was recovered. Student admitted to taking it. First offense.', 'iss', 2, '2025-10-06', '2025-10-07', 'completed');

  -- 11. Aisha Thompson (Foster Care) - Class cutting (warning)
  INSERT INTO incidents (id, district_id, campus_id, student_id, reported_by, incident_date, incident_time, location, offense_code_id, description, consequence_type, status)
  VALUES ('cccc0001-0001-0001-0001-000000000011', v_district, v_ms, 'bbbb0001-0001-0001-0001-000000000010', v_admin, '2025-10-18', '13:00', 'Hallway', oc_truan2, 'Aisha was found in the hallway during 5th period. She said she was going to the counselor but had not signed out. Counselor meeting scheduled.', 'warning', 'completed');

  -- ============================================
  -- ELEMENTARY INCIDENTS
  -- ============================================

  -- 12. Luis Morales (SPED) - Defiance (warning)
  INSERT INTO incidents (id, district_id, campus_id, student_id, reported_by, incident_date, incident_time, location, offense_code_id, description, consequence_type, status)
  VALUES ('cccc0001-0001-0001-0001-000000000012', v_district, v_el, 'bbbb0001-0001-0001-0001-000000000015', v_admin, '2025-11-08', '10:15', 'Classroom', oc_defy1, 'Luis refused to transition to reading group and threw materials off his desk. Teacher used calm-down corner. Student de-escalated after 10 minutes. IEP review recommended.', 'warning', 'completed');

  -- 13. Kwame Osei (Homeless) - Fighting (ISS)
  INSERT INTO incidents (id, district_id, campus_id, student_id, reported_by, incident_date, incident_time, location, offense_code_id, description, consequence_type, consequence_days, consequence_start, consequence_end, status)
  VALUES ('cccc0001-0001-0001-0001-000000000013', v_district, v_el, 'bbbb0001-0001-0001-0001-000000000017', v_admin, '2025-10-30', '12:00', 'Playground/Recess', oc_fight1, 'Kwame got into a shoving match with another student during recess over a basketball disagreement. No injuries. Both students counseled.', 'iss', 1, '2025-10-31', '2025-10-31', 'completed');

  -- ============================================
  -- DAEP INCIDENTS
  -- ============================================

  -- 14. Jordan Taylor - Harassment at DAEP (ISS)
  INSERT INTO incidents (id, district_id, campus_id, student_id, reported_by, incident_date, incident_time, location, offense_code_id, description, consequence_type, consequence_days, consequence_start, consequence_end, status)
  VALUES ('cccc0001-0001-0001-0001-000000000014', v_district, v_daep, 'bbbb0001-0001-0001-0001-000000000019', v_admin, '2025-11-10', '09:00', 'Classroom', oc_harass1, 'Jordan made threatening verbal comments toward another student during class. Comments were overheard by staff. Student was separated and de-escalated.', 'iss', 2, '2025-11-11', '2025-11-12', 'active');

  -- 15. Destiny Moore (SPED) - Profanity toward staff (ISS)
  INSERT INTO incidents (id, district_id, campus_id, student_id, reported_by, incident_date, incident_time, location, offense_code_id, description, consequence_type, consequence_days, consequence_start, consequence_end, status)
  VALUES ('cccc0001-0001-0001-0001-000000000015', v_district, v_daep, 'bbbb0001-0001-0001-0001-000000000020', v_admin, '2025-11-14', '14:00', 'Hallway', oc_defy3, 'Destiny used profane language directed at a staff member when asked to return to class. Student was escorted to admin. Behavioral support plan review initiated.', 'iss', 2, '2025-11-15', '2025-11-16', 'active');

END $$;

-- ============================================
-- 5. TRANSITION PLANS (3 plans)
-- ============================================
INSERT INTO transition_plans (id, district_id, student_id, incident_id, plan_type, offense_category, goals, metrics, start_date, end_date, review_30_date, review_60_date, review_90_date, status, created_by, activated_at)
VALUES
-- Marcus Johnson - Behavioral plan (from repeat fighting)
('dddd0001-0001-0001-0001-000000000001', '11111111-1111-1111-1111-111111111111', 'bbbb0001-0001-0001-0001-000000000001', 'cccc0001-0001-0001-0001-000000000003', 'behavioral', 'fighting',
 'Goal 1: Reduce physical altercations to zero for 60 days
Goal 2: Demonstrate 3+ conflict resolution strategies per teacher observation
Goal 3: Maintain a daily behavior score of 3.5/5.0 or higher
Goal 4: Complete anger management counseling (8 sessions)',
 'Zero fighting incidents in 60 days
Teacher observation rubric (weekly)
Daily behavior tracking average ≥ 3.5
Counseling attendance (8/8 sessions)',
 '2025-11-13', '2026-01-12', '2025-12-13', '2026-01-12', NULL, 'active', '00000000-0000-0000-0000-000000000001', '2025-11-13'),

-- Tyler Williams - DAEP Exit Plan
('dddd0001-0001-0001-0001-000000000002', '11111111-1111-1111-1111-111111111111', 'bbbb0001-0001-0001-0001-000000000003', 'cccc0001-0001-0001-0001-000000000004', 'daep_exit', 'drugs_alcohol',
 'Goal 1: Complete substance abuse education program (12 sessions)
Goal 2: Pass random drug screening (minimum 3 clean tests)
Goal 3: Maintain attendance rate ≥ 90% at DAEP
Goal 4: Complete all academic assignments at DAEP with C or better
Goal 5: Develop and present personal accountability plan',
 'Substance abuse education completion (12/12)
Drug screening results (3 clean tests)
Attendance rate ≥ 90%
Academic grades ≥ 70 in all subjects
Personal accountability plan presentation',
 '2025-10-23', '2026-01-21', '2025-11-22', '2025-12-22', '2026-01-21', 'active', '00000000-0000-0000-0000-000000000001', '2025-10-23'),

-- Destiny Moore - DAEP behavioral plan
('dddd0001-0001-0001-0001-000000000003', '11111111-1111-1111-1111-111111111111', 'bbbb0001-0001-0001-0001-000000000020', 'cccc0001-0001-0001-0001-000000000015', 'behavioral', 'defiance',
 'Goal 1: Reduce verbal outbursts directed at staff to zero for 30 days
Goal 2: Use appropriate communication when frustrated (3 documented instances per week)
Goal 3: Complete 6 individual counseling sessions focused on emotional regulation
Goal 4: Maintain CICO daily average ≥ 3.0/5.0',
 'Zero staff-directed verbal incidents in 30 days
Appropriate communication log (3/week minimum)
Counseling attendance (6/6 sessions)
CICO average ≥ 3.0',
 '2025-11-15', '2025-12-15', '2025-12-15', NULL, NULL, 'draft', '00000000-0000-0000-0000-000000000001', NULL);

-- ============================================
-- 6. DISCIPLINE MATRIX ENTRIES (sample rules)
-- ============================================
DO $$
DECLARE
  v_district UUID := '11111111-1111-1111-1111-111111111111';
  oc_fight1 UUID;
  oc_fight2 UUID;
  oc_defy1 UUID;
  oc_defy2 UUID;
  oc_bully1 UUID;
  oc_vape1 UUID;
  oc_theft1 UUID;
  oc_drug3 UUID;
BEGIN
  SELECT id INTO oc_fight1 FROM offense_codes WHERE code = 'FIGHT-01' LIMIT 1;
  SELECT id INTO oc_fight2 FROM offense_codes WHERE code = 'FIGHT-02' LIMIT 1;
  SELECT id INTO oc_defy1 FROM offense_codes WHERE code = 'DEFY-01' LIMIT 1;
  SELECT id INTO oc_defy2 FROM offense_codes WHERE code = 'DEFY-02' LIMIT 1;
  SELECT id INTO oc_bully1 FROM offense_codes WHERE code = 'BULLY-01' LIMIT 1;
  SELECT id INTO oc_vape1 FROM offense_codes WHERE code = 'VAPE-01' LIMIT 1;
  SELECT id INTO oc_theft1 FROM offense_codes WHERE code = 'THEFT-01' LIMIT 1;
  SELECT id INTO oc_drug3 FROM offense_codes WHERE code = 'DRUG-03' LIMIT 1;

  -- Fighting - No Injury
  INSERT INTO discipline_matrix (district_id, offense_code_id, occurrence, grade_group, min_consequence, max_consequence, default_consequence, consequence_days_min, consequence_days_max, required_supports, transition_plan_required) VALUES
  (v_district, oc_fight1, 1, 'all', 'detention', 'iss', 'iss', 1, 3, ARRAY['parent_conference','conflict_resolution'], false),
  (v_district, oc_fight1, 2, 'all', 'iss', 'oss', 'iss', 2, 5, ARRAY['parent_conference','conflict_resolution','anger_management'], true),
  (v_district, oc_fight1, 3, 'all', 'oss', 'daep', 'oss', 3, 10, ARRAY['parent_conference','threat_assessment','counseling_referral'], true);

  -- Fighting - With Injury
  INSERT INTO discipline_matrix (district_id, offense_code_id, occurrence, grade_group, min_consequence, max_consequence, default_consequence, consequence_days_min, consequence_days_max, required_supports, transition_plan_required) VALUES
  (v_district, oc_fight2, 1, 'all', 'oss', 'daep', 'oss', 3, 10, ARRAY['parent_conference','threat_assessment','anger_management'], true),
  (v_district, oc_fight2, 2, 'all', 'daep', 'daep', 'daep', 30, 45, ARRAY['parent_conference','threat_assessment','counseling_referral','transition_plan'], true);

  -- Insubordination
  INSERT INTO discipline_matrix (district_id, offense_code_id, occurrence, grade_group, min_consequence, max_consequence, default_consequence, consequence_days_min, consequence_days_max, required_supports) VALUES
  (v_district, oc_defy1, 1, 'all', 'warning', 'detention', 'warning', 0, 1, ARRAY['parent_notification','teacher_conference']),
  (v_district, oc_defy1, 2, 'all', 'detention', 'iss', 'detention', 1, 2, ARRAY['parent_conference','behavior_contract']),
  (v_district, oc_defy1, 3, 'all', 'iss', 'oss', 'iss', 1, 3, ARRAY['parent_conference','counseling_referral']);

  -- Disruptive Behavior
  INSERT INTO discipline_matrix (district_id, offense_code_id, occurrence, grade_group, min_consequence, max_consequence, default_consequence, consequence_days_min, consequence_days_max, required_supports) VALUES
  (v_district, oc_defy2, 1, 'all', 'warning', 'detention', 'warning', 0, 1, ARRAY['parent_notification']),
  (v_district, oc_defy2, 2, 'all', 'detention', 'iss', 'detention', 1, 2, ARRAY['parent_conference','behavior_contract']);

  -- Bullying
  INSERT INTO discipline_matrix (district_id, offense_code_id, occurrence, grade_group, min_consequence, max_consequence, default_consequence, consequence_days_min, consequence_days_max, required_supports, transition_plan_required) VALUES
  (v_district, oc_bully1, 1, 'all', 'iss', 'oss', 'iss', 2, 5, ARRAY['parent_conference','anti_bullying_program','victim_support'], false),
  (v_district, oc_bully1, 2, 'all', 'oss', 'daep', 'oss', 3, 10, ARRAY['parent_conference','anti_bullying_program','counseling_referral'], true);

  -- Vaping (nicotine)
  INSERT INTO discipline_matrix (district_id, offense_code_id, occurrence, grade_group, min_consequence, max_consequence, default_consequence, consequence_days_min, consequence_days_max, required_supports) VALUES
  (v_district, oc_vape1, 1, 'all', 'detention', 'iss', 'detention', 1, 3, ARRAY['parent_notification','substance_education']),
  (v_district, oc_vape1, 2, 'all', 'iss', 'oss', 'iss', 2, 5, ARRAY['parent_conference','substance_counseling']);

  -- Theft - Minor
  INSERT INTO discipline_matrix (district_id, offense_code_id, occurrence, grade_group, min_consequence, max_consequence, default_consequence, consequence_days_min, consequence_days_max, required_supports) VALUES
  (v_district, oc_theft1, 1, 'all', 'detention', 'iss', 'detention', 1, 2, ARRAY['parent_notification','restitution','restorative_conference']),
  (v_district, oc_theft1, 2, 'all', 'iss', 'oss', 'iss', 2, 3, ARRAY['parent_conference','counseling_referral','restitution']);

  -- Marijuana
  INSERT INTO discipline_matrix (district_id, offense_code_id, occurrence, grade_group, min_consequence, max_consequence, default_consequence, consequence_days_min, consequence_days_max, required_supports, transition_plan_required) VALUES
  (v_district, oc_drug3, 1, 'all', 'daep', 'daep', 'daep', 30, 45, ARRAY['parent_conference','substance_assessment','drug_testing','counseling_referral'], true);
END $$;

-- ============================================
-- 7. ALERTS (auto-generated by trigger + manual)
-- The repeat offender trigger should have fired
-- for Marcus Johnson's 3rd incident. Let's also
-- add a manual alert for visibility.
-- ============================================
INSERT INTO alerts (district_id, campus_id, student_id, alert_level, trigger_type, trigger_description, status, suggested_interventions)
VALUES
-- Red alert: Marcus has 3 ISS in 30 days (if trigger didn't fire, this ensures data exists)
('11111111-1111-1111-1111-111111111111', 'aaaa0001-0001-0001-0001-000000000001', 'bbbb0001-0001-0001-0001-000000000001', 'red', 'iss_frequency', '3 ISS placements in last 30 days - pattern of escalating behavior', 'active',
 ARRAY['Anger Management Group', 'Check-In/Check-Out (CICO)', 'Individual Counseling']),

-- Yellow alert: Marcus same offense repeat
('11111111-1111-1111-1111-111111111111', 'aaaa0001-0001-0001-0001-000000000001', 'bbbb0001-0001-0001-0001-000000000001', 'yellow', 'offense_repeat', 'Fighting offense committed 2 times this school year', 'acknowledged',
 ARRAY['Conflict Resolution Counseling', 'Restorative Conference']),

-- Yellow alert: Jayden homeless student with incident
('11111111-1111-1111-1111-111111111111', 'aaaa0001-0001-0001-0001-000000000001', 'bbbb0001-0001-0001-0001-000000000007', 'yellow', 'referral_frequency', 'Homeless student with behavioral incident - requires additional support review', 'active',
 ARRAY['Mentoring Program', 'Wraparound Services', 'Individual Counseling']);

-- ============================================
-- 8. STUDENT INTERVENTIONS (linked to plans)
-- ============================================
DO $$
DECLARE
  int_cico UUID;
  int_anger UUID;
  int_conflict UUID;
  int_substance UUID;
  int_individual UUID;
  int_mentor UUID;
BEGIN
  SELECT id INTO int_cico FROM interventions WHERE name = 'Check-In/Check-Out (CICO)' LIMIT 1;
  SELECT id INTO int_anger FROM interventions WHERE name = 'Anger Management Group' LIMIT 1;
  SELECT id INTO int_conflict FROM interventions WHERE name = 'Conflict Resolution Counseling' LIMIT 1;
  SELECT id INTO int_substance FROM interventions WHERE name = 'Substance Abuse Counseling' LIMIT 1;
  SELECT id INTO int_individual FROM interventions WHERE name = 'Individual Counseling' LIMIT 1;
  SELECT id INTO int_mentor FROM interventions WHERE name = 'Mentoring Program' LIMIT 1;

  -- Marcus Johnson's plan interventions
  INSERT INTO student_interventions (district_id, student_id, intervention_id, plan_id, assigned_by, start_date, end_date, status, effectiveness_rating) VALUES
  ('11111111-1111-1111-1111-111111111111', 'bbbb0001-0001-0001-0001-000000000001', int_cico, 'dddd0001-0001-0001-0001-000000000001', '00000000-0000-0000-0000-000000000001', '2025-11-13', '2026-01-12', 'active', NULL),
  ('11111111-1111-1111-1111-111111111111', 'bbbb0001-0001-0001-0001-000000000001', int_anger, 'dddd0001-0001-0001-0001-000000000001', '00000000-0000-0000-0000-000000000001', '2025-11-13', '2025-12-25', 'active', NULL),
  ('11111111-1111-1111-1111-111111111111', 'bbbb0001-0001-0001-0001-000000000001', int_conflict, 'dddd0001-0001-0001-0001-000000000001', '00000000-0000-0000-0000-000000000001', '2025-11-13', '2025-12-13', 'active', NULL);

  -- Tyler Williams' DAEP plan interventions
  INSERT INTO student_interventions (district_id, student_id, intervention_id, plan_id, assigned_by, start_date, end_date, status, effectiveness_rating) VALUES
  ('11111111-1111-1111-1111-111111111111', 'bbbb0001-0001-0001-0001-000000000003', int_substance, 'dddd0001-0001-0001-0001-000000000002', '00000000-0000-0000-0000-000000000001', '2025-10-23', '2026-01-21', 'active', NULL),
  ('11111111-1111-1111-1111-111111111111', 'bbbb0001-0001-0001-0001-000000000003', int_individual, 'dddd0001-0001-0001-0001-000000000002', '00000000-0000-0000-0000-000000000001', '2025-10-23', '2026-01-21', 'active', NULL),
  ('11111111-1111-1111-1111-111111111111', 'bbbb0001-0001-0001-0001-000000000003', int_mentor, 'dddd0001-0001-0001-0001-000000000002', '00000000-0000-0000-0000-000000000001', '2025-10-23', '2026-01-21', 'active', NULL);
END $$;

-- ============================================
-- SETUP INSTRUCTIONS
-- ============================================
-- After running all migrations (001-007):
--
-- 1. Go to Supabase Dashboard → Authentication → Users
-- 2. Click "Add User" → create a user with your email/password
-- 3. Copy the user's UUID from the Users table
-- 4. Run this SQL (replacing YOUR_USER_UUID):
--
--    UPDATE profiles
--    SET district_id = '11111111-1111-1111-1111-111111111111',
--        role = 'admin',
--        full_name = 'Your Name'
--    WHERE id = 'YOUR_USER_UUID';
--
--    INSERT INTO profile_campus_assignments (profile_id, campus_id, is_primary) VALUES
--    ('YOUR_USER_UUID', 'aaaa0001-0001-0001-0001-000000000001', true),
--    ('YOUR_USER_UUID', 'aaaa0001-0001-0001-0001-000000000002', false),
--    ('YOUR_USER_UUID', 'aaaa0001-0001-0001-0001-000000000003', false),
--    ('YOUR_USER_UUID', 'aaaa0001-0001-0001-0001-000000000004', false);
--
-- 5. Update the placeholder admin IDs in incidents/plans:
--
--    UPDATE incidents SET reported_by = 'YOUR_USER_UUID'
--    WHERE reported_by = '00000000-0000-0000-0000-000000000001';
--
--    UPDATE transition_plans SET created_by = 'YOUR_USER_UUID'
--    WHERE created_by = '00000000-0000-0000-0000-000000000001';
--
--    UPDATE student_interventions SET assigned_by = 'YOUR_USER_UUID'
--    WHERE assigned_by = '00000000-0000-0000-0000-000000000001';
--
-- 6. Navigate to http://localhost:5173/login and sign in!
-- ============================================
