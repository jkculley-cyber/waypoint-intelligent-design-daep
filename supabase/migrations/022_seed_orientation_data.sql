-- Migration 022: Seed orientation records for existing active DAEP placements
-- Creates daep_placement_scheduling rows so orientation schedule page and
-- student kiosk behavior goals are populated with real demo data.
--
-- Today's demo date: 2026-02-17
-- Student kiosk IDs to test:
--   LS-10001 (Marcus Johnson)  — completed orientation, goals show on kiosk
--   LS-10003 (Tyler Williams)  — completed orientation, goals show on kiosk
--   LS-10004 (Aaliyah Brown)   — completed orientation, goals show on kiosk
--   LS-20004 (Carlos Hernandez)— orientation scheduled 2026-02-18 (tomorrow)
--   LS-10002 (Sofia Garcia)    — orientation scheduled 2026-02-19
--   LS-20006 (DeShawn Jackson) — needs scheduling (pending)

INSERT INTO daep_placement_scheduling (
  district_id, incident_id, student_id,
  ard_required, ard_status, ard_completed_date,
  orientation_status, orientation_scheduled_date, orientation_scheduled_time,
  orientation_completed_date, orientation_form_data
)
VALUES

-- ============================================================
-- 1. Tyler Williams (LS-10003) — SPED, drug possession
--    Incident 4 (cccc0001-0001-0001-0001-000000000004)
--    ARD required; orientation COMPLETED with form data
-- ============================================================
(
  '11111111-1111-1111-1111-111111111111',
  'cccc0001-0001-0001-0001-000000000004',
  'bbbb0001-0001-0001-0001-000000000003',
  true,
  'completed',
  '2026-01-14',
  'completed',
  '2026-01-15',
  '08:30',
  '2026-01-15',
  '{
    "reflection": "I made a bad decision bringing that to school. I knew it was wrong but I thought I wouldn''t get caught. I let down my teachers, my mom, and myself. I need to make better choices about who I spend time with and what I bring to school. I''m going to use this time at DAEP to get back on track with my classes and show that I can do the right thing.",
    "behavior_plan": [
      {
        "behavior": "Make better choices about peer influence and avoid situations involving substances",
        "supports": "Weekly check-ins with my counselor to talk through social pressures",
        "interventions": "Substance abuse education program, mentoring with a positive adult role model"
      },
      {
        "behavior": "Stay focused on academics and turn in all assignments on time",
        "supports": "Daily planner and teacher check-ins to keep me organized",
        "interventions": "Study skills support, tutoring during intervention period"
      },
      {
        "behavior": "Communicate when I am struggling instead of acting out",
        "supports": "Safe person at DAEP I can go to when feeling overwhelmed",
        "interventions": "CICO (Check-In/Check-Out), individual counseling sessions"
      }
    ],
    "completed_at": "2026-01-15"
  }'::jsonb
),

-- ============================================================
-- 2. Marcus Johnson (LS-10001) — fighting 2nd offense
--    Incident 16 (cccc0001-0001-0001-0001-000000000016)
--    Orientation COMPLETED with form data
-- ============================================================
(
  '11111111-1111-1111-1111-111111111111',
  'cccc0001-0001-0001-0001-000000000016',
  'bbbb0001-0001-0001-0001-000000000001',
  false,
  'pending',
  NULL,
  'completed',
  '2026-01-21',
  '09:00',
  '2026-01-21',
  '{
    "reflection": "I know that fighting is never the answer. I let my anger take over and I hurt someone. That is not who I want to be. I need to walk away when things get heated and find a better way to deal with how I feel. I am going to use anger management and really try to change how I react when I get upset.",
    "behavior_plan": [
      {
        "behavior": "Walk away from conflicts instead of responding with physical aggression",
        "supports": "Anger management group every Tuesday and Thursday",
        "interventions": "Conflict resolution counseling, de-escalation strategies taught by counselor"
      },
      {
        "behavior": "Use calming strategies when I feel myself getting angry",
        "supports": "Cue card in my binder with breathing techniques and self-talk prompts",
        "interventions": "CICO daily with behavior coach, individual counseling weekly"
      },
      {
        "behavior": "Maintain positive relationships with peers without physical altercations",
        "supports": "Peer mediation program and structured lunch schedule",
        "interventions": "Restorative conference with peer when ready, social skills group"
      }
    ],
    "completed_at": "2026-01-21"
  }'::jsonb
),

-- ============================================================
-- 3. Aaliyah Brown (LS-10004) — 504, drug possession
--    Incident 19 (cccc0001-0001-0001-0001-000000000019)
--    Orientation COMPLETED with form data
-- ============================================================
(
  '11111111-1111-1111-1111-111111111111',
  'cccc0001-0001-0001-0001-000000000019',
  'bbbb0001-0001-0001-0001-000000000004',
  false,
  'pending',
  NULL,
  'completed',
  '2025-12-03',
  '13:00',
  '2025-12-03',
  '{
    "reflection": "I was not thinking clearly about how serious this was. Having a 504 does not excuse what I did. I put myself and everyone around me at risk. I want to use this time to really understand why I made that choice and learn how to handle stress without turning to things that can get me in trouble.",
    "behavior_plan": [
      {
        "behavior": "Avoid situations and people associated with drug use",
        "supports": "Weekly counseling appointments to process social pressures",
        "interventions": "Substance awareness sessions, parent involvement meetings monthly"
      },
      {
        "behavior": "Use healthy coping strategies when I feel stressed",
        "supports": "Daily mood check-in with my assigned DAEP counselor",
        "interventions": "Individual counseling twice per week, mindfulness exercises"
      },
      {
        "behavior": "Attend all classes and maintain passing grades in all subjects",
        "supports": "504 accommodations reviewed and updated for DAEP setting",
        "interventions": "Academic progress monitoring weekly, teacher feedback form"
      }
    ],
    "completed_at": "2025-12-03"
  }'::jsonb
),

-- ============================================================
-- 4. Carlos Hernandez (LS-20004) — ELL, cyberbullying
--    Incident 18 (cccc0001-0001-0001-0001-000000000018)
--    Orientation SCHEDULED for 2026-02-18 (tomorrow)
-- ============================================================
(
  '11111111-1111-1111-1111-111111111111',
  'cccc0001-0001-0001-0001-000000000018',
  'bbbb0001-0001-0001-0001-000000000011',
  false,
  'pending',
  NULL,
  'scheduled',
  '2026-02-18',
  '09:00',
  NULL,
  NULL
),

-- ============================================================
-- 5. Sofia Garcia (LS-10002) — ELL, marijuana
--    Incident 17 (cccc0001-0001-0001-0001-000000000017)
--    Orientation SCHEDULED for 2026-02-19
-- ============================================================
(
  '11111111-1111-1111-1111-111111111111',
  'cccc0001-0001-0001-0001-000000000017',
  'bbbb0001-0001-0001-0001-000000000002',
  false,
  'pending',
  NULL,
  'scheduled',
  '2026-02-19',
  '13:00',
  NULL,
  NULL
),

-- ============================================================
-- 6. DeShawn Jackson (LS-20006) — SPED, fighting
--    Incident 20 (cccc0001-0001-0001-0001-000000000020)
--    ARD required; orientation PENDING (needs scheduling)
-- ============================================================
(
  '11111111-1111-1111-1111-111111111111',
  'cccc0001-0001-0001-0001-000000000020',
  'bbbb0001-0001-0001-0001-000000000013',
  true,
  'pending',
  NULL,
  'pending',
  NULL,
  NULL,
  NULL,
  NULL
)

ON CONFLICT (incident_id) DO UPDATE SET
  orientation_status            = EXCLUDED.orientation_status,
  orientation_scheduled_date    = EXCLUDED.orientation_scheduled_date,
  orientation_scheduled_time    = EXCLUDED.orientation_scheduled_time,
  orientation_completed_date    = EXCLUDED.orientation_completed_date,
  orientation_form_data         = EXCLUDED.orientation_form_data,
  ard_required                  = EXCLUDED.ard_required,
  ard_status                    = EXCLUDED.ard_status,
  ard_completed_date            = EXCLUDED.ard_completed_date;
