'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { CLUBS } from '@/lib/clubs'
import { hapticLight, hapticMedium, hapticSuccess } from '@/lib/haptics'
import BottomNav from '@/app/components/BottomNav'
import Toast from '@/app/components/Toast'

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 30 } } }

type PlayerInfo = { id: string; full_name: string; skill_level: number }

type MatchCard = {
  id: string
  date: string
  date_raw: string
  time: string
  venue: string
  skill_min: number
  skill_max: number
  max_players: number
  current_players: number
  creator_id: string
  creator_name: string
  players: PlayerInfo[]
  created_at: string
  user_status: 'none' | 'creator' | 'pending' | 'accepted'
}

type PendingRequest = {
  match_id: string
  player_id: string
  player_name: string
  player_level: number
  venue: string
  date: string
  time: string
}

function SkillBadge({ level }: { level: number }) {
  return (
    <span className="text-[9px] font-bold bg-[#00ff88]/10 text-[#00ff88] px-1.5 py-0.5 rounded">
      {level.toFixed(1)}
    </span>
  )
}

function StatusBadge({ status }: { status: MatchCard['user_status'] }) {
  if (status === 'creator') return (
    <span className="text-[9px] font-bold bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full uppercase">Your Match</span>
  )
  if (status === 'pending') return (
    <span className="text-[9px] font-bold bg-yellow-500/10 text-yellow-400 px-2 py-0.5 rounded-full uppercase">Pending</span>
  )
  if (status === 'accepted') return (
    <span className="text-[9px] font-bold bg-[#00ff88]/10 text-[#00ff88] px-2 py-0.5 rounded-full uppercase">Joined</span>
  )
  return null
}

type DateFilter = 'all' | 'today' | 'tomorrow' | 'week'

export default function MatchmakingPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState('')
  const [userLevel, setUserLevel] = useState(2.5)
  const [allMatches, setAllMatches] = useState<MatchCard[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })
  const [showRequests, setShowRequests] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  // Filters
  const [clubFilter, setClubFilter] = useState('all')
  const [skillFilter, setSkillFilter] = useState('all')
  const [dateFilter, setDateFilter] = useState<DateFilter>('all')
  const [openFilter, setOpenFilter] = useState<'club' | 'skill' | 'date' | null>(null)

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

  const loadMatches = useCallback(async (uid: string) => {
    const today = new Date().toISOString().split('T')[0]

    // Fetch ALL open matches where date >= today
    const { data: dbMatches, error } = await supabase
      .from('matches')
      .select('*')
      .in('status', ['open', 'full'])
      .gte('date', today)
      .order('created_at', { ascending: false })

    if (error || !dbMatches) {
      setLoading(false)
      return
    }

    // Get user's match_players status for all matches
    const matchIds = dbMatches.map((m: any) => m.id)
    const { data: myPlays } = await supabase
      .from('match_players')
      .select('match_id, status')
      .eq('player_id', uid)
      .in('match_id', matchIds)

    const myPlayMap: Record<string, string> = {}
    ;(myPlays || []).forEach((mp: any) => { myPlayMap[mp.match_id] = mp.status })

    // Fetch all match_players for accepted players
    const { data: allMpData } = await supabase
      .from('match_players')
      .select('match_id, player_id')
      .in('match_id', matchIds)
      .eq('status', 'accepted')

    // Group player IDs by match
    const matchPlayerIds: Record<string, string[]> = {}
    ;(allMpData || []).forEach((mp: any) => {
      if (!matchPlayerIds[mp.match_id]) matchPlayerIds[mp.match_id] = []
      matchPlayerIds[mp.match_id].push(mp.player_id)
    })

    // Collect all unique player IDs
    const allPlayerIds = [...new Set((allMpData || []).map((mp: any) => mp.player_id))]
    const allCreatorIds = [...new Set(dbMatches.map((m: any) => m.creator_id))]
    const uniqueIds = [...new Set([...allPlayerIds, ...allCreatorIds])]

    // Batch fetch all player/creator info
    let playerMap: Record<string, { full_name: string; skill_level: number }> = {}
    if (uniqueIds.length > 0) {
      const { data: playerData } = await supabase
        .from('applications')
        .select('id, full_name, skill_level')
        .in('id', uniqueIds)
      ;(playerData || []).forEach((p: any) => {
        playerMap[p.id] = { full_name: p.full_name || 'Unknown', skill_level: parseFloat(p.skill_level) || 2.5 }
      })
    }

    const matchCards: MatchCard[] = dbMatches.map((m: any) => {
      const pIds = matchPlayerIds[m.id] || []
      const players: PlayerInfo[] = pIds.map((pid) => ({
        id: pid,
        full_name: playerMap[pid]?.full_name || 'Unknown',
        skill_level: playerMap[pid]?.skill_level || 2.5,
      }))

      let user_status: MatchCard['user_status'] = 'none'
      if (m.creator_id === uid) user_status = 'creator'
      else if (myPlayMap[m.id] === 'accepted') user_status = 'accepted'
      else if (myPlayMap[m.id] === 'pending') user_status = 'pending'

      return {
        id: m.id,
        date: new Date(m.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }),
        date_raw: m.date,
        time: m.time,
        venue: m.venue,
        skill_min: parseFloat(m.skill_min),
        skill_max: parseFloat(m.skill_max),
        max_players: m.max_players,
        current_players: m.current_players,
        creator_id: m.creator_id,
        creator_name: playerMap[m.creator_id]?.full_name || 'Unknown',
        players,
        created_at: m.created_at,
        user_status,
      }
    })

    setAllMatches(matchCards)
    setLoading(false)
  }, [])

  // Apply filters
  const filteredMatches = useMemo(() => {
    let result = [...allMatches]

    // Club filter
    if (clubFilter !== 'all') {
      result = result.filter((m) => m.venue === clubFilter)
    }

    // Skill filter
    if (skillFilter !== 'all') {
      if (skillFilter === 'beginner') result = result.filter((m) => m.skill_min < 3)
      else if (skillFilter === 'intermediate') result = result.filter((m) => m.skill_min >= 2 && m.skill_max <= 4.5)
      else if (skillFilter === 'advanced') result = result.filter((m) => m.skill_max >= 4)
    }

    // Date filter
    if (dateFilter !== 'all') {
      const now = new Date()
      const todayStr = now.toISOString().split('T')[0]
      const tomorrow = new Date(now)
      tomorrow.setDate(tomorrow.getDate() + 1)
      const tomorrowStr = tomorrow.toISOString().split('T')[0]
      const weekEnd = new Date(now)
      weekEnd.setDate(weekEnd.getDate() + 7)
      const weekEndStr = weekEnd.toISOString().split('T')[0]

      if (dateFilter === 'today') result = result.filter((m) => m.date_raw === todayStr)
      else if (dateFilter === 'tomorrow') result = result.filter((m) => m.date_raw === tomorrowStr)
      else if (dateFilter === 'week') result = result.filter((m) => m.date_raw >= todayStr && m.date_raw <= weekEndStr)
    }

    return result
  }, [allMatches, clubFilter, skillFilter, dateFilter])

  // Separate my matches and all matches
  const myMatches = filteredMatches.filter((m) => m.user_status === 'creator')
  const otherMatches = filteredMatches

  const loadPendingRequests = useCallback(async (uid: string) => {
    setRequestsLoading(true)
    const { data: userMatches } = await supabase
      .from('matches')
      .select('id, venue, date, time')
      .eq('creator_id', uid)
      .in('status', ['open', 'full'])

    if (!userMatches || userMatches.length === 0) {
      setPendingRequests([])
      setPendingCount(0)
      setRequestsLoading(false)
      return
    }

    const matchIds = userMatches.map((m: any) => m.id)
    const matchMap: Record<string, any> = {}
    userMatches.forEach((m: any) => { matchMap[m.id] = m })

    const { data: pending } = await supabase
      .from('match_players')
      .select('match_id, player_id')
      .in('match_id', matchIds)
      .eq('status', 'pending')

    if (!pending || pending.length === 0) {
      setPendingRequests([])
      setPendingCount(0)
      setRequestsLoading(false)
      return
    }

    const playerIds = [...new Set(pending.map((p: any) => p.player_id))]
    const { data: playerData } = await supabase
      .from('applications')
      .select('id, full_name, skill_level')
      .in('id', playerIds)

    const playerMap: Record<string, any> = {}
    playerData?.forEach((p: any) => { playerMap[p.id] = p })

    const requests: PendingRequest[] = pending.map((p: any) => {
      const match = matchMap[p.match_id]
      const player = playerMap[p.player_id]
      return {
        match_id: p.match_id,
        player_id: p.player_id,
        player_name: player?.full_name || 'Unknown',
        player_level: parseFloat(player?.skill_level) || 2.5,
        venue: match?.venue || '',
        date: match?.date ? new Date(match.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }) : '',
        time: match?.time || '',
      }
    })

    setPendingRequests(requests)
    setPendingCount(requests.length)
    setRequestsLoading(false)
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
          const level = parseFloat(data.skill_level) || 2.5
          setUserLevel(level)
          await Promise.all([
            loadMatches(user.id),
            loadPendingRequests(user.id),
          ])
          return
        }
      }
      setLoading(false)
    }
    init()
  }, [loadMatches, loadPendingRequests])

  // Real-time subscription
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel('matchmaking-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_players' }, () => {
        loadPendingRequests(userId)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, loadPendingRequests])

  async function handleAcceptRequest(req: PendingRequest) {
    if (!userId) return
    hapticMedium()

    try {
      const res = await fetch('/api/accept-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: req.match_id, player_id: req.player_id }),
      })
      const result = await res.json()
      if (!res.ok || result.error) {
        showToast(result.error || 'Failed to accept', 'error')
        return
      }

      // Activity feed (non-blocking)
      supabase.from('activity_feed').insert({
        user_id: req.player_id,
        type: 'join_accepted',
        title: `${req.player_name} was accepted to a match`,
        description: `${req.venue} · ${req.date} · ${req.time}`,
        metadata: { match_id: req.match_id, venue: req.venue },
      }).then(() => {})

      showToast(`${req.player_name} accepted!`)
      setPendingRequests((prev) => prev.filter((r) => !(r.match_id === req.match_id && r.player_id === req.player_id)))
      setPendingCount((c) => Math.max(0, c - 1))
      if (userId) loadMatches(userId)
    } catch {
      showToast('Failed to accept', 'error')
    }
  }

  async function handleDeclineRequest(req: PendingRequest) {
    hapticLight()

    try {
      const res = await fetch('/api/decline-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: req.match_id, player_id: req.player_id }),
      })
      const result = await res.json()
      if (!res.ok || result.error) {
        showToast(result.error || 'Failed to decline', 'error')
        return
      }
      showToast('Request declined')
      setPendingRequests((prev) => prev.filter((r) => !(r.match_id === req.match_id && r.player_id === req.player_id)))
      setPendingCount((c) => Math.max(0, c - 1))
    } catch {
      showToast('Failed to decline', 'error')
    }
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
    const today = new Date().toISOString().split('T')[0]
    if (newDate < today) {
      showToast('Date cannot be in the past', 'error')
      return
    }
    if (parseFloat(newSkillMin) >= parseFloat(newSkillMax)) {
      showToast('Min skill must be less than max skill', 'error')
      return
    }
    setCreating(true)
    try {
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

      await supabase
        .from('match_players')
        .insert({ match_id: newMatch.id, player_id: userId })

      await supabase.from('activity_feed').insert({
        user_id: userId,
        type: 'match_created',
        title: `${userName} is looking for a match`,
        description: `${newVenue} · ${new Date(newDate).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })} · ${newTime} · Level ${newSkillMin}–${newSkillMax}`,
        metadata: { match_id: newMatch.id, venue: newVenue },
      })

      hapticSuccess()
      showToast('Match created!')
      setShowCreate(false)
      setNewDate('')
      setNewTime('')
      setNewVenue('')
      router.push(`/match/${newMatch.id}`)
    } catch {
      showToast('Something went wrong', 'error')
    }
    setCreating(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
          <span className="text-white/40 text-sm font-medium">Finding matches...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex justify-center overflow-y-auto">
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast((t) => ({ ...t, visible: false }))} />
      <div className="w-full max-w-[480px] min-h-screen relative pb-24 page-transition">
        {/* Header */}
        <motion.div className="pt-12 pb-4 px-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring' as const, stiffness: 300, damping: 30 }}>
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-2xl font-bold tracking-tight">Find a Match</h1>
            <div className="flex items-center gap-2">
              {/* Requests bell */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => { setShowRequests(true); if (userId) loadPendingRequests(userId) }}
                className="relative w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/5"
              >
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {pendingCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </motion.button>
              {/* Create */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowCreate(true)}
                className="w-10 h-10 bg-[#00ff88] rounded-xl flex items-center justify-center"
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="black" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </motion.button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-white/30 text-sm">Your level:</span>
            <SkillBadge level={userLevel} />
          </div>
        </motion.div>

        {/* Filter Bar — 3 dropdown buttons */}
        <div className="px-6 mb-4 flex gap-2">
          {/* Club button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setOpenFilter(openFilter === 'club' ? null : 'club')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${
              clubFilter !== 'all' ? 'bg-[#00ff88] text-black' : 'bg-white/5 text-white/40 border border-white/5'
            }`}
          >
            {clubFilter === 'all' ? 'All Clubs' : clubFilter}
            <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </motion.button>

          {/* Skill button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setOpenFilter(openFilter === 'skill' ? null : 'skill')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${
              skillFilter !== 'all' ? 'bg-[#00ff88] text-black' : 'bg-white/5 text-white/40 border border-white/5'
            }`}
          >
            {skillFilter === 'all' ? 'All Levels' : skillFilter === 'beginner' ? 'Beginner' : skillFilter === 'intermediate' ? 'Intermediate' : 'Advanced'}
            <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </motion.button>

          {/* Date button */}
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => setOpenFilter(openFilter === 'date' ? null : 'date')}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-wider transition-all ${
              dateFilter !== 'all' ? 'bg-[#00ff88] text-black' : 'bg-white/5 text-white/40 border border-white/5'
            }`}
          >
            {dateFilter === 'all' ? 'All Dates' : dateFilter === 'today' ? 'Today' : dateFilter === 'tomorrow' ? 'Tomorrow' : 'This Week'}
            <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </motion.button>
        </div>

        {/* Filter Popup */}
        <AnimatePresence>
          {openFilter && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 z-[90]"
                onClick={() => setOpenFilter(null)}
              />
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="absolute left-6 right-6 z-[91] bg-[#1a1a1a] rounded-2xl border border-white/10 p-4 shadow-2xl"
                style={{ top: 160 }}
              >
                <h4 className="text-xs font-bold uppercase tracking-wider text-white/40 mb-3">
                  {openFilter === 'club' ? 'Select Club' : openFilter === 'skill' ? 'Select Level' : 'Select Date'}
                </h4>
                <div className="space-y-1.5">
                  {openFilter === 'club' && (
                    <>
                      <button
                        onClick={() => { setClubFilter('all'); setOpenFilter(null) }}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                          clubFilter === 'all' ? 'bg-[#00ff88]/10 text-[#00ff88]' : 'text-white/60 hover:bg-white/5'
                        }`}
                      >
                        All Clubs
                      </button>
                      {CLUBS.map((club) => (
                        <button
                          key={club.id}
                          onClick={() => { setClubFilter(club.name); setOpenFilter(null) }}
                          className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                            clubFilter === club.name ? 'bg-[#00ff88]/10 text-[#00ff88]' : 'text-white/60 hover:bg-white/5'
                          }`}
                        >
                          <span>{club.name}</span>
                          <span className="text-white/20 text-xs ml-2">{club.location}</span>
                        </button>
                      ))}
                    </>
                  )}

                  {openFilter === 'skill' && (
                    <>
                      {[
                        { key: 'all', label: 'All Levels', desc: 'Show all skill ranges' },
                        { key: 'beginner', label: 'Beginner', desc: 'Level 1.0 – 2.9' },
                        { key: 'intermediate', label: 'Intermediate', desc: 'Level 2.0 – 4.5' },
                        { key: 'advanced', label: 'Advanced', desc: 'Level 4.0+' },
                      ].map((s) => (
                        <button
                          key={s.key}
                          onClick={() => { setSkillFilter(s.key); setOpenFilter(null) }}
                          className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                            skillFilter === s.key ? 'bg-[#00ff88]/10 text-[#00ff88]' : 'text-white/60 hover:bg-white/5'
                          }`}
                        >
                          <span>{s.label}</span>
                          <span className="text-white/20 text-xs ml-2">{s.desc}</span>
                        </button>
                      ))}
                    </>
                  )}

                  {openFilter === 'date' && (
                    <>
                      {[
                        { key: 'all' as DateFilter, label: 'All Dates', desc: 'No date filter' },
                        { key: 'today' as DateFilter, label: 'Today', desc: new Date().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }) },
                        { key: 'tomorrow' as DateFilter, label: 'Tomorrow', desc: new Date(Date.now() + 86400000).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' }) },
                        { key: 'week' as DateFilter, label: 'This Week', desc: 'Next 7 days' },
                      ].map((d) => (
                        <button
                          key={d.key}
                          onClick={() => { setDateFilter(d.key); setOpenFilter(null) }}
                          className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                            dateFilter === d.key ? 'bg-[#00ff88]/10 text-[#00ff88]' : 'text-white/60 hover:bg-white/5'
                          }`}
                        >
                          <span>{d.label}</span>
                          <span className="text-white/20 text-xs ml-2">{d.desc}</span>
                        </button>
                      ))}
                    </>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* My Matches Section */}
        {myMatches.length > 0 && (
          <div className="px-6 mb-5">
            <h3 className="text-xs uppercase font-bold tracking-wider text-white/40 mb-3">My Matches</h3>
            <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-2">
              {myMatches.map((match) => {
                const spotsLeft = match.max_players - match.current_players
                return (
                  <motion.div key={match.id} variants={fadeUp}>
                    <Link href={`/match/${match.id}`}>
                      <motion.div
                        whileTap={{ scale: 0.98 }}
                        className="bg-[#111] rounded-2xl border border-blue-500/10 p-4 active:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-bold">{match.venue}</h4>
                          <div className="flex items-center gap-2">
                            <StatusBadge status="creator" />
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              spotsLeft === 0 ? 'bg-blue-500/10 text-blue-400' : 'bg-[#00ff88]/10 text-[#00ff88]'
                            }`}>
                              {spotsLeft === 0 ? 'Full' : `${spotsLeft} spot${spotsLeft > 1 ? 's' : ''}`}
                            </span>
                          </div>
                        </div>
                        <p className="text-white/40 text-xs mb-3">{match.date} · {match.time}</p>
                        <div className="flex items-center gap-2">
                          {match.players.map((player) => (
                            <div key={player.id} className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border-2 border-[#00ff88] flex items-center justify-center">
                              <span className="text-[10px] font-bold text-white/70">{player.full_name?.charAt(0)}</span>
                            </div>
                          ))}
                          {Array.from({ length: Math.max(0, spotsLeft) }).map((_, i) => (
                            <div key={`e-${i}`} className="w-9 h-9 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
                              <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                              </svg>
                            </div>
                          ))}
                          <span className="text-[10px] text-white/30 ml-auto">Manage →</span>
                        </div>
                      </motion.div>
                    </Link>
                  </motion.div>
                )
              })}
            </motion.div>
          </div>
        )}

        {/* All Matches */}
        <div className="px-6 pb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs uppercase font-bold tracking-wider text-white/40">
              All Matches
              <span className="text-white/20 ml-2 normal-case">({otherMatches.length})</span>
            </h3>
            <button
              onClick={() => { if (userId) { setLoading(true); loadMatches(userId) } }}
              className="text-[10px] text-white/30 font-bold uppercase tracking-wider hover:text-white/50 transition-colors"
            >
              Refresh
            </button>
          </div>

          {otherMatches.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4">
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="text-white/15">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-white/40 text-base font-semibold mb-1">No matches found</p>
              <p className="text-white/20 text-sm mb-6">Try different filters or create your own</p>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowCreate(true)}
                className="px-6 py-3 bg-[#00ff88] text-black font-bold rounded-xl text-xs uppercase tracking-wider"
              >
                Create a Match
              </motion.button>
            </div>
          ) : (
            <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-2">
              {otherMatches.map((match) => {
                const spotsLeft = match.max_players - match.current_players
                return (
                  <motion.div key={match.id} variants={fadeUp}>
                    <Link href={`/match/${match.id}`}>
                      <motion.div
                        whileTap={{ scale: 0.98 }}
                        className={`bg-[#111] rounded-2xl border p-4 active:bg-white/5 transition-colors ${
                          match.user_status === 'creator' ? 'border-blue-500/10' :
                          match.user_status === 'accepted' ? 'border-[#00ff88]/10' :
                          match.user_status === 'pending' ? 'border-yellow-500/10' :
                          'border-white/5'
                        }`}
                      >
                        {/* Top row: venue + badges */}
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-sm font-bold truncate flex-1 mr-2">{match.venue}</h4>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <StatusBadge status={match.user_status} />
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              spotsLeft === 0 ? 'bg-white/5 text-white/30' : 'bg-[#00ff88]/10 text-[#00ff88]'
                            }`}>
                              {spotsLeft === 0 ? 'Full' : `${spotsLeft} spot${spotsLeft > 1 ? 's' : ''}`}
                            </span>
                          </div>
                        </div>

                        {/* Date/time + skill */}
                        <div className="flex items-center gap-3 mb-3">
                          <p className="text-white/40 text-xs">{match.date} · {match.time}</p>
                          <span className="text-[10px] text-white/20 font-medium">Level {match.skill_min.toFixed(1)}–{match.skill_max.toFixed(1)}</span>
                        </div>

                        {/* Player slots + creator */}
                        <div className="flex items-center gap-2">
                          {match.players.map((player) => (
                            <div key={player.id} className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border-2 border-[#00ff88]/60 flex items-center justify-center" title={player.full_name}>
                              <span className="text-[9px] font-bold text-white/70">{player.full_name?.charAt(0)}</span>
                            </div>
                          ))}
                          {Array.from({ length: Math.max(0, spotsLeft) }).map((_, i) => (
                            <div key={`e-${i}`} className="w-8 h-8 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
                              <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.15)" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                              </svg>
                            </div>
                          ))}
                          <span className="text-[10px] text-white/20 ml-auto">by {match.creator_name}</span>
                        </div>
                      </motion.div>
                    </Link>
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </div>
      </div>

      {/* Pending Requests Sheet */}
      <AnimatePresence>
        {showRequests && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
              onClick={() => setShowRequests(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[101] bg-[#111] rounded-t-3xl border-t border-white/10 max-h-[70vh] overflow-y-auto"
            >
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-white/20 rounded-full" />
              </div>
              <div className="px-6 pb-6">
                <h2 className="text-lg font-bold mb-4">Pending Requests</h2>
                {requestsLoading ? (
                  <div className="flex justify-center py-8">
                    <div className="w-6 h-6 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : pendingRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-white/30 text-sm">No pending requests</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingRequests.map((req) => (
                      <div key={`${req.match_id}-${req.player_id}`} className="bg-white/5 rounded-2xl p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-white/10 flex items-center justify-center">
                            <span className="text-xs font-bold text-white/60">{req.player_name.charAt(0)}</span>
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold">{req.player_name}</p>
                            <p className="text-xs text-white/30">Level {req.player_level.toFixed(1)} · {req.venue}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleAcceptRequest(req)}
                            className="flex-1 py-2.5 bg-[#00ff88] text-black font-bold rounded-xl text-xs uppercase tracking-wider"
                          >
                            Accept
                          </motion.button>
                          <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={() => handleDeclineRequest(req)}
                            className="flex-1 py-2.5 bg-white/5 text-white/40 font-bold rounded-xl text-xs uppercase tracking-wider border border-white/10"
                          >
                            Decline
                          </motion.button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Create Match Modal */}
      <AnimatePresence>
        {showCreate && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
              onClick={() => setShowCreate(false)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[101] bg-[#111] rounded-t-3xl border-t border-white/10"
            >
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-white/20 rounded-full" />
              </div>
              <div className="px-6 pb-8 space-y-4">
                <h2 className="text-lg font-bold">Create New Match</h2>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-white/30 uppercase font-semibold block mb-1">Date</label>
                    <input
                      type="date"
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#00ff88]/50 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-white/30 uppercase font-semibold block mb-1">Time</label>
                    <input
                      type="time"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#00ff88]/50 focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-white/30 uppercase font-semibold block mb-1">Venue</label>
                  <select
                    value={newVenue}
                    onChange={(e) => setNewVenue(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#00ff88]/50 focus:outline-none"
                  >
                    <option value="">Select venue</option>
                    {CLUBS.map((club) => (
                      <option key={club.id} value={club.name}>{club.name}</option>
                    ))}
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
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#00ff88]/50 focus:outline-none"
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
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:border-[#00ff88]/50 focus:outline-none"
                    />
                  </div>
                </div>
                <button
                  onClick={handleCreateMatch}
                  disabled={creating}
                  className="w-full py-3.5 bg-[#00ff88] text-black font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-[#00ff88]/90 transition-all disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Match'}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <BottomNav />
    </div>
  )
}
