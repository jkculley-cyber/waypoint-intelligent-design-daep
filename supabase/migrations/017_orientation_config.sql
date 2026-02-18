-- Migration 017: Add orientation_scheduled_time to daep_placement_scheduling
-- Stores the selected time slot for orientation (e.g., '09:00', '13:00')
-- Orientation config (available_days, time_slots, max_per_slot) is stored
-- in the districts.settings JSONB column under key 'orientation_config'.

ALTER TABLE daep_placement_scheduling
  ADD COLUMN IF NOT EXISTS orientation_scheduled_time TEXT;
