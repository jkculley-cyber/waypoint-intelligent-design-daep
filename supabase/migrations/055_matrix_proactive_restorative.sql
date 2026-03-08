-- Migration 055: Add proactive_interventions and restorative_options to discipline_matrix

ALTER TABLE discipline_matrix
  ADD COLUMN IF NOT EXISTS proactive_interventions TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS restorative_options TEXT[] DEFAULT '{}';
