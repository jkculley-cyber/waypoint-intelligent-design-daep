-- ============================================
-- Default Intervention Catalog
-- System-wide defaults (district_id = NULL)
-- ============================================

-- Tier 1: Universal / Classroom-level
INSERT INTO interventions (district_id, name, category, description, tier, target_population, recommended_duration_days, required_staff_role, evidence_level) VALUES
(NULL, 'Classroom Behavior Contract', 'behavioral', 'Written agreement between student and teacher outlining expected behaviors and consequences', 1, ARRAY['general','sped','ell'], 30, 'teacher', 'promising'),
(NULL, 'Positive Behavior Reinforcement', 'behavioral', 'Systematic reinforcement of desired behaviors through praise, tokens, or privileges', 1, ARRAY['general','sped'], 90, 'teacher', 'evidence-based'),
(NULL, 'De-escalation Techniques Training', 'behavioral', 'Teaching students self-regulation and de-escalation strategies', 1, ARRAY['general','sped','ell'], 30, 'counselor', 'evidence-based'),
(NULL, 'Parent Conference', 'behavioral', 'Meeting with parent/guardian to discuss behavior concerns and develop home-school plan', 1, ARRAY['general','sped','ell'], 1, 'teacher', 'promising'),
(NULL, 'Restorative Circle', 'restorative', 'Facilitated group discussion to address harm, build empathy, and restore relationships', 1, ARRAY['general','sped','ell'], 1, 'counselor', 'evidence-based'),
(NULL, 'Peer Tutoring', 'academic', 'Structured peer tutoring to address academic gaps contributing to behavioral issues', 1, ARRAY['general','sped','ell'], 45, 'teacher', 'evidence-based');

-- Tier 2: Targeted / Small Group
INSERT INTO interventions (district_id, name, category, description, tier, target_population, recommended_duration_days, required_staff_role, evidence_level) VALUES
(NULL, 'Check-In/Check-Out (CICO)', 'behavioral', 'Daily check-in with adult mentor in morning and check-out in afternoon with behavior tracking card', 2, ARRAY['general','sped'], 90, 'counselor', 'evidence-based'),
(NULL, 'Social Skills Small Group', 'social_emotional', 'Weekly small group instruction on social skills including communication, conflict resolution, and perspective-taking', 2, ARRAY['general','sped','ell'], 60, 'counselor', 'evidence-based'),
(NULL, 'Anger Management Group', 'social_emotional', 'Structured small group counseling focused on anger identification, triggers, and coping strategies', 2, ARRAY['general','sped'], 45, 'counselor', 'evidence-based'),
(NULL, 'Conflict Resolution Counseling', 'social_emotional', 'Individual or small group counseling focused on peaceful conflict resolution strategies', 2, ARRAY['general','sped','ell'], 30, 'counselor', 'evidence-based'),
(NULL, 'Peer Mediation', 'restorative', 'Trained peer mediators facilitate structured conversations between students in conflict', 2, ARRAY['general'], 1, 'counselor', 'promising'),
(NULL, 'Restorative Conference', 'restorative', 'Structured conference between offender, victim, and supporters to address harm and plan repair', 2, ARRAY['general','sped','ell'], 1, 'counselor', 'evidence-based'),
(NULL, 'Academic Tutoring/Support', 'academic', 'Targeted academic intervention to address skill gaps contributing to frustration and behavioral issues', 2, ARRAY['general','sped','ell'], 90, 'teacher', 'evidence-based'),
(NULL, 'Mentoring Program', 'mentoring', 'Regular meetings with an adult mentor to build relationship, set goals, and monitor progress', 2, ARRAY['general','sped','ell'], 90, 'counselor', 'evidence-based'),
(NULL, 'Substance Abuse Education', 'social_emotional', 'Educational program about effects of substances and healthy coping alternatives', 2, ARRAY['general','sped'], 30, 'counselor', 'promising'),
(NULL, 'Empathy Training', 'social_emotional', 'Structured activities to develop empathy and perspective-taking skills', 2, ARRAY['general','sped'], 30, 'counselor', 'promising');

-- Tier 3: Intensive / Individual
INSERT INTO interventions (district_id, name, category, description, tier, target_population, recommended_duration_days, required_staff_role, evidence_level) VALUES
(NULL, 'Individual Counseling', 'social_emotional', 'One-on-one counseling sessions addressing root behavioral causes', 3, ARRAY['general','sped'], 90, 'counselor', 'evidence-based'),
(NULL, 'Functional Behavior Assessment (FBA)', 'behavioral', 'Systematic assessment to identify the function of problem behavior and develop targeted interventions', 3, ARRAY['sped'], 30, 'sped_coordinator', 'evidence-based'),
(NULL, 'Behavior Intervention Plan (BIP)', 'behavioral', 'Individualized behavior plan based on FBA with specific strategies, supports, and data collection', 3, ARRAY['sped'], 90, 'sped_coordinator', 'evidence-based'),
(NULL, 'Modified BIP Implementation', 'behavioral', 'Revision and enhanced implementation of existing BIP with additional supports', 3, ARRAY['sped'], 90, 'sped_coordinator', 'evidence-based'),
(NULL, 'Wraparound Services', 'social_emotional', 'Comprehensive, individualized support plan involving school, family, and community resources', 3, ARRAY['general','sped'], 180, 'counselor', 'evidence-based'),
(NULL, 'Substance Abuse Counseling', 'social_emotional', 'Professional substance abuse counseling with licensed counselor', 3, ARRAY['general','sped'], 90, 'counselor', 'evidence-based'),
(NULL, 'Threat Assessment', 'behavioral', 'Formal threat assessment process per district protocol', 3, ARRAY['general','sped'], 7, 'principal', 'evidence-based'),
(NULL, 'Mental Health Referral', 'social_emotional', 'Referral to community mental health provider for ongoing therapy', 3, ARRAY['general','sped'], 180, 'counselor', 'evidence-based'),
(NULL, 'Crisis Intervention', 'social_emotional', 'Immediate crisis support and safety planning', 3, ARRAY['general','sped'], 7, 'counselor', 'evidence-based'),
(NULL, 'Drug Testing Plan', 'behavioral', 'Regular substance testing schedule as part of re-entry plan', 3, ARRAY['general'], 90, 'principal', 'promising'),
(NULL, 'Community Service / Restitution', 'restorative', 'Supervised community service or restitution activity to address harm caused', 2, ARRAY['general','sped','ell'], 30, 'counselor', 'promising'),
(NULL, 'Apology Letter / Reflection', 'restorative', 'Guided writing exercise reflecting on behavior, impact, and plan for change', 1, ARRAY['general','sped','ell'], 1, 'teacher', 'promising');
