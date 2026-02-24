-- Activity Feed table for real-time social updates
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS activity_feed (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  type TEXT NOT NULL CHECK (type IN ('match_created','match_joined','booking','tournament_registered')),
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE activity_feed ENABLE ROW LEVEL SECURITY;

-- Anyone can read the feed
CREATE POLICY "Anyone can read feed" ON activity_feed
  FOR SELECT USING (true);

-- Authenticated users can insert their own activity
CREATE POLICY "Auth users can insert" ON activity_feed
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow all authenticated users to view court bookings (for availability checks)
-- Run only if this policy doesn't already exist on court_bookings
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'court_bookings' AND policyname = 'Auth users can view bookings'
  ) THEN
    CREATE POLICY "Auth users can view bookings" ON court_bookings
      FOR SELECT USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- IMPORTANT: After running this migration, enable Realtime on these tables
-- in your Supabase Dashboard → Database → Replication:
-- 1. activity_feed
-- 2. matches
-- 3. match_players
-- 4. court_bookings
