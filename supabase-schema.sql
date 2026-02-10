-- ============================================================
-- Karachi Padel Club — Full Database Schema
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- ─── 1. MATCHES (open matchmaking games) ─────────────────────
create table if not exists matches (
  id uuid default gen_random_uuid() primary key,
  creator_id uuid references applications(id) on delete cascade not null,
  date date not null,
  time text not null,
  venue text not null,
  skill_min numeric(2,1) not null default 1.0,
  skill_max numeric(2,1) not null default 5.0,
  max_players int not null default 4,
  current_players int not null default 1,
  status text not null default 'open' check (status in ('open', 'full', 'in_progress', 'completed', 'cancelled')),
  created_at timestamptz default now()
);

-- ─── 2. MATCH_PLAYERS (who joined each match) ───────────────
create table if not exists match_players (
  id uuid default gen_random_uuid() primary key,
  match_id uuid references matches(id) on delete cascade not null,
  player_id uuid references applications(id) on delete cascade not null,
  joined_at timestamptz default now(),
  unique(match_id, player_id)
);

-- ─── 3. COURT_BOOKINGS ──────────────────────────────────────
create table if not exists court_bookings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references applications(id) on delete cascade not null,
  club_id text not null,
  club_name text not null,
  date date not null,
  time_slot text not null,
  court_number int not null default 1,
  price int not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  created_at timestamptz default now(),
  unique(club_id, date, time_slot, court_number)
);

-- ─── 4. COACHES ──────────────────────────────────────────────
create table if not exists coaches (
  id text primary key,
  name text not null,
  specialization text not null,
  bio text,
  level text not null default 'Pro',
  rate int not null,
  initial text not null,
  availability jsonb not null default '[]'
);

-- Seed the three coaches
insert into coaches (id, name, specialization, bio, level, rate, initial, availability)
values
  ('nameer', 'Nameer Shamsi', 'Advanced Tactics & Strategy',
   'Former national-level player with 10+ years of coaching experience. Specializes in advanced shot placement, wall play, and competitive match strategy.',
   'Elite', 8000, 'NS',
   '[{"day":"Mon","slots":["5:00 PM","6:00 PM","7:00 PM"]},{"day":"Wed","slots":["5:00 PM","6:00 PM"]},{"day":"Fri","slots":["4:00 PM","5:00 PM","6:00 PM"]},{"day":"Sat","slots":["10:00 AM","11:00 AM","4:00 PM"]}]'),
  ('azhar', 'Azhar Katchi', 'Beginner & Intermediate Development',
   'Certified padel instructor focused on building strong fundamentals. Perfect for new players looking to develop proper technique and court awareness.',
   'Pro', 6000, 'AK',
   '[{"day":"Tue","slots":["6:00 PM","7:00 PM","8:00 PM"]},{"day":"Thu","slots":["5:00 PM","6:00 PM","7:00 PM"]},{"day":"Sat","slots":["9:00 AM","10:00 AM","11:00 AM"]}]'),
  ('farhan', 'Farhan Mustafa', 'Fitness & Power Game',
   'Combines physical conditioning with padel training. Specializes in building explosive power, endurance, and an aggressive playing style.',
   'Pro', 7000, 'FM',
   '[{"day":"Mon","slots":["7:00 PM","8:00 PM"]},{"day":"Wed","slots":["6:00 PM","7:00 PM","8:00 PM"]},{"day":"Fri","slots":["5:00 PM","6:00 PM"]},{"day":"Sun","slots":["10:00 AM","11:00 AM","12:00 PM"]}]')
on conflict (id) do nothing;

-- ─── 5. COACHING_BOOKINGS ────────────────────────────────────
create table if not exists coaching_bookings (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references applications(id) on delete cascade not null,
  coach_id text references coaches(id) on delete cascade not null,
  day text not null,
  time_slot text not null,
  date date,
  price int not null,
  status text not null default 'confirmed' check (status in ('confirmed', 'cancelled')),
  created_at timestamptz default now()
);

-- ─── 6. TOURNAMENTS ──────────────────────────────────────────
create table if not exists tournaments (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  date date not null,
  display_date text not null,
  venue text not null,
  format text not null,
  entry_fee int not null default 0,
  max_teams int not null default 16,
  registered_teams int not null default 0,
  status text not null default 'upcoming' check (status in ('upcoming', 'open', 'full', 'in_progress', 'completed')),
  description text,
  prize_pool text,
  created_at timestamptz default now()
);

-- ─── 7. TOURNAMENT_REGISTRATIONS ─────────────────────────────
create table if not exists tournament_registrations (
  id uuid default gen_random_uuid() primary key,
  tournament_id uuid references tournaments(id) on delete cascade not null,
  user_id uuid references applications(id) on delete cascade not null,
  registered_at timestamptz default now(),
  unique(tournament_id, user_id)
);

-- Seed tournaments
insert into tournaments (name, date, display_date, venue, format, entry_fee, max_teams, registered_teams, status, description, prize_pool)
values
  ('KPC Open — February Cup', '2026-02-22', 'Sat, 22 Feb 2026', 'Legends Arena, DHA Phase 6', 'Round Robin + Knockout', 5000, 16, 11, 'open',
   'The monthly flagship tournament of the Karachi Padel Circuit. Open to all skill levels with seeded brackets.', 'PKR 50,000'),
  ('Beginners Bash 2.0', '2026-03-02', 'Sun, 2 Mar 2026', 'Viva Padel, Clifton', 'Round Robin', 3000, 12, 7, 'open',
   'Exclusive tournament for players rated 1.0-2.5. Great atmosphere, perfect for your first competitive experience.', 'PKR 25,000'),
  ('Corporate Challenge', '2026-03-14', 'Fri, 14 Mar 2026', 'Greenwich Padel, DHA Phase 8', 'Knockout', 10000, 8, 8, 'full',
   'Inter-company padel showdown. Register as a corporate pair and compete for the Corporate Cup.', 'PKR 100,000'),
  ('KPC Pro Series — March', '2026-03-22', 'Sat, 22 Mar 2026', 'Padelverse, Bukhari Commercial', 'Double Elimination', 8000, 16, 3, 'upcoming',
   'High-level competitive tournament for players rated 3.5+. Streamed live on KPC social channels.', 'PKR 75,000'),
  ('Valentine Mixer', '2026-02-15', 'Sat, 15 Feb 2026', 'Legends Arena, DHA Phase 6', 'Mixed Doubles Round Robin', 6000, 12, 12, 'full',
   'Mixed doubles tournament with randomized partner assignments. Social event with dinner included.', 'PKR 40,000')
on conflict do nothing;

-- ─── 8. ROW-LEVEL SECURITY ───────────────────────────────────
-- Enable RLS on all tables
alter table matches enable row level security;
alter table match_players enable row level security;
alter table court_bookings enable row level security;
alter table coaches enable row level security;
alter table coaching_bookings enable row level security;
alter table tournaments enable row level security;
alter table tournament_registrations enable row level security;

-- Matches: anyone authenticated can read, creators can insert
create policy "Anyone can view open matches" on matches for select using (true);
create policy "Authenticated users can create matches" on matches for insert with check (auth.uid() = creator_id);
create policy "Creators can update their matches" on matches for update using (auth.uid() = creator_id);

-- Match players: anyone can read, authenticated users can join
create policy "Anyone can view match players" on match_players for select using (true);
create policy "Authenticated users can join matches" on match_players for insert with check (auth.uid() = player_id);
create policy "Players can leave matches" on match_players for delete using (auth.uid() = player_id);

-- Court bookings: users see their own, can create their own
create policy "Users can view their bookings" on court_bookings for select using (auth.uid() = user_id);
create policy "Users can create bookings" on court_bookings for insert with check (auth.uid() = user_id);

-- Coaches: everyone can read
create policy "Anyone can view coaches" on coaches for select using (true);

-- Coaching bookings: users manage their own
create policy "Users can view their coaching bookings" on coaching_bookings for select using (auth.uid() = user_id);
create policy "Users can book coaching sessions" on coaching_bookings for insert with check (auth.uid() = user_id);

-- Tournaments: everyone can read
create policy "Anyone can view tournaments" on tournaments for select using (true);
create policy "Admin can update tournaments" on tournaments for update using (true);

-- Tournament registrations: users manage their own
create policy "Users can view their registrations" on tournament_registrations for select using (auth.uid() = user_id);
create policy "Users can register for tournaments" on tournament_registrations for insert with check (auth.uid() = user_id);
