-- ============================================================
-- Add role column to applications table
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- Add role column with default 'player'
ALTER TABLE applications
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'player';

-- Add a check constraint for valid roles
ALTER TABLE applications
DROP CONSTRAINT IF EXISTS applications_role_check;

ALTER TABLE applications
ADD CONSTRAINT applications_role_check
CHECK (role IN ('player', 'coach', 'admin'));
