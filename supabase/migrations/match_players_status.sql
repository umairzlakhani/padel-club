-- Add status column to match_players for join-request approval flow
ALTER TABLE match_players
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'accepted'
  CHECK (status IN ('pending', 'accepted', 'declined'));

-- Index for fast creator lookups of pending requests
CREATE INDEX IF NOT EXISTS idx_match_players_match_status
  ON match_players (match_id, status);
