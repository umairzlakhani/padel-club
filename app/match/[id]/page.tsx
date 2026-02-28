'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { CLUBS } from '@/lib/clubs'
import { IMAGES } from '@/lib/images'
import { hapticLight, hapticMedium, hapticSuccess, hapticError } from '@/lib/haptics'
import BottomNav from '@/app/components/BottomNav'
import Toast from '@/app/components/Toast'
import PlayerSlots from '@/app/components/PlayerSlots'

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 30 } } }

type Player = { id: string; full_name: string; avatar_url?: string | null; skill_level?: number }

export default function MatchDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [match, setMatch] = useState<any>(null)
  const [creator, setCreator] = useState<Player | null>(null)
  const [acceptedPlayers, setAcceptedPlayers] = useState<Player[]>([])
  const [pendingPlayers, setPendingPlayers] = useState<Player[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [userRequestStatus, setUserRequestStatus] = useState<'none' | 'pending' | 'accepted'>('none')
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })

  // Score entry state
  const [showScoreSheet, setShowScoreSheet] = useState(false)
  const [scoreEntry, setScoreEntry] = useState([
    { team_a: 0, team_b: 0 },
    { team_a: 0, team_b: 0 },
    { team_a: 0, team_b: 0 },
  ])
  const [teamAssignments, setTeamAssignments] = useState<{ A: string[]; B: string[] }>({ A: [], B: [] })
  const [submittingScore, setSubmittingScore] = useState(false)
  const [verifyLoading, setVerifyLoading] = useState(false)
  const [matchPlayerTeams, setMatchPlayerTeams] = useState<Record<string, string>>({})

  const autoVerifyTriggered = useRef(false)

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type })
  }, [])

  const loadMatch = useCallback(async (uid: string | null) => {
    // Fetch match
    const { data: m } = await supabase
      .from('matches')
      .select('*')
      .eq('id', id)
      .single()

    if (!m) { setLoading(false); return }
    setMatch(m)

    // Auto-verify check: 24 hours since score submission
    if (m.result_status === 'pending_verification' && m.score_submitted_at && !autoVerifyTriggered.current) {
      const submittedAt = new Date(m.score_submitted_at).getTime()
      const now = Date.now()
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000
      if (now - submittedAt >= TWENTY_FOUR_HOURS) {
        autoVerifyTriggered.current = true
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          await fetch('/api/verify-score', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({ match_id: id, action: 'auto_verify' }),
          })
          // Re-fetch the match after auto-verify
          const { data: updated } = await supabase
            .from('matches')
            .select('*')
            .eq('id', id)
            .single()
          if (updated) setMatch(updated)
        }
      }
    }

    // Fetch creator profile
    const { data: creatorData } = await supabase
      .from('applications')
      .select('id, full_name, avatar_url, skill_level')
      .eq('id', m.creator_id)
      .single()
    setCreator(creatorData as Player)

    // Fetch all match_players (include team and result_confirmed)
    const { data: mp } = await supabase
      .from('match_players')
      .select('player_id, status, team, result_confirmed')
      .eq('match_id', id)

    const accepted = (mp || []).filter((p: any) => p.status === 'accepted').map((p: any) => p.player_id)
    const pending = (mp || []).filter((p: any) => p.status === 'pending').map((p: any) => p.player_id)

    // Build team map
    const teamMap: Record<string, string> = {}
    ;(mp || []).forEach((p: any) => { if (p.team) teamMap[p.player_id] = p.team })
    setMatchPlayerTeams(teamMap)

    // Check current user status
    if (uid) {
      const userEntry = (mp || []).find((p: any) => p.player_id === uid)
      if (userEntry) {
        setUserRequestStatus(userEntry.status as 'pending' | 'accepted')
      } else {
        setUserRequestStatus('none')
      }
    }

    // Fetch profiles for all players
    const allIds = [...new Set([...accepted, ...pending])]
    let profileMap: Record<string, Player> = {}
    if (allIds.length > 0) {
      const { data: profiles } = await supabase
        .from('applications')
        .select('id, full_name, avatar_url, skill_level')
        .in('id', allIds)
      profiles?.forEach((p: any) => { profileMap[p.id] = p })
    }

    setAcceptedPlayers(accepted.map((pid: string) => profileMap[pid]).filter(Boolean))
    setPendingPlayers(pending.map((pid: string) => profileMap[pid]).filter(Boolean))
    setLoading(false)
  }, [id])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      const uid = user?.id || null
      setUserId(uid)
      await loadMatch(uid)
    }
    init()
  }, [loadMatch])

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`match-${id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_players', filter: `match_id=eq.${id}` }, () => {
        loadMatch(userId)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches', filter: `id=eq.${id}` }, (payload) => {
        if (payload.new) setMatch(payload.new)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [id, userId, loadMatch])

  async function handleRequestJoin() {
    if (!userId || !match) return
    setActionLoading(true)
    hapticMedium()

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const res = await fetch('/api/join-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ match_id: id, player_id: userId }),
      })

      const result = await res.json()

      if (!res.ok || result.error) {
        if (res.status === 409) {
          showToast('Already requested', 'error')
        } else if (res.status === 403 && result.error?.includes('skill')) {
          hapticError()
          showToast(result.error, 'error')
        } else {
          showToast(result.error || 'Failed to send request', 'error')
        }
      } else {
        setUserRequestStatus('pending')
        showToast('Request sent!')

        // Activity feed (non-blocking)
        const { data: profile } = await supabase
          .from('applications')
          .select('full_name')
          .eq('id', userId)
          .single()

        supabase.from('activity_feed').insert({
          user_id: userId,
          type: 'join_requested',
          title: `${profile?.full_name || 'Player'} requested to join a match`,
          description: `${match.venue} · ${new Date(match.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })} · ${match.time}`,
          metadata: { match_id: id, venue: match.venue },
        }).then(() => {})
      }
    } catch {
      showToast('Something went wrong', 'error')
    }
    setActionLoading(false)
  }

  async function handleAccept(playerId: string) {
    hapticMedium()
    try {
      const res = await fetch('/api/accept-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: id, player_id: playerId }),
      })
      const result = await res.json()
      if (!res.ok || result.error) {
        showToast(result.error || 'Failed to accept', 'error')
        return
      }
      showToast('Player accepted!')
      await loadMatch(userId)
    } catch {
      showToast('Failed to accept', 'error')
    }
  }

  async function handleDecline(playerId: string) {
    hapticLight()
    try {
      const res = await fetch('/api/decline-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: id, player_id: playerId }),
      })
      const result = await res.json()
      if (!res.ok || result.error) {
        showToast(result.error || 'Failed to decline', 'error')
        return
      }
      showToast('Request declined')
      await loadMatch(userId)
    } catch {
      showToast('Failed to decline', 'error')
    }
  }

  async function handleSubmitScore() {
    if (!userId || !match) return
    setSubmittingScore(true)
    hapticMedium()

    try {
      // Validate teams
      if (teamAssignments.A.length !== 2 || teamAssignments.B.length !== 2) {
        showToast('Assign 2 players to each team', 'error')
        setSubmittingScore(false)
        return
      }

      // Determine how many sets to send (2 if one team won both, 3 if split)
      const set1Winner = scoreEntry[0].team_a > scoreEntry[0].team_b ? 'A' : 'B'
      const set2Winner = scoreEntry[1].team_a > scoreEntry[1].team_b ? 'A' : 'B'
      const needsThirdSet = set1Winner !== set2Winner
      const scoresToSend = needsThirdSet ? scoreEntry : scoreEntry.slice(0, 2)

      // Basic validation
      for (let i = 0; i < scoresToSend.length; i++) {
        const s = scoresToSend[i]
        if (s.team_a === s.team_b) {
          showToast(`Set ${i + 1} cannot be a tie`, 'error')
          setSubmittingScore(false)
          return
        }
      }

      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const res = await fetch('/api/submit-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          match_id: id,
          scores: scoresToSend,
          teams: teamAssignments,
        }),
      })

      const result = await res.json()
      if (!res.ok || result.error) {
        showToast(result.error || 'Failed to submit score', 'error')
      } else {
        showToast('Score submitted!')
        setShowScoreSheet(false)
        await loadMatch(userId)
      }
    } catch {
      showToast('Something went wrong', 'error')
    }
    setSubmittingScore(false)
  }

  async function handleVerifyScore(action: 'confirm' | 'dispute') {
    if (!userId || !match) return
    setVerifyLoading(true)
    hapticMedium()

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const res = await fetch('/api/verify-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ match_id: id, action }),
      })

      const result = await res.json()
      if (!res.ok || result.error) {
        showToast(result.error || `Failed to ${action}`, 'error')
      } else {
        if (action === 'confirm') hapticSuccess()
        showToast(action === 'confirm' ? 'Score verified! Ratings updated.' : 'Score disputed.')
        await loadMatch(userId)
      }
    } catch {
      showToast('Something went wrong', 'error')
    }
    setVerifyLoading(false)
  }

  function toggleTeamAssignment(playerId: string) {
    hapticLight()
    setTeamAssignments(prev => {
      const inA = prev.A.includes(playerId)
      const inB = prev.B.includes(playerId)

      if (inA) {
        // Move to B if B has room, otherwise remove
        if (prev.B.length < 2) return { A: prev.A.filter(id => id !== playerId), B: [...prev.B, playerId] }
        return { ...prev, A: prev.A.filter(id => id !== playerId) }
      }
      if (inB) {
        // Remove from B
        return { ...prev, B: prev.B.filter(id => id !== playerId) }
      }
      // Not assigned — add to A if room, else B
      if (prev.A.length < 2) return { ...prev, A: [...prev.A, playerId] }
      if (prev.B.length < 2) return { ...prev, B: [...prev.B, playerId] }
      return prev
    })
  }

  function getPlayerTeamLabel(playerId: string): string | null {
    if (teamAssignments.A.includes(playerId)) return 'A'
    if (teamAssignments.B.includes(playerId)) return 'B'
    return null
  }

  // Find venue info from CLUBS
  const venue = match ? CLUBS.find(c =>
    c.name.toLowerCase() === match.venue?.toLowerCase() ||
    match.venue?.toLowerCase().includes(c.name.toLowerCase().split(' ')[0])
  ) : null

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
          <span className="text-white/40 text-sm font-medium">Loading match...</span>
        </div>
      </div>
    )
  }

  if (!match) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-white/40 text-lg mb-4">Match not found</p>
          <button onClick={() => router.back()} className="px-6 py-3 bg-white/5 rounded-xl text-sm font-bold border border-white/10">
            Go Back
          </button>
        </div>
      </div>
    )
  }

  const isCreator = userId === match.creator_id
  const isAccepted = userRequestStatus === 'accepted'
  const isPending = userRequestStatus === 'pending'
  const canJoin = match.status === 'open' && !isCreator && !isAccepted && !isPending
  const pricePerPlayer = venue ? Math.round(venue.pricePerHour / match.max_players) : null

  // Result status derived state
  const hasResult = !!match.result_status
  const isPendingVerification = match.result_status === 'pending_verification'
  const isVerified = match.result_status === 'verified'
  const isDisputed = match.result_status === 'disputed'
  const canSubmitScore = isCreator && match.status === 'full' && !hasResult
  const canVerify = isPendingVerification && isAccepted && !isCreator

  // Determine match winner from scores
  const scores: { team_a: number; team_b: number }[] = match.scores || []
  const teamASetWins = scores.filter(s => s.team_a > s.team_b).length
  const teamBSetWins = scores.filter(s => s.team_b > s.team_a).length
  const winningTeam = teamASetWins > teamBSetWins ? 'A' : teamBSetWins > teamASetWins ? 'B' : null

  // Build team player lists from matchPlayerTeams
  const teamAPlayers = acceptedPlayers.filter(p => matchPlayerTeams[p.id] === 'A')
  const teamBPlayers = acceptedPlayers.filter(p => matchPlayerTeams[p.id] === 'B')

  // Status badge helper
  const getStatusBadge = () => {
    if (isVerified) return { className: 'bg-[#00ff88]/20 text-[#00ff88]', label: 'Verified' }
    if (isDisputed) return { className: 'bg-red-500/20 text-red-400', label: 'Disputed' }
    if (isPendingVerification) return { className: 'bg-yellow-400/20 text-yellow-400', label: 'Pending Verification' }
    if (match.status === 'open') return { className: 'bg-[#00ff88]/20 text-[#00ff88]', label: 'open' }
    if (match.status === 'full') return { className: 'bg-blue-500/20 text-blue-400', label: 'full' }
    if (match.status === 'completed') return { className: 'bg-[#00ff88]/20 text-[#00ff88]', label: 'completed' }
    return { className: 'bg-white/10 text-white/40', label: match.status }
  }

  const statusBadge = getStatusBadge()

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex justify-center overflow-y-auto">
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast(t => ({ ...t, visible: false }))} />
      <div className="w-full max-w-[480px] min-h-screen relative pb-32 page-transition">

        {/* Venue Hero */}
        <motion.div className="relative w-full aspect-[2.2/1] overflow-hidden" initial={{ scale: 1.05, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 30 }}>
          {venue?.imageUrl ? (
            <Image
              src={venue.imageUrl}
              alt={match.venue}
              fill
              sizes="(max-width: 480px) 100vw, 480px"
              className="object-cover"
            />
          ) : (
            <Image
              src={IMAGES.matchHero}
              alt="Padel court"
              fill
              sizes="(max-width: 480px) 100vw, 480px"
              className="object-cover"
            />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />

          {/* Back button */}
          <button
            onClick={() => router.back()}
            className="absolute top-12 left-5 w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/10 z-10"
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Status badge */}
          <div className="absolute top-12 right-5 z-10">
            <span className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-full backdrop-blur-sm ${statusBadge.className}`}>
              {statusBadge.label}
            </span>
          </div>

          {/* Venue info */}
          <div className="absolute bottom-4 left-5 right-5">
            <h1 className="text-2xl font-bold drop-shadow-lg">{match.venue}</h1>
            {venue && <p className="text-white/50 text-sm drop-shadow">{venue.location}</p>}
          </div>
        </motion.div>

        <motion.div className="px-6 pt-5 space-y-6" variants={stagger} initial="hidden" animate="show">

          {/* Date / Time / Skill */}
          <motion.div className="flex gap-3" variants={fadeUp}>
            <div className="flex-1 bg-[#111] rounded-2xl border border-white/5 p-4 text-center">
              <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider mb-1">Date</p>
              <p className="text-sm font-bold">
                {new Date(match.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
            </div>
            <div className="flex-1 bg-[#111] rounded-2xl border border-white/5 p-4 text-center">
              <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider mb-1">Time</p>
              <p className="text-sm font-bold">{match.time}</p>
            </div>
            <div className="flex-1 bg-[#111] rounded-2xl border border-white/5 p-4 text-center">
              <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider mb-1">Level</p>
              <p className="text-sm font-bold text-[#00ff88]">
                {parseFloat(match.skill_min).toFixed(1)}–{parseFloat(match.skill_max).toFixed(1)}
              </p>
            </div>
          </motion.div>

          {/* Player Slots */}
          <motion.section variants={fadeUp}>
            <h3 className="text-xs uppercase font-bold tracking-wider text-white/40 mb-4">Players ({match.current_players}/{match.max_players})</h3>
            <div className="bg-[#111] rounded-2xl border border-white/5 p-6">
              <PlayerSlots
                maxPlayers={match.max_players}
                acceptedPlayers={acceptedPlayers}
                pendingPlayers={pendingPlayers}
                creatorId={match.creator_id}
                currentUserId={userId}
                matchStatus={match.status}
                onRequestJoin={handleRequestJoin}
                onAccept={handleAccept}
                onDecline={handleDecline}
                size="lg"
                userRequestStatus={userRequestStatus}
              />
            </div>
          </motion.section>

          {/* Score Result Banner */}
          {hasResult && scores.length > 0 && (
            <motion.section variants={fadeUp}>
              <h3 className="text-xs uppercase font-bold tracking-wider text-white/40 mb-3">Match Result</h3>
              <div className={`bg-[#111] rounded-2xl border p-5 ${
                isVerified ? 'border-[#00ff88]/20' : isDisputed ? 'border-red-500/20' : 'border-yellow-400/20'
              }`}>
                {/* Result status tag */}
                <div className="flex justify-center mb-4">
                  <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full ${
                    isVerified ? 'bg-[#00ff88]/10 text-[#00ff88]'
                      : isDisputed ? 'bg-red-500/10 text-red-400'
                      : 'bg-yellow-400/10 text-yellow-400'
                  }`}>
                    {isVerified ? 'Verified' : isDisputed ? 'Disputed' : 'Pending Verification'}
                  </span>
                </div>

                {/* Teams and scores */}
                <div className="flex items-center gap-4">
                  {/* Team A */}
                  <div className={`flex-1 text-center ${winningTeam === 'A' ? '' : 'opacity-50'}`}>
                    <p className={`text-[10px] uppercase font-bold tracking-wider mb-2 ${winningTeam === 'A' ? 'text-[#00ff88]' : 'text-white/30'}`}>
                      Team A {winningTeam === 'A' ? '— W' : ''}
                    </p>
                    {teamAPlayers.map(p => (
                      <div key={p.id} className="flex items-center justify-center gap-2 mb-1">
                        <div className="w-5 h-5 rounded-full bg-white/10 overflow-hidden">
                          {p.avatar_url ? (
                            <Image src={p.avatar_url} alt="" width={20} height={20} className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-white/40">
                              {p.full_name?.charAt(0)}
                            </div>
                          )}
                        </div>
                        <span className="text-xs font-medium truncate max-w-[80px]">{p.full_name?.split(' ')[0]}</span>
                      </div>
                    ))}
                  </div>

                  {/* Scores */}
                  <div className="flex flex-col items-center gap-1">
                    {scores.map((s, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm font-bold">
                        <span className={winningTeam === 'A' && s.team_a > s.team_b ? 'text-[#00ff88]' : 'text-white/50'}>{s.team_a}</span>
                        <span className="text-white/20 text-xs">-</span>
                        <span className={winningTeam === 'B' && s.team_b > s.team_a ? 'text-[#00ff88]' : 'text-white/50'}>{s.team_b}</span>
                      </div>
                    ))}
                  </div>

                  {/* Team B */}
                  <div className={`flex-1 text-center ${winningTeam === 'B' ? '' : 'opacity-50'}`}>
                    <p className={`text-[10px] uppercase font-bold tracking-wider mb-2 ${winningTeam === 'B' ? 'text-[#00ff88]' : 'text-white/30'}`}>
                      Team B {winningTeam === 'B' ? '— W' : ''}
                    </p>
                    {teamBPlayers.map(p => (
                      <div key={p.id} className="flex items-center justify-center gap-2 mb-1">
                        <div className="w-5 h-5 rounded-full bg-white/10 overflow-hidden">
                          {p.avatar_url ? (
                            <Image src={p.avatar_url} alt="" width={20} height={20} className="object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-white/40">
                              {p.full_name?.charAt(0)}
                            </div>
                          )}
                        </div>
                        <span className="text-xs font-medium truncate max-w-[80px]">{p.full_name?.split(' ')[0]}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Auto-verify note */}
                {isPendingVerification && match.score_submitted_at && (
                  <p className="text-[10px] text-white/20 text-center mt-4">
                    Auto-verifies 24h after submission if no dispute
                  </p>
                )}
              </div>
            </motion.section>
          )}

          {/* Match Info */}
          <motion.section variants={fadeUp}>
            <h3 className="text-xs uppercase font-bold tracking-wider text-white/40 mb-3">Match Info</h3>
            <div className="bg-[#111] rounded-2xl border border-white/5 divide-y divide-white/5">
              <div className="flex justify-between items-center p-4">
                <span className="text-white/40 text-sm">Court</span>
                <span className="text-sm font-bold">{match.venue}</span>
              </div>
              <div className="flex justify-between items-center p-4">
                <span className="text-white/40 text-sm">Date & Time</span>
                <span className="text-sm font-bold">
                  {new Date(match.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · {match.time}
                </span>
              </div>
              <div className="flex justify-between items-center p-4">
                <span className="text-white/40 text-sm">Skill Range</span>
                <span className="text-sm font-bold">
                  {parseFloat(match.skill_min).toFixed(1)} – {parseFloat(match.skill_max).toFixed(1)}
                </span>
              </div>
              <div className="flex justify-between items-center p-4">
                <span className="text-white/40 text-sm">Players</span>
                <span className="text-sm font-bold">{match.current_players} / {match.max_players}</span>
              </div>
              <div className="flex justify-between items-center p-4">
                <span className="text-white/40 text-sm">Created by</span>
                <span className="text-sm font-bold">{creator?.full_name || 'Unknown'}</span>
              </div>
              {venue && (
                <>
                  <div className="flex justify-between items-center p-4">
                    <span className="text-white/40 text-sm">Court Rate</span>
                    <span className="text-sm font-bold">PKR {venue.pricePerHour.toLocaleString()}/hr</span>
                  </div>
                  {pricePerPlayer && (
                    <div className="flex justify-between items-center p-4">
                      <span className="text-white/40 text-sm">Per Player</span>
                      <span className="text-sm font-bold text-[#00ff88]">PKR {pricePerPlayer.toLocaleString()}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.section>
        </motion.div>

        {/* Bottom Action Button */}
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-[480px] px-6 z-30">
          {/* Pre-result states */}
          {!hasResult && canJoin && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleRequestJoin}
              disabled={actionLoading}
              className="w-full py-4 bg-[#00ff88] text-black font-black rounded-2xl uppercase tracking-widest text-xs shadow-lg shadow-[#00ff88]/20 disabled:opacity-50"
            >
              {actionLoading ? 'Sending...' : 'Request to Join'}
            </motion.button>
          )}
          {!hasResult && isPending && (
            <div className="w-full py-4 bg-yellow-400/10 text-yellow-400 font-bold rounded-2xl text-center text-xs uppercase tracking-widest border border-yellow-400/20">
              Request Pending — Waiting for approval
            </div>
          )}
          {!hasResult && isAccepted && !isCreator && !canSubmitScore && (
            <div className="w-full py-4 bg-[#00ff88]/10 text-[#00ff88] font-bold rounded-2xl text-center text-xs uppercase tracking-widest border border-[#00ff88]/20">
              You&#39;re In! See you on the court
            </div>
          )}
          {!hasResult && isCreator && !canSubmitScore && (
            <div className="w-full py-4 bg-white/5 text-white/50 font-bold rounded-2xl text-center text-xs uppercase tracking-widest border border-white/10">
              Your Match — {pendingPlayers.length > 0 ? `${pendingPlayers.length} pending request${pendingPlayers.length > 1 ? 's' : ''}` : 'Waiting for players'}
            </div>
          )}
          {!hasResult && match.status === 'full' && !isAccepted && !isCreator && !isPending && (
            <div className="w-full py-4 bg-white/5 text-white/30 font-bold rounded-2xl text-center text-xs uppercase tracking-widest border border-white/5">
              Match Full
            </div>
          )}

          {/* Submit Score (host, match full, no result yet) */}
          {canSubmitScore && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                hapticMedium()
                // Pre-populate team A with creator
                if (teamAssignments.A.length === 0 && teamAssignments.B.length === 0 && userId) {
                  setTeamAssignments({ A: [userId], B: [] })
                }
                setShowScoreSheet(true)
              }}
              className="w-full py-4 bg-[#00ff88] text-black font-black rounded-2xl uppercase tracking-widest text-xs shadow-lg shadow-[#00ff88]/20"
            >
              Submit Score
            </motion.button>
          )}

          {/* Pending verification — host view */}
          {isPendingVerification && isCreator && (
            <div className="w-full py-4 bg-yellow-400/10 text-yellow-400 font-bold rounded-2xl text-center text-xs uppercase tracking-widest border border-yellow-400/20">
              Score Submitted — Awaiting Verification
            </div>
          )}

          {/* Verify/Dispute buttons — non-host accepted players */}
          {canVerify && (
            <div className="flex gap-3">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => handleVerifyScore('confirm')}
                disabled={verifyLoading}
                className="flex-1 py-4 bg-[#00ff88] text-black font-black rounded-2xl uppercase tracking-widest text-xs shadow-lg shadow-[#00ff88]/20 disabled:opacity-50"
              >
                {verifyLoading ? '...' : 'Confirm Score'}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => handleVerifyScore('dispute')}
                disabled={verifyLoading}
                className="flex-1 py-4 bg-transparent text-red-400 font-black rounded-2xl uppercase tracking-widest text-xs border-2 border-red-400/30 disabled:opacity-50"
              >
                {verifyLoading ? '...' : 'Dispute'}
              </motion.button>
            </div>
          )}

          {/* Verified */}
          {isVerified && (
            <div className="w-full py-4 bg-[#00ff88]/10 text-[#00ff88] font-bold rounded-2xl text-center text-xs uppercase tracking-widest border border-[#00ff88]/20">
              Match Verified — Ratings Updated
            </div>
          )}

          {/* Disputed */}
          {isDisputed && (
            <div className="w-full py-4 bg-red-500/10 text-red-400 font-bold rounded-2xl text-center text-xs uppercase tracking-widest border border-red-500/20">
              Score Disputed
            </div>
          )}
        </div>
      </div>
      <BottomNav />

      {/* Score Entry Bottom Sheet */}
      <AnimatePresence>
        {showScoreSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-end justify-center"
            onClick={() => setShowScoreSheet(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full max-w-[480px] bg-[#111] rounded-t-3xl border-t border-white/10 p-6 max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-4" />
              <h3 className="text-lg font-bold mb-5">Submit Match Score</h3>

              {/* Team Assignment */}
              <div className="mb-6">
                <p className="text-[10px] uppercase text-white/30 font-bold tracking-wider mb-3">Assign Teams</p>
                <div className="space-y-2">
                  {acceptedPlayers.map(player => {
                    const team = getPlayerTeamLabel(player.id)
                    return (
                      <motion.button
                        key={player.id}
                        whileTap={{ scale: 0.97 }}
                        onClick={() => toggleTeamAssignment(player.id)}
                        className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                          team === 'A'
                            ? 'bg-[#00ff88]/10 border-[#00ff88]/30'
                            : team === 'B'
                            ? 'bg-blue-500/10 border-blue-500/30'
                            : 'bg-white/5 border-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden">
                            {player.avatar_url ? (
                              <Image src={player.avatar_url} alt="" width={32} height={32} className="object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white/40">
                                {player.full_name?.charAt(0)}
                              </div>
                            )}
                          </div>
                          <div className="text-left">
                            <p className="text-sm font-semibold">{player.full_name}</p>
                            <p className="text-[10px] text-white/30">Level {player.skill_level?.toFixed(1)}</p>
                          </div>
                        </div>
                        <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                          team === 'A'
                            ? 'bg-[#00ff88]/20 text-[#00ff88]'
                            : team === 'B'
                            ? 'bg-blue-500/20 text-blue-400'
                            : 'bg-white/10 text-white/20'
                        }`}>
                          {team ? `Team ${team}` : 'Tap to assign'}
                        </span>
                      </motion.button>
                    )
                  })}
                </div>
                {/* Also include creator if they're accepted */}
                {isCreator && creator && !acceptedPlayers.find(p => p.id === creator.id) && (
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    onClick={() => toggleTeamAssignment(creator.id)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all mt-2 ${
                      getPlayerTeamLabel(creator.id) === 'A'
                        ? 'bg-[#00ff88]/10 border-[#00ff88]/30'
                        : getPlayerTeamLabel(creator.id) === 'B'
                        ? 'bg-blue-500/10 border-blue-500/30'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden">
                        {creator.avatar_url ? (
                          <Image src={creator.avatar_url} alt="" width={32} height={32} className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs font-bold text-white/40">
                            {creator.full_name?.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-sm font-semibold">{creator.full_name} (You)</p>
                        <p className="text-[10px] text-white/30">Level {creator.skill_level?.toFixed(1)}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                      getPlayerTeamLabel(creator.id) === 'A'
                        ? 'bg-[#00ff88]/20 text-[#00ff88]'
                        : getPlayerTeamLabel(creator.id) === 'B'
                        ? 'bg-blue-500/20 text-blue-400'
                        : 'bg-white/10 text-white/20'
                    }`}>
                      {getPlayerTeamLabel(creator.id) ? `Team ${getPlayerTeamLabel(creator.id)}` : 'Tap to assign'}
                    </span>
                  </motion.button>
                )}

                <div className="flex gap-3 mt-3">
                  <div className="flex-1 text-center py-1.5 rounded-lg bg-[#00ff88]/5 border border-[#00ff88]/10">
                    <span className="text-[10px] text-[#00ff88] font-bold">Team A: {teamAssignments.A.length}/2</span>
                  </div>
                  <div className="flex-1 text-center py-1.5 rounded-lg bg-blue-500/5 border border-blue-500/10">
                    <span className="text-[10px] text-blue-400 font-bold">Team B: {teamAssignments.B.length}/2</span>
                  </div>
                </div>
              </div>

              {/* Score Input */}
              <div className="mb-6">
                <p className="text-[10px] uppercase text-white/30 font-bold tracking-wider mb-3">Set Scores</p>
                {[0, 1, 2].map(setIndex => {
                  // Only show set 3 if sets 1 and 2 are split
                  if (setIndex === 2) {
                    const s1Winner = scoreEntry[0].team_a > scoreEntry[0].team_b ? 'A' : scoreEntry[0].team_a < scoreEntry[0].team_b ? 'B' : null
                    const s2Winner = scoreEntry[1].team_a > scoreEntry[1].team_b ? 'A' : scoreEntry[1].team_a < scoreEntry[1].team_b ? 'B' : null
                    if (s1Winner === s2Winner && s1Winner !== null) return null
                  }

                  return (
                    <div key={setIndex} className="flex items-center gap-3 mb-3">
                      <span className="text-[10px] text-white/30 font-bold w-10">Set {setIndex + 1}</span>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 relative">
                          <input
                            type="number"
                            min={0}
                            max={7}
                            value={scoreEntry[setIndex].team_a}
                            onChange={e => {
                              const val = Math.max(0, Math.min(7, parseInt(e.target.value) || 0))
                              setScoreEntry(prev => prev.map((s, i) => i === setIndex ? { ...s, team_a: val } : s))
                            }}
                            className="w-full bg-[#00ff88]/5 border border-[#00ff88]/20 rounded-xl p-3 text-center text-lg font-bold outline-none focus:border-[#00ff88]/50 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="absolute -top-1.5 left-2 text-[8px] text-[#00ff88]/50 font-bold">A</span>
                        </div>
                        <span className="text-white/20 font-bold">—</span>
                        <div className="flex-1 relative">
                          <input
                            type="number"
                            min={0}
                            max={7}
                            value={scoreEntry[setIndex].team_b}
                            onChange={e => {
                              const val = Math.max(0, Math.min(7, parseInt(e.target.value) || 0))
                              setScoreEntry(prev => prev.map((s, i) => i === setIndex ? { ...s, team_b: val } : s))
                            }}
                            className="w-full bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 text-center text-lg font-bold outline-none focus:border-blue-500/50 transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="absolute -top-1.5 left-2 text-[8px] text-blue-400/50 font-bold">B</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Submit */}
              <div className="flex gap-3">
                <button
                  onClick={() => setShowScoreSheet(false)}
                  disabled={submittingScore}
                  className="flex-1 py-3 bg-white/5 text-white/50 font-bold rounded-xl text-sm"
                >
                  Cancel
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSubmitScore}
                  disabled={submittingScore || teamAssignments.A.length !== 2 || teamAssignments.B.length !== 2}
                  className="flex-1 py-3 bg-[#00ff88] text-black font-bold rounded-xl text-sm disabled:opacity-50"
                >
                  {submittingScore ? 'Submitting...' : 'Submit Score'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
