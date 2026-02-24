-- Friends system
-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS friends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID REFERENCES applications(id) ON DELETE CASCADE NOT NULL,
  addressee_id UUID REFERENCES applications(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(requester_id, addressee_id)
);

ALTER TABLE friends ENABLE ROW LEVEL SECURITY;

-- Both parties can read their friendships
CREATE POLICY "Users can read own friendships" ON friends
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Authenticated users can send friend requests
CREATE POLICY "Users can send friend requests" ON friends
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

-- Only addressee can accept/decline
CREATE POLICY "Addressee can update friendship" ON friends
  FOR UPDATE USING (auth.uid() = addressee_id);

-- Either party can unfriend
CREATE POLICY "Either party can delete friendship" ON friends
  FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Allow match creators to delete their own matches
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'matches' AND policyname = 'Creators can delete matches'
  ) THEN
    CREATE POLICY "Creators can delete matches" ON matches
      FOR DELETE USING (auth.uid() = creator_id);
  END IF;
END $$;

-- Expand activity_feed type constraint to include new types
ALTER TABLE activity_feed DROP CONSTRAINT IF EXISTS activity_feed_type_check;
ALTER TABLE activity_feed ADD CONSTRAINT activity_feed_type_check
  CHECK (type IN ('match_created','match_joined','booking','tournament_registered','match_cancelled','friend_request'));

-- IMPORTANT: Enable Realtime on the friends table in Supabase Dashboard
