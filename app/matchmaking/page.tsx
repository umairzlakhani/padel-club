'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/app/components/BottomNav'

type OpenMatch = {
  id: string
  date: string
  time: string
  venue: string
  skill_min: number
  skill_max: number
  players: { name: string; initial: string; level: number }[]
  max_players: number
  creator_name: string
}

const MOCK_MATCHES: OpenMatch[] = [
  {
    id: '1',
    date: 'Tue, 11 Feb',
    time: '7:00 PM',
    venue: 'Legends Arena',
    skill_min: 2.0,
    skill_max: 3.0,
    players: [
      { name: 'Ali K.', initial: 'A', level: 2.5 },
      { name: 'Raza S.', initial: 'R', level: 2.3 },
      { name: 'Hassan M.', initial: 'H', level: 2.7 },
    ],
    max_players: 4,
    creator_name: 'Ali K.',
  },
  {
    id: '2',
    date: 'Wed, 12 Feb',
    time: '8:30 PM',
    venue: 'Viva Padel',
    skill_min: 2.5,
    skill_max: 3.5,
    players: [
      { name: 'Farhan M.', initial: 'F', level: 3.0 },
    ],
    max_players: 4,
    creator_name: 'Farhan M.',
  },
  {
    id: '3',
    date: 'Thu, 13 Feb',
    time: '6:00 PM',
    venue: 'Padelverse',
    skill_min: 1.5,
    skill_max: 2.5,
    players: [
      { name: 'Zain T.', initial: 'Z', level: 2.0 },
      { name: 'Omar R.', initial: 'O', level: 1.8 },
    ],
    max_players: 4,
    creator_name: 'Zain T.',
  },
  {
    id: '4',
    date: 'Fri, 14 Feb',
    time: '9:00 PM',
    venue: 'Greenwich Padel',
    skill_min: 2.0,
    skill_max: 3.0,
    players: [
      { name: 'Kabir A.', initial: 'K', level: 2.6 },
      { name: 'Saad L.', initial: 'S', level: 2.4 },
      { name: 'Bilal N.', initial: 'B', level: 2.8 },
      { name: 'Imran H.', initial: 'I', level: 2.5 },
    ],
    max_players: 4,
    creator_name: 'Kabir A.',
  },
]

function SkillBadge({ level }: { level: number }) {
  return (
    <span className="text-[9px] font-bold bg-[#00ff88]/10 text-[#00ff88] px-1.5 py-0.5 rounded">
      {level.toFixed(1)}
    </span>
  )
}

export default function MatchmakingPage() {
  const [userLevel, setUserLevel] = useState(2.5)
  const [matches, setMatches] = useState<OpenMatch[]>(MOCK_MATCHES)
  const [filter, setFilter] = useState<'all' | 'my-level'>('my-level')
  const [showCreate, setShowCreate] = useState(false)
  const [joinedMatch, setJoinedMatch] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('applications')
          .select('skill_level')
          .eq('id', user.id)
          .single()
        if (data?.skill_level) setUserLevel(parseFloat(data.skill_level))
      }

      // Try loading from Supabase matches table; fall back to mock data
      const { data: dbMatches, error } = await supabase
        .from('matches')
        .select('*')
        .eq('status', 'open')
        .order('date', { ascending: true })
      if (!error && dbMatches && dbMatches.length > 0) {
        // Transform DB rows to our shape when real table exists
        // For now, mock data is used
      }
    }
    load()
  }, [])

  const filtered = filter === 'my-level'
    ? matches.filter((m) => userLevel >= m.skill_min && userLevel <= m.skill_max)
    : matches

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex justify-center">
      <div className="w-full max-w-[480px] min-h-screen relative pb-24">
        {/* Header */}
        <div className="pt-12 pb-4 px-6">
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-2xl font-bold tracking-tight">Find a Match</h1>
            <div className="flex items-center gap-2">
              <span className="text-white/30 text-xs font-medium">Your level</span>
              <SkillBadge level={userLevel} />
            </div>
          </div>
          <p className="text-white/30 text-sm">Join an open match or create your own</p>
        </div>

        {/* Filter + Create */}
        <div className="px-6 flex items-center gap-3 mb-4">
          <div className="flex bg-white/5 rounded-lg p-0.5 flex-1">
            <button
              onClick={() => setFilter('my-level')}
              className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all ${
                filter === 'my-level' ? 'bg-[#00ff88] text-black' : 'text-white/40'
              }`}
            >
              My Level
            </button>
            <button
              onClick={() => setFilter('all')}
              className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all ${
                filter === 'all' ? 'bg-[#00ff88] text-black' : 'text-white/40'
              }`}
            >
              All Matches
            </button>
          </div>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="w-10 h-10 bg-[#00ff88] rounded-xl flex items-center justify-center hover:bg-[#00ff88]/90 transition-all shrink-0"
          >
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="black" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Create Match Form */}
        {showCreate && (
          <div className="mx-6 mb-4 bg-[#111] rounded-2xl border border-[#00ff88]/20 p-5 space-y-4">
            <h3 className="text-sm font-bold text-[#00ff88]">Create New Match</h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-white/30 uppercase font-semibold block mb-1">Date</label>
                <input
                  type="date"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-[#00ff88]/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-white/30 uppercase font-semibold block mb-1">Time</label>
                <input
                  type="time"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-[#00ff88]/50 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-white/30 uppercase font-semibold block mb-1">Venue</label>
              <select className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-[#00ff88]/50 focus:outline-none">
                <option value="">Select venue</option>
                <option>Legends Arena</option>
                <option>Viva Padel</option>
                <option>Padelverse</option>
                <option>Greenwich Padel</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-white/30 uppercase font-semibold block mb-1">Min Level</label>
                <input
                  type="number"
                  step="0.5"
                  min="1.0"
                  max="5.0"
                  defaultValue="2.0"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-[#00ff88]/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-white/30 uppercase font-semibold block mb-1">Max Level</label>
                <input
                  type="number"
                  step="0.5"
                  min="1.0"
                  max="5.0"
                  defaultValue="3.0"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-[#00ff88]/50 focus:outline-none"
                />
              </div>
            </div>
            <button className="w-full py-3 bg-[#00ff88] text-black font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-[#00ff88]/90 transition-all">
              Create Match
            </button>
          </div>
        )}

        {/* Match Cards */}
        <div className="px-6 space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="text-white/20 text-sm">No matches at your level right now</p>
              <p className="text-white/10 text-xs mt-1">Create one and others will join!</p>
            </div>
          )}
          {filtered.map((match) => {
            const spotsLeft = match.max_players - match.players.length
            const isFull = spotsLeft === 0
            const hasJoined = joinedMatch === match.id

            return (
              <div key={match.id} className="bg-[#111] rounded-2xl border border-white/5 overflow-hidden hover:border-white/10 transition-all">
                <div className="p-4">
                  {/* Venue + Time */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-bold">{match.venue}</h3>
                      <p className="text-white/30 text-xs mt-0.5">{match.date} · {match.time}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-semibold text-white/30 bg-white/5 px-2 py-1 rounded-md">
                        {match.skill_min.toFixed(1)} – {match.skill_max.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {/* Player Slots */}
                  <div className="flex items-center gap-2 mb-3">
                    {match.players.map((player, i) => (
                      <div
                        key={i}
                        className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-white/10 flex items-center justify-center"
                        title={`${player.name} (${player.level})`}
                      >
                        <span className="text-xs font-bold text-white/60">{player.initial}</span>
                      </div>
                    ))}
                    {Array.from({ length: spotsLeft }).map((_, i) => (
                      <div
                        key={`empty-${i}`}
                        className="w-10 h-10 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center"
                      >
                        <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.15)" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                    ))}
                    <span className="text-[10px] text-white/20 font-medium ml-auto">
                      {match.players.length}/{match.max_players} players
                    </span>
                  </div>

                  {/* Join Button */}
                  {hasJoined ? (
                    <button className="w-full py-2.5 bg-[#00ff88]/10 text-[#00ff88] font-bold rounded-xl text-xs uppercase tracking-wider border border-[#00ff88]/20">
                      Joined ✓
                    </button>
                  ) : isFull ? (
                    <button className="w-full py-2.5 bg-white/5 text-white/20 font-bold rounded-xl text-xs uppercase tracking-wider cursor-not-allowed">
                      Match Full
                    </button>
                  ) : (
                    <button
                      onClick={() => setJoinedMatch(match.id)}
                      className="w-full py-2.5 bg-[#00ff88] text-black font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-[#00ff88]/90 transition-all"
                    >
                      Join Match — {spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} left
                    </button>
                  )}
                </div>

                <div className="px-4 py-2 border-t border-white/5 bg-white/[0.01]">
                  <span className="text-[10px] text-white/20 font-medium">Created by {match.creator_name}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
