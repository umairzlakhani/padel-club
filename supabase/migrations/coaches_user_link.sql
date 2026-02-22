-- Link coaches to auth users and add missing profile columns
ALTER TABLE coaches
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES applications(id) ON DELETE SET NULL UNIQUE,
  ADD COLUMN IF NOT EXISTS specialization TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS level TEXT DEFAULT 'Pro',
  ADD COLUMN IF NOT EXISTS initial TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS availability JSONB DEFAULT '[]';

ALTER TABLE coaches ENABLE ROW LEVEL SECURITY;

-- Anyone logged in can browse coaches
CREATE POLICY "Authenticated users can read coaches" ON coaches
  FOR SELECT USING (auth.role() = 'authenticated');

-- Coaches can insert their own record during registration
CREATE POLICY "Users can insert own coach record" ON coaches
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Coaches can update their own record
CREATE POLICY "Coaches can update own record" ON coaches
  FOR UPDATE USING (auth.uid() = user_id);
