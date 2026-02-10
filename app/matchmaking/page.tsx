'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/app/components/BottomNav'
import Toast from '@/app/components/Toast'

type PlayerInfo = { id: string; full_name: string; skill_level: number }

type OpenMatch = {
  id: string
  date: string
  time: string
  venue: string
  skill_min: number
  skill_max: number
  max_players: number
  current_players: number
  creator_id: string
  creator_name: string
  players: PlayerInfo[]
}

function SkillBadge({ level }: { level: number }) {
  return (
    <span className="text-[9px] font-bold bg-[#00ff88]/10 text-[#00ff88] px-1.5 py-0.5 rounded">
      {level.toFixed(1)}
    </span>
  )
}

export default function MatchmakingPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState('')
  const [userLevel, setUserLevel] = useState(2.5)
  const [matches, setMatches] = useState<OpenMatch[]>([])
  const [filter, setFilter] = useState<'all' | 'my-level'>('my-level')
  const [showCreate, setShowCreate] = useState(false)
  const [joinedMatchIds, setJoinedMatchIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [joining, setJoining] = useState<string | null>(null)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })

  // Create match form state
  const [newDate, setNewDate] = useState('')
  const [newTime, setNewTime] = useState('')
  const [newVenue, setNewVenue] = useState('')
  const [newSkillMin, setNewSkillMin] = useState('2.0')
  const [newSkillMax, setNewSkillMax] = useState('3.0')
  const [creating, setCreating] = useState(false)

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type })
  }, [])

  const loadMatches = useCallback(async (currentUserId: string | null) => {
    // Fetch open matches
    const { data: dbMatches, error } = await supabase
      .from('matches')
      .select('*')
      .in('status', ['open', 'full'])
      .order('date', { ascending: true })

    if (error || !dbMatches) {
      setLoading(false)
      return
    }

    // For each match, fetch its players
    const matchesWithPlayers: OpenMatch[] = await Promise.all(
      dbMatches.map(async (m: any) => {
        // Get players in this match
        const { data: mpData } = await supabase
          .from('match_players')
          .select('player_id')
          .eq('match_id', m.id)

        const playerIds = (mpData || []).map((mp: any) => mp.player_id)

        // Get player details
        let players: PlayerInfo[] = []
        if (playerIds.length > 0) {
          const { data: playerData } = await supabase
            .from('applications')
            .select('id, full_name, skill_level')
            .in('id', playerIds)
          players = (playerData || []).map((p: any) => ({
            id: p.id,
            full_name: p.full_name,
            skill_level: parseFloat(p.skill_level) || 2.5,
          }))
        }

        // Get creator name
        const { data: creatorData } = await supabase
          .from('applications')
          .select('full_name')
          .eq('id', m.creator_id)
          .single()

        return {
          id: m.id,
          date: new Date(m.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }),
          time: m.time,
          venue: m.venue,
          skill_min: parseFloat(m.skill_min),
          skill_max: parseFloat(m.skill_max),
          max_players: m.max_players,
          current_players: m.current_players,
          creator_id: m.creator_id,
          creator_name: creatorData?.full_name || 'Unknown',
          players,
        }
      })
    )

    setMatches(matchesWithPlayers)

    // Track which matches current user has joined
    if (currentUserId) {
      const joined = new Set<string>()
      matchesWithPlayers.forEach((m) => {
        if (m.players.some((p) => p.id === currentUserId)) {
          joined.add(m.id)
        }
      })
      setJoinedMatchIds(joined)
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        const { data } = await supabase
          .from('applications')
          .select('full_name, skill_level')
          .eq('id', user.id)
          .single()
        if (data) {
          setUserName(data.full_name || '')
          if (data.skill_level) setUserLevel(parseFloat(data.skill_level))
        }
      }
      await loadMatches(user?.id || null)
    }
    init()
  }, [loadMatches])

  async function handleJoinMatch(matchId: string) {
    if (!userId) {
      showToast('Please sign in to join a match', 'error')
      return
    }
    setJoining(matchId)
    try {
      // Insert into match_players
      const { error: joinError } = await supabase
        .from('match_players')
        .insert({ match_id: matchId, player_id: userId })

      if (joinError) {
        if (joinError.code === '23505') {
          showToast('You already joined this match', 'error')
        } else {
          showToast('Failed to join match', 'error')
        }
        setJoining(null)
        return
      }

      // Increment current_players on the match
      const match = matches.find((m) => m.id === matchId)
      if (match) {
        const newCount = match.current_players + 1
        const newStatus = newCount >= match.max_players ? 'full' : 'open'
        await supabase
          .from('matches')
          .update({ current_players: newCount, status: newStatus })
          .eq('id', matchId)
      }

      showToast('You joined the match!')
      setJoinedMatchIds(new Set([...joinedMatchIds, matchId]))
      await loadMatches(userId)
    } catch {
      showToast('Something went wrong', 'error')
    }
    setJoining(null)
  }

  async function handleCreateMatch() {
    if (!userId) {
      showToast('Please sign in to create a match', 'error')
      return
    }
    if (!newDate || !newTime || !newVenue) {
      showToast('Please fill in all fields', 'error')
      return
    }
    setCreating(true)
    try {
      // Insert the match
      const { data: newMatch, error } = await supabase
        .from('matches')
        .insert({
          creator_id: userId,
          date: newDate,
          time: newTime,
          venue: newVenue,
          skill_min: parseFloat(newSkillMin),
          skill_max: parseFloat(newSkillMax),
          max_players: 4,
          current_players: 1,
          status: 'open',
        })
        .select()
        .single()

      if (error) {
        showToast('Failed to create match', 'error')
        setCreating(false)
        return
      }

      // Add creator as first player
      await supabase
        .from('match_players')
        .insert({ match_id: newMatch.id, player_id: userId })

      showToast('Match created! Others can now join.')
      setShowCreate(false)
      setNewDate('')
      setNewTime('')
      setNewVenue('')
      await loadMatches(userId)
    } catch {
      showToast('Something went wrong', 'error')
    }
    setCreating(false)
  }

  const filtered = filter === 'my-level'
    ? matches.filter((m) => userLevel >= m.skill_min && userLevel <= m.skill_max)
    : matches

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
          <span className="text-white/40 text-sm font-medium">Loading matches...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex justify-center">
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast((t) => ({ ...t, visible: false }))} />
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
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-[#00ff88]/50 focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[10px] text-white/30 uppercase font-semibold block mb-1">Time</label>
                <input
                  type="time"
                  value={newTime}
                  onChange={(e) => setNewTime(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-[#00ff88]/50 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-white/30 uppercase font-semibold block mb-1">Venue</label>
              <select
                value={newVenue}
                onChange={(e) => setNewVenue(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-[#00ff88]/50 focus:outline-none"
              >
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
                  value={newSkillMin}
                  onChange={(e) => setNewSkillMin(e.target.value)}
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
                  value={newSkillMax}
                  onChange={(e) => setNewSkillMax(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:border-[#00ff88]/50 focus:outline-none"
                />
              </div>
            </div>
            <button
              onClick={handleCreateMatch}
              disabled={creating}
              className="w-full py-3 bg-[#00ff88] text-black font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-[#00ff88]/90 transition-all disabled:opacity-50"
            >
              {creating ? 'Creating...' : 'Create Match'}
            </button>
          </div>
        )}

        {/* Match Cards */}
        <div className="px-6 space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="text-white/20 text-sm">No matches found</p>
              <p className="text-white/10 text-xs mt-1">Create one and others will join!</p>
            </div>
          )}
          {filtered.map((match) => {
            const spotsLeft = match.max_players - match.current_players
            const isFull = spotsLeft <= 0
            const hasJoined = joinedMatchIds.has(match.id)
            const isJoining = joining === match.id

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
                    {match.players.map((player) => (
                      <div
                        key={player.id}
                        className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-white/10 flex items-center justify-center"
                        title={`${player.full_name} (${player.skill_level})`}
                      >
                        <span className="text-xs font-bold text-white/60">{player.full_name?.charAt(0) || '?'}</span>
                      </div>
                    ))}
                    {Array.from({ length: Math.max(0, spotsLeft) }).map((_, i) => (
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
                      {match.current_players}/{match.max_players} players
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
                      onClick={() => handleJoinMatch(match.id)}
                      disabled={isJoining}
                      className="w-full py-2.5 bg-[#00ff88] text-black font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-[#00ff88]/90 transition-all disabled:opacity-50"
                    >
                      {isJoining ? 'Joining...' : `Join Match — ${spotsLeft} ${spotsLeft === 1 ? 'spot' : 'spots'} left`}
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
