-- ═══════════════════════════════════════════════════════════════════════════
-- KG Ladder System — Doubles Ladder for Karachi Gymkhana
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── Ladder Teams ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ladder_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rank INTEGER NOT NULL,
  player1_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  player2_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  team_name TEXT,
  points INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'challenging', 'defending')),
  matches_played INTEGER DEFAULT 0,
  matches_won INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE (player1_id, player2_id),
  UNIQUE (rank)
);

-- ─── Ladder Challenges ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ladder_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_team_id UUID NOT NULL REFERENCES ladder_teams(id) ON DELETE CASCADE,
  defender_team_id UUID NOT NULL REFERENCES ladder_teams(id) ON DELETE CASCADE,
  challenger_rank INTEGER NOT NULL,
  defender_rank INTEGER NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'completed', 'declined', 'expired', 'pending_verification', 'disputed')),
  result TEXT CHECK (result IN ('challenger_won', 'defender_won')),
  scores JSONB,
  scheduled_date DATE,
  scheduled_time TEXT,
  venue TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '72 hours')
);

-- ─── Ladder History ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ladder_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID NOT NULL REFERENCES ladder_challenges(id) ON DELETE CASCADE,
  challenger_team_id UUID NOT NULL REFERENCES ladder_teams(id) ON DELETE CASCADE,
  defender_team_id UUID NOT NULL REFERENCES ladder_teams(id) ON DELETE CASCADE,
  result TEXT NOT NULL CHECK (result IN ('challenger_won', 'defender_won')),
  old_challenger_rank INTEGER NOT NULL,
  old_defender_rank INTEGER NOT NULL,
  new_challenger_rank INTEGER NOT NULL,
  new_defender_rank INTEGER NOT NULL,
  scores JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ─── RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE ladder_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE ladder_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE ladder_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read ladder_teams" ON ladder_teams FOR SELECT USING (true);
CREATE POLICY "Public read ladder_challenges" ON ladder_challenges FOR SELECT USING (true);
CREATE POLICY "Public read ladder_history" ON ladder_history FOR SELECT USING (true);
