-- ============================================================
-- Ladder Tiers Migration
-- Adds club_id + tier columns to ladder_teams, ladder_challenges, ladder_history
-- Backfills all existing data as club_id='kg', tier='mens-elite'
-- ============================================================

-- 1. Add columns to ladder_teams
ALTER TABLE ladder_teams
  ADD COLUMN IF NOT EXISTS club_id TEXT DEFAULT 'kg',
  ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'mens-elite';

-- Backfill existing rows
UPDATE ladder_teams SET club_id = 'kg', tier = 'mens-elite' WHERE club_id IS NULL OR tier IS NULL;

-- Drop old unique constraint on rank (if exists) and add scoped one
ALTER TABLE ladder_teams DROP CONSTRAINT IF EXISTS ladder_teams_rank_key;
ALTER TABLE ladder_teams ADD CONSTRAINT ladder_teams_club_tier_rank_unique UNIQUE (club_id, tier, rank);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_ladder_teams_club_tier ON ladder_teams (club_id, tier);

-- 2. Add columns to ladder_challenges
ALTER TABLE ladder_challenges
  ADD COLUMN IF NOT EXISTS club_id TEXT DEFAULT 'kg',
  ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'mens-elite';

-- Backfill existing rows
UPDATE ladder_challenges SET club_id = 'kg', tier = 'mens-elite' WHERE club_id IS NULL OR tier IS NULL;

-- Index
CREATE INDEX IF NOT EXISTS idx_ladder_challenges_club_tier ON ladder_challenges (club_id, tier);

-- 3. Add columns to ladder_history
ALTER TABLE ladder_history
  ADD COLUMN IF NOT EXISTS club_id TEXT DEFAULT 'kg',
  ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'mens-elite';

-- Backfill existing rows
UPDATE ladder_history SET club_id = 'kg', tier = 'mens-elite' WHERE club_id IS NULL OR tier IS NULL;

-- Index
CREATE INDEX IF NOT EXISTS idx_ladder_history_club_tier ON ladder_history (club_id, tier);
