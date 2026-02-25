'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { motion, useMotionValue, useTransform, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { hapticLight, hapticMedium } from '@/lib/haptics'
import BottomNav from '@/app/components/BottomNav'
import Toast from '@/app/components/Toast'

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

function SwipeCard({
  match,
  isTop,
  stackIndex,
  onSwipeRight,
  onSwipeLeft,
}: {
  match: MatchCard
  isTop: boolean
  stackIndex: number
  onSwipeRight: () => void
  onSwipeLeft: () => void
}) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 0, 200], [-15, 0, 15])
  const greenOpacity = useTransform(x, [0, 100], [0, 1])
  const redOpacity = useTransform(x, [-100, 0], [1, 0])

  const spotsLeft = match.max_players - match.current_players

  return (
    <motion.div
      className="absolute w-full"
      style={{
        zIndex: 3 - stackIndex,
        x: isTop ? x : 0,
        rotate: isTop ? rotate : 0,
      }}
      initial={{ scale: 1 - stackIndex * 0.05, y: stackIndex * 12, opacity: stackIndex < 3 ? 1 : 0 }}
      animate={{ scale: 1 - stackIndex * 0.05, y: stackIndex * 12, opacity: stackIndex < 3 ? 1 : 0 }}
      exit={{ x: x.get() > 0 ? 300 : -300, opacity: 0, transition: { duration: 0.3 } }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.9}
      onDragEnd={(_, info) => {
        if (info.offset.x > 100 || info.velocity.x > 500) {
          onSwipeRight()
        } else if (info.offset.x < -100 || info.velocity.x < -500) {
          onSwipeLeft()
        }
      }}
    >
      <div className="bg-[#111] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
        {/* Swipe indicators */}
        {isTop && (
          <>
            <motion.div
              className="absolute top-6 right-6 z-10 bg-[#00ff88] rounded-full w-14 h-14 flex items-center justify-center"
              style={{ opacity: greenOpacity }}
            >
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="black" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
            <motion.div
              className="absolute top-6 left-6 z-10 bg-red-500 rounded-full w-14 h-14 flex items-center justify-center"
              style={{ opacity: redOpacity }}
            >
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="3">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.div>
          </>
        )}

        <div className="p-6">
          {/* Venue */}
          <h3 className="text-xl font-bold mb-1">{match.venue}</h3>
          <p className="text-white/40 text-sm mb-4">{match.date} · {match.time}</p>

          {/* Skill Range */}
          <div className="inline-flex items-center gap-2 bg-white/5 rounded-xl px-3 py-2 mb-5">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#00ff88" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-xs font-bold text-white/60">Level {match.skill_min.toFixed(1)} – {match.skill_max.toFixed(1)}</span>
          </div>

          {/* Player Slots */}
          <div className="flex items-center gap-3 mb-4">
            {match.players.map((player) => (
              <div key={player.id} className="flex flex-col items-center gap-0.5">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border-2 border-[#00ff88] flex items-center justify-center">
                  <span className="text-xs font-bold text-white/70">{player.full_name?.charAt(0) || '?'}</span>
                </div>
                <span className="text-[8px] text-white/40 font-semibold truncate max-w-[44px]">{player.full_name?.split(' ')[0]}</span>
              </div>
            ))}
            {Array.from({ length: Math.max(0, spotsLeft) }).map((_, i) => (
              <div key={`empty-${i}`} className="flex flex-col items-center gap-0.5">
                <div className="w-11 h-11 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <span className="text-[8px] text-white/20 font-semibold">Open</span>
              </div>
            ))}
          </div>

          {/* Spots + Creator + View */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-[#00ff88]">{spotsLeft} {spotsLeft === 1 ? 'spot' : 'spots'} left</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-white/30">by {match.creator_name}</span>
              <Link href={`/match/${match.id}`} className="text-[10px] font-bold text-[#00ff88] uppercase tracking-wider hover:underline" onClick={(e) => e.stopPropagation()}>
                Details →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default function MatchmakingPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [userName, setUserName] = useState('')
  const [userLevel, setUserLevel] = useState(2.5)
  const [cards, setCards] = useState<MatchCard[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })
  const [showRequests, setShowRequests] = useState(false)
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [myMatches, setMyMatches] = useState<MatchCard[]>([])

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

  const loadCards = useCallback(async (uid: string, level: number) => {
    // Fetch open matches
    const { data: dbMatches, error } = await supabase
      .from('matches')
      .select('*')
      .in('status', ['open'])
      .order('date', { ascending: true })

    if (error || !dbMatches) {
      setLoading(false)
      return
    }

    // Get match IDs user already requested/joined
    const { data: myPlays } = await supabase
      .from('match_players')
      .select('match_id')
      .eq('player_id', uid)

    const myMatchIds = new Set((myPlays || []).map((mp: { match_id: string }) => mp.match_id))

    // Filter out: user-created, already joined, full
    const eligible = dbMatches.filter((m: any) =>
      m.creator_id !== uid &&
      !myMatchIds.has(m.id) &&
      m.current_players < m.max_players
    )

    // For each match, fetch players
    const matchCards: MatchCard[] = await Promise.all(
      eligible.map(async (m: any) => {
        const { data: mpData } = await supabase
          .from('match_players')
          .select('player_id')
          .eq('match_id', m.id)
          .eq('status', 'accepted')

        const playerIds = (mpData || []).map((mp: any) => mp.player_id)

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

        const { data: creatorData } = await supabase
          .from('applications')
          .select('full_name')
          .eq('id', m.creator_id)
          .single()

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
          creator_name: creatorData?.full_name || 'Unknown',
          players,
        }
      })
    )

    // Sort by skill proximity — matches within user's range first, then by distance from center
    matchCards.sort((a, b) => {
      const aInRange = level >= a.skill_min && level <= a.skill_max
      const bInRange = level >= b.skill_min && level <= b.skill_max
      if (aInRange && !bInRange) return -1
      if (!aInRange && bInRange) return 1
      const aDist = Math.abs(level - (a.skill_min + a.skill_max) / 2)
      const bDist = Math.abs(level - (b.skill_min + b.skill_max) / 2)
      return aDist - bDist
    })

    setCards(matchCards)
    setCurrentIndex(0)

    // Also fetch user's own created matches (open or full)
    const { data: allUserMatches } = await supabase
      .from('matches')
      .select('*')
      .eq('creator_id', uid)
      .in('status', ['open', 'full'])
      .order('date', { ascending: true })
    const userCreated = allUserMatches || []
    const myMatchCards: MatchCard[] = await Promise.all(
      userCreated.map(async (m: any) => {
        const { data: mpData } = await supabase
          .from('match_players')
          .select('player_id')
          .eq('match_id', m.id)
          .eq('status', 'accepted')

        const playerIds = (mpData || []).map((mp: any) => mp.player_id)
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
          creator_name: 'You',
          players,
        }
      })
    )
    setMyMatches(myMatchCards)
    setLoading(false)
  }, [])

  const loadPendingRequests = useCallback(async (uid: string) => {
    setRequestsLoading(true)
    // Get matches created by user
    const { data: myMatches } = await supabase
      .from('matches')
      .select('id, venue, date, time')
      .eq('creator_id', uid)
      .in('status', ['open', 'full'])

    if (!myMatches || myMatches.length === 0) {
      setPendingRequests([])
      setPendingCount(0)
      setRequestsLoading(false)
      return
    }

    const matchIds = myMatches.map((m: any) => m.id)
    const matchMap: Record<string, any> = {}
    myMatches.forEach((m: any) => { matchMap[m.id] = m })

    // Get pending players
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
            loadCards(user.id, level),
            loadPendingRequests(user.id),
          ])
          return
        }
      }
      setLoading(false)
    }
    init()
  }, [loadCards, loadPendingRequests])

  // Real-time subscription for match_players
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

  async function handleSwipeRight(match: MatchCard) {
    if (!userId) return
    hapticMedium()

    // Insert with status='pending'
    const { error } = await supabase
      .from('match_players')
      .insert({ match_id: match.id, player_id: userId, status: 'pending' })

    if (error) {
      if (error.code === '23505') {
        showToast('Already requested', 'error')
      } else {
        showToast('Failed to send request', 'error')
      }
      return
    }

    // Post to activity feed
    await supabase.from('activity_feed').insert({
      user_id: userId,
      type: 'join_requested',
      title: `${userName} requested to join a match`,
      description: `${match.venue} · ${match.date} · ${match.time}`,
      metadata: { match_id: match.id, venue: match.venue },
    })

    showToast('Request sent!')
    setCurrentIndex((i) => i + 1)
  }

  function handleSwipeLeft() {
    hapticLight()
    setCurrentIndex((i) => i + 1)
  }

  async function handleAcceptRequest(req: PendingRequest) {
    if (!userId) return
    hapticMedium()

    // Update status to accepted
    const { error } = await supabase
      .from('match_players')
      .update({ status: 'accepted' })
      .eq('match_id', req.match_id)
      .eq('player_id', req.player_id)

    if (error) {
      showToast('Failed to accept', 'error')
      return
    }

    // Increment current_players
    const { data: matchData } = await supabase
      .from('matches')
      .select('current_players, max_players')
      .eq('id', req.match_id)
      .single()

    if (matchData) {
      const newCount = matchData.current_players + 1
      const newStatus = newCount >= matchData.max_players ? 'full' : 'open'
      await supabase
        .from('matches')
        .update({ current_players: newCount, status: newStatus })
        .eq('id', req.match_id)
    }

    // Post to activity feed
    await supabase.from('activity_feed').insert({
      user_id: req.player_id,
      type: 'join_accepted',
      title: `${req.player_name} was accepted to a match`,
      description: `${req.venue} · ${req.date} · ${req.time}`,
      metadata: { match_id: req.match_id, venue: req.venue },
    })

    showToast(`${req.player_name} accepted!`)
    setPendingRequests((prev) => prev.filter((r) => !(r.match_id === req.match_id && r.player_id === req.player_id)))
    setPendingCount((c) => Math.max(0, c - 1))
  }

  async function handleDeclineRequest(req: PendingRequest) {
    hapticLight()

    const { error } = await supabase
      .from('match_players')
      .delete()
      .eq('match_id', req.match_id)
      .eq('player_id', req.player_id)

    if (error) {
      showToast('Failed to decline', 'error')
      return
    }

    showToast('Request declined')
    setPendingRequests((prev) => prev.filter((r) => !(r.match_id === req.match_id && r.player_id === req.player_id)))
    setPendingCount((c) => Math.max(0, c - 1))
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

      // Add creator as first player (status='accepted' via default)
      await supabase
        .from('match_players')
        .insert({ match_id: newMatch.id, player_id: userId })

      // Post to activity feed
      await supabase.from('activity_feed').insert({
        user_id: userId,
        type: 'match_created',
        title: `${userName} is looking for a match`,
        description: `${newVenue} · ${new Date(newDate).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })} · ${newTime} · Level ${newSkillMin}–${newSkillMax}`,
        metadata: { match_id: newMatch.id, venue: newVenue },
      })

      hapticMedium()
      showToast('Match created!')
      setShowCreate(false)
      setNewDate('')
      setNewTime('')
      setNewVenue('')
      // Navigate to the new match detail page
      router.push(`/match/${newMatch.id}`)
    } catch {
      showToast('Something went wrong', 'error')
    }
    setCreating(false)
  }

  async function handleRefresh() {
    if (!userId) return
    hapticLight()
    setLoading(true)
    await loadCards(userId, userLevel)
  }

  const visibleCards = cards.slice(currentIndex, currentIndex + 3)
  const allSwiped = currentIndex >= cards.length

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
        <div className="pt-12 pb-4 px-6">
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
        </div>

        {/* Swipe Area */}
        <div className="px-6 relative" style={{ height: 380 }}>
          {allSwiped ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-4">
                <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="text-white/15">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <p className="text-white/40 text-base font-semibold mb-1">No more games nearby</p>
              <p className="text-white/20 text-sm mb-6">Check back later or create your own</p>
              <div className="flex gap-3">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowCreate(true)}
                  className="px-6 py-3 bg-[#00ff88] text-black font-bold rounded-xl text-xs uppercase tracking-wider"
                >
                  Create a Match
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={handleRefresh}
                  className="px-6 py-3 bg-white/5 text-white/60 font-bold rounded-xl text-xs uppercase tracking-wider border border-white/10"
                >
                  Refresh
                </motion.button>
              </div>
            </div>
          ) : (
            <AnimatePresence>
              {visibleCards.map((match, i) => (
                <SwipeCard
                  key={match.id}
                  match={match}
                  isTop={i === 0}
                  stackIndex={i}
                  onSwipeRight={() => handleSwipeRight(match)}
                  onSwipeLeft={handleSwipeLeft}
                />
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Swipe hints */}
        {!allSwiped && visibleCards.length > 0 && (
          <div className="flex justify-center gap-8 mt-4 px-6">
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleSwipeLeft}
              className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center"
            >
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#ef4444" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => visibleCards[0] && handleSwipeRight(visibleCards[0])}
              className="w-14 h-14 rounded-full bg-[#00ff88]/10 border border-[#00ff88]/20 flex items-center justify-center"
            >
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#00ff88" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </motion.button>
          </div>
        )}

        {/* My Matches */}
        {myMatches.length > 0 && (
          <div className="px-6 mt-8 pb-6">
            <h3 className="text-xs uppercase font-bold tracking-wider text-white/40 mb-3">My Matches</h3>
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
              className="space-y-3"
            >
              {myMatches.map((match) => {
                const spotsLeft = match.max_players - match.current_players
                return (
                  <motion.div key={match.id} variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 30 } } }}>
                  <Link href={`/match/${match.id}`}>
                    <motion.div
                      whileTap={{ scale: 0.98 }}
                      className="bg-[#111] rounded-2xl border border-white/5 p-4 active:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-bold">{match.venue}</h4>
                        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          spotsLeft === 0 ? 'bg-blue-500/10 text-blue-400' : 'bg-[#00ff88]/10 text-[#00ff88]'
                        }`}>
                          {spotsLeft === 0 ? 'Full' : `${spotsLeft} spot${spotsLeft > 1 ? 's' : ''}`}
                        </span>
                      </div>
                      <p className="text-white/40 text-xs mb-3">{match.date} · {match.time}</p>
                      <div className="flex items-center gap-2">
                        {match.players.map((player) => (
                          <div key={player.id} className="flex flex-col items-center gap-0.5">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border-2 border-[#00ff88] flex items-center justify-center">
                              <span className="text-[10px] font-bold text-white/70">{player.full_name?.charAt(0)}</span>
                            </div>
                          </div>
                        ))}
                        {Array.from({ length: spotsLeft }).map((_, i) => (
                          <div key={`e-${i}`} className="w-9 h-9 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
                            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                            </svg>
                          </div>
                        ))}
                        <span className="text-[10px] text-white/30 ml-auto">Tap to manage →</span>
                      </div>
                    </motion.div>
                  </Link>
                  </motion.div>
                )
              })}
            </motion.div>
          </div>
        )}
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
