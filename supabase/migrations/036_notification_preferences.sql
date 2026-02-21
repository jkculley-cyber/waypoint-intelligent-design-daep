-- Migration 036: Notification preferences per profile

CREATE TABLE IF NOT EXISTS notification_preferences (
  profile_id           UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  district_id          UUID REFERENCES districts(id),
  incident_submitted   BOOLEAN DEFAULT true,
  incident_approved    BOOLEAN DEFAULT true,
  incident_denied      BOOLEAN DEFAULT true,
  placement_reminders  BOOLEAN DEFAULT true,
  review_due_alerts    BOOLEAN DEFAULT true,
  updated_at           TIMESTAMPTZ DEFAULT now()
);

-- RLS: users manage their own preferences; admins can read district preferences
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_preferences" ON notification_preferences
  FOR ALL
  USING (profile_id = auth.uid())
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "admin_read" ON notification_preferences
  FOR SELECT
  USING (
    district_id = (SELECT district_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
  );
