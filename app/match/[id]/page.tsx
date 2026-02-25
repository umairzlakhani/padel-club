'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { CLUBS } from '@/lib/clubs'
import { IMAGES } from '@/lib/images'
import { hapticLight, hapticMedium } from '@/lib/haptics'
import BottomNav from '@/app/components/BottomNav'
import Toast from '@/app/components/Toast'
import PlayerSlots from '@/app/components/PlayerSlots'

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

    // Fetch creator profile
    const { data: creatorData } = await supabase
      .from('applications')
      .select('id, full_name, avatar_url, skill_level')
      .eq('id', m.creator_id)
      .single()
    setCreator(creatorData as Player)

    // Fetch all match_players
    const { data: mp } = await supabase
      .from('match_players')
      .select('player_id, status')
      .eq('match_id', id)

    const accepted = (mp || []).filter((p: any) => p.status === 'accepted').map((p: any) => p.player_id)
    const pending = (mp || []).filter((p: any) => p.status === 'pending').map((p: any) => p.player_id)

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

    const { error } = await supabase
      .from('match_players')
      .insert({ match_id: id, player_id: userId, status: 'pending' })

    if (error) {
      if (error.code === '23505') {
        showToast('Already requested', 'error')
      } else {
        showToast('Failed to send request', 'error')
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
    setActionLoading(false)
  }

  async function handleAccept(playerId: string) {
    hapticMedium()
    const { error } = await supabase
      .from('match_players')
      .update({ status: 'accepted' })
      .eq('match_id', id)
      .eq('player_id', playerId)

    if (error) { showToast('Failed to accept', 'error'); return }

    // Increment current_players
    if (match) {
      const newCount = match.current_players + 1
      const newStatus = newCount >= match.max_players ? 'full' : 'open'
      await supabase
        .from('matches')
        .update({ current_players: newCount, status: newStatus })
        .eq('id', id)
    }

    showToast('Player accepted!')
    await loadMatch(userId)
  }

  async function handleDecline(playerId: string) {
    hapticLight()
    await supabase
      .from('match_players')
      .delete()
      .eq('match_id', id)
      .eq('player_id', playerId)

    showToast('Request declined')
    await loadMatch(userId)
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

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex justify-center overflow-y-auto">
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast(t => ({ ...t, visible: false }))} />
      <div className="w-full max-w-[480px] min-h-screen relative pb-32 page-transition">

        {/* Venue Hero */}
        <div className="relative w-full aspect-[2.2/1] overflow-hidden">
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
            <span className={`text-[10px] font-bold uppercase px-3 py-1.5 rounded-full backdrop-blur-sm ${
              match.status === 'open' ? 'bg-[#00ff88]/20 text-[#00ff88]'
                : match.status === 'full' ? 'bg-blue-500/20 text-blue-400'
                : 'bg-white/10 text-white/40'
            }`}>
              {match.status}
            </span>
          </div>

          {/* Venue info */}
          <div className="absolute bottom-4 left-5 right-5">
            <h1 className="text-2xl font-bold drop-shadow-lg">{match.venue}</h1>
            {venue && <p className="text-white/50 text-sm drop-shadow">{venue.location}</p>}
          </div>
        </div>

        <div className="px-6 pt-5 space-y-6">

          {/* Date / Time / Skill */}
          <div className="flex gap-3">
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
          </div>

          {/* Player Slots */}
          <section>
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
          </section>

          {/* Match Info */}
          <section>
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
          </section>
        </div>

        {/* Bottom Action Button */}
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-[480px] px-6 z-30">
          {canJoin && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleRequestJoin}
              disabled={actionLoading}
              className="w-full py-4 bg-[#00ff88] text-black font-black rounded-2xl uppercase tracking-widest text-xs shadow-lg shadow-[#00ff88]/20 disabled:opacity-50"
            >
              {actionLoading ? 'Sending...' : 'Request to Join'}
            </motion.button>
          )}
          {isPending && (
            <div className="w-full py-4 bg-yellow-400/10 text-yellow-400 font-bold rounded-2xl text-center text-xs uppercase tracking-widest border border-yellow-400/20">
              Request Pending — Waiting for approval
            </div>
          )}
          {isAccepted && !isCreator && (
            <div className="w-full py-4 bg-[#00ff88]/10 text-[#00ff88] font-bold rounded-2xl text-center text-xs uppercase tracking-widest border border-[#00ff88]/20">
              You&#39;re In! See you on the court
            </div>
          )}
          {isCreator && (
            <div className="w-full py-4 bg-white/5 text-white/50 font-bold rounded-2xl text-center text-xs uppercase tracking-widest border border-white/10">
              Your Match — {pendingPlayers.length > 0 ? `${pendingPlayers.length} pending request${pendingPlayers.length > 1 ? 's' : ''}` : 'Waiting for players'}
            </div>
          )}
          {match.status === 'full' && !isAccepted && !isCreator && (
            <div className="w-full py-4 bg-white/5 text-white/30 font-bold rounded-2xl text-center text-xs uppercase tracking-widest border border-white/5">
              Match Full
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
