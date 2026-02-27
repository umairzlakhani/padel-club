'use client'
import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'

type FriendRequest = {
  id: string
  requester_id: string
  player: {
    full_name: string
    skill_level: string
    avatar_url?: string
  }
}

type MatchRequest = {
  match_id: string
  player_id: string
  player_name: string
  player_level: number
  player_avatar?: string
  venue: string
  date: string
  time: string
}

// Pages where the bell should NOT appear (public/auth pages)
const HIDDEN_PATHS = ['/', '/login', '/apply', '/coach-apply']

export default function NotificationBell() {
  const pathname = usePathname()
  const [userId, setUserId] = useState<string | null>(null)
  const [showSheet, setShowSheet] = useState(false)
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
  const [matchRequests, setMatchRequests] = useState<MatchRequest[]>([])
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null)

  const notifCount = friendRequests.length + matchRequests.length

  const loadFriendRequests = useCallback(async (uid: string) => {
    const { data: pendingFriends } = await supabase
      .from('friends')
      .select('*')
      .eq('addressee_id', uid)
      .eq('status', 'pending')

    if (pendingFriends && pendingFriends.length > 0) {
      const requesterIds = pendingFriends.map((r: any) => r.requester_id)
      const { data: reqProfiles } = await supabase
        .from('applications')
        .select('id, full_name, skill_level, avatar_url')
        .in('id', requesterIds)
      const profileMap = new Map((reqProfiles || []).map((p: any) => [p.id, p]))
      setFriendRequests(
        pendingFriends
          .map((r: any) => ({ ...r, player: profileMap.get(r.requester_id) }))
          .filter((r: any) => r.player)
      )
    } else {
      setFriendRequests([])
    }
  }, [])

  const loadMatchRequests = useCallback(async (uid: string) => {
    const { data: userMatches } = await supabase
      .from('matches')
      .select('id, venue, date, time')
      .eq('creator_id', uid)
      .in('status', ['open', 'full'])

    if (userMatches && userMatches.length > 0) {
      const mIds = userMatches.map((m: any) => m.id)
      const matchMap: Record<string, any> = {}
      userMatches.forEach((m: any) => { matchMap[m.id] = m })

      const { data: pendingPlayers } = await supabase
        .from('match_players')
        .select('match_id, player_id')
        .in('match_id', mIds)
        .eq('status', 'pending')

      if (pendingPlayers && pendingPlayers.length > 0) {
        const playerIds = [...new Set(pendingPlayers.map((p: any) => p.player_id))]
        const { data: playerData } = await supabase
          .from('applications')
          .select('id, full_name, skill_level, avatar_url')
          .in('id', playerIds)
        const playerMap: Record<string, any> = {}
        playerData?.forEach((p: any) => { playerMap[p.id] = p })

        setMatchRequests(
          pendingPlayers.map((p: any) => {
            const match = matchMap[p.match_id]
            const player = playerMap[p.player_id]
            return {
              match_id: p.match_id,
              player_id: p.player_id,
              player_name: player?.full_name || 'Unknown',
              player_level: parseFloat(player?.skill_level) || 2.5,
              player_avatar: player?.avatar_url,
              venue: match?.venue || '',
              date: match?.date ? new Date(match.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' }) : '',
              time: match?.time || '',
            }
          })
        )
      } else {
        setMatchRequests([])
      }
    } else {
      setMatchRequests([])
    }
  }, [])

  // Initial load
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      await Promise.all([loadFriendRequests(user.id), loadMatchRequests(user.id)])
    }
    init()
  }, [loadFriendRequests, loadMatchRequests])

  // Real-time subscription
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel('global-notifications')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friends' }, () => {
        loadFriendRequests(userId)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'match_players' }, () => {
        loadMatchRequests(userId)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, loadFriendRequests, loadMatchRequests])

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(t)
  }, [toast])

  // Actions
  async function handleAcceptFriend(row: FriendRequest) {
    setActionLoading(row.id)
    const { error } = await supabase.from('friends').update({ status: 'accepted' }).eq('id', row.id)
    if (error) {
      setToast({ message: 'Failed to accept request', type: 'error' })
    } else {
      setToast({ message: 'Friend request accepted!', type: 'success' })
      setFriendRequests((prev) => prev.filter((r) => r.id !== row.id))
    }
    setActionLoading(null)
  }

  async function handleDeclineFriend(row: FriendRequest) {
    setActionLoading(row.id)
    const { error } = await supabase.from('friends').delete().eq('id', row.id)
    if (error) {
      setToast({ message: 'Failed to decline request', type: 'error' })
    } else {
      setToast({ message: 'Request declined', type: 'success' })
      setFriendRequests((prev) => prev.filter((r) => r.id !== row.id))
    }
    setActionLoading(null)
  }

  async function handleAcceptMatch(req: MatchRequest) {
    const key = `${req.match_id}-${req.player_id}`
    setActionLoading(key)
    try {
      const res = await fetch('/api/accept-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: req.match_id, player_id: req.player_id }),
      })
      const result = await res.json()
      if (!res.ok || result.error) {
        setToast({ message: result.error || 'Failed to accept', type: 'error' })
      } else {
        setToast({ message: `${req.player_name} accepted!`, type: 'success' })
        setMatchRequests((prev) => prev.filter((r) => !(r.match_id === req.match_id && r.player_id === req.player_id)))
      }
    } catch {
      setToast({ message: 'Failed to accept', type: 'error' })
    }
    setActionLoading(null)
  }

  async function handleDeclineMatch(req: MatchRequest) {
    const key = `${req.match_id}-${req.player_id}`
    setActionLoading(key)
    try {
      const res = await fetch('/api/decline-player', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_id: req.match_id, player_id: req.player_id }),
      })
      const result = await res.json()
      if (!res.ok || result.error) {
        setToast({ message: result.error || 'Failed to decline', type: 'error' })
      } else {
        setToast({ message: 'Request declined', type: 'success' })
        setMatchRequests((prev) => prev.filter((r) => !(r.match_id === req.match_id && r.player_id === req.player_id)))
      }
    } catch {
      setToast({ message: 'Failed to decline', type: 'error' })
    }
    setActionLoading(null)
  }

  // Hide on public pages or if not logged in
  if (HIDDEN_PATHS.includes(pathname) || !userId) return null

  return (
    <>
      {/* Floating Bell Button — top right */}
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowSheet(true)}
        className="fixed top-[max(0.75rem,env(safe-area-inset-top))] right-4 z-[60] w-11 h-11 bg-[#111]/90 backdrop-blur-md border border-white/10 rounded-full flex items-center justify-center shadow-lg"
        aria-label="Notifications"
      >
        <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {notifCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[10px] font-bold flex items-center justify-center text-white">
            {notifCount > 9 ? '9+' : notifCount}
          </span>
        )}
      </motion.button>

      {/* Inline Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-[max(4rem,calc(env(safe-area-inset-top)+3.5rem))] left-1/2 -translate-x-1/2 z-[120] px-4 py-2.5 rounded-xl text-xs font-bold shadow-lg ${
              toast.type === 'success' ? 'bg-[#00ff88] text-black' : 'bg-red-500 text-white'
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Sheet */}
      <AnimatePresence>
        {showSheet && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-end justify-center"
            onClick={() => setShowSheet(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full max-w-[480px] bg-[#111] rounded-t-3xl border-t border-white/10 max-h-[75vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-center pt-3 pb-2">
                <div className="w-10 h-1 bg-white/10 rounded-full" />
              </div>
              <div className="px-6 pb-8">
                <div className="flex items-center gap-2 mb-5">
                  <h3 className="text-lg font-bold text-white">Notifications</h3>
                  {notifCount > 0 && (
                    <span className="text-[10px] font-bold bg-red-500/15 text-red-400 px-2 py-0.5 rounded-full">
                      {notifCount}
                    </span>
                  )}
                </div>

                {notifCount === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-3">
                      <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="text-white/15">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                      </svg>
                    </div>
                    <p className="text-white/30 text-sm">No notifications</p>
                    <p className="text-white/15 text-xs mt-1">Friend requests and match join requests will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {/* Friend Requests */}
                    {friendRequests.length > 0 && (
                      <section>
                        <h4 className="text-[10px] uppercase font-bold tracking-wider text-white/30 mb-3">Friend Requests</h4>
                        <div className="space-y-2">
                          {friendRequests.map((req) => (
                            <div key={req.id} className="bg-white/5 rounded-2xl p-4">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-white/10 flex items-center justify-center overflow-hidden">
                                  {req.player.avatar_url ? (
                                    <img src={req.player.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                                  ) : (
                                    <span className="text-xs font-bold text-white/60">{req.player.full_name?.charAt(0)}</span>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-white truncate">{req.player.full_name}</p>
                                  <p className="text-xs text-white/30">Level {parseFloat(req.player.skill_level || '0').toFixed(1)}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {actionLoading === req.id ? (
                                  <div className="flex-1 flex justify-center py-2.5">
                                    <div className="w-4 h-4 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => handleAcceptFriend(req)}
                                      className="flex-1 py-2.5 bg-[#00ff88] text-black font-bold rounded-xl text-xs uppercase tracking-wider"
                                    >
                                      Accept
                                    </button>
                                    <button
                                      onClick={() => handleDeclineFriend(req)}
                                      className="flex-1 py-2.5 bg-white/5 text-white/40 font-bold rounded-xl text-xs uppercase tracking-wider border border-white/10"
                                    >
                                      Decline
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )}

                    {/* Match Join Requests */}
                    {matchRequests.length > 0 && (
                      <section>
                        <h4 className="text-[10px] uppercase font-bold tracking-wider text-white/30 mb-3">Match Join Requests</h4>
                        <div className="space-y-2">
                          {matchRequests.map((req) => {
                            const key = `${req.match_id}-${req.player_id}`
                            return (
                              <div key={key} className="bg-white/5 rounded-2xl p-4">
                                <div className="flex items-center gap-3 mb-2">
                                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-white/10 flex items-center justify-center overflow-hidden">
                                    {req.player_avatar ? (
                                      <img src={req.player_avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                                    ) : (
                                      <span className="text-xs font-bold text-white/60">{req.player_name?.charAt(0)}</span>
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-white truncate">{req.player_name}</p>
                                    <p className="text-xs text-white/30">Level {req.player_level.toFixed(1)}</p>
                                  </div>
                                </div>
                                <p className="text-xs text-white/20 mb-3">{req.venue} · {req.date} · {req.time}</p>
                                <div className="flex gap-2">
                                  {actionLoading === key ? (
                                    <div className="flex-1 flex justify-center py-2.5">
                                      <div className="w-4 h-4 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
                                    </div>
                                  ) : (
                                    <>
                                      <button
                                        onClick={() => handleAcceptMatch(req)}
                                        className="flex-1 py-2.5 bg-[#00ff88] text-black font-bold rounded-xl text-xs uppercase tracking-wider"
                                      >
                                        Accept
                                      </button>
                                      <button
                                        onClick={() => handleDeclineMatch(req)}
                                        className="flex-1 py-2.5 bg-white/5 text-white/40 font-bold rounded-xl text-xs uppercase tracking-wider border border-white/10"
                                      >
                                        Decline
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </section>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
