'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { hapticLight, hapticMedium } from '@/lib/haptics'
import BottomNav from '@/app/components/BottomNav'
import Toast from '@/app/components/Toast'

type ActivityItem = {
  id: string
  user_id: string
  type: 'match_created' | 'match_joined' | 'booking' | 'tournament_registered' | 'match_cancelled' | 'friend_request' | 'join_requested' | 'join_accepted'
  title: string
  description: string | null
  metadata: Record<string, any>
  created_at: string
  user_name?: string
  user_avatar?: string
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; label: string }> = {
  match_created: {
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    ),
    color: '#00ff88',
    label: 'New Match',
  },
  match_joined: {
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    color: '#3B82F6',
    label: 'Joined',
  },
  join_requested: {
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: '#EAB308',
    label: 'Requested',
  },
  join_accepted: {
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    ),
    color: '#00ff88',
    label: 'Accepted',
  },
  booking: {
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    color: '#f97316',
    label: 'Booking',
  },
  tournament_registered: {
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 4v12l-4-2-4 2V4M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    color: '#a855f7',
    label: 'Tournament',
  },
  match_cancelled: {
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    color: '#ef4444',
    label: 'Cancelled',
  },
  friend_request: {
    icon: (
      <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
    ),
    color: '#06b6d4',
    label: 'Friend',
  },
}

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 }

export default function FeedPage() {
  const [feed, setFeed] = useState<ActivityItem[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [friendIds, setFriendIds] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [requestedMatchIds, setRequestedMatchIds] = useState<Set<string>>(new Set())
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type })
  }, [])

  const loadFriendIds = useCallback(async (uid: string): Promise<string[]> => {
    const { data: friendRows } = await supabase
      .from('friends')
      .select('requester_id, addressee_id')
      .eq('status', 'accepted')
      .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`)

    if (!friendRows || friendRows.length === 0) return []

    const ids = friendRows.map((row: any) =>
      row.requester_id === uid ? row.addressee_id : row.requester_id
    )
    return ids
  }, [])

  const loadFeed = useCallback(async (uid: string, fIds: string[]) => {
    // Include the user's own ID so they see their own activity too
    const allIds = [...fIds, uid]

    if (allIds.length === 0) {
      setFeed([])
      setLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('activity_feed')
      .select('*')
      .in('user_id', allIds)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error && data && data.length > 0) {
      const userIds = [...new Set(data.map((d: any) => d.user_id))]
      const { data: users } = await supabase
        .from('applications')
        .select('id, full_name')
        .in('id', userIds)

      const nameMap: Record<string, string> = {}
      users?.forEach((u: any) => { nameMap[u.id] = u.full_name })

      setFeed(data.map((d: any) => ({
        ...d,
        user_name: nameMap[d.user_id] || 'Unknown',
        user_avatar: (nameMap[d.user_id] || 'U').split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase(),
      })))
    } else {
      setFeed([])
    }

    // Load which matches user has already requested to join
    const { data: myPlays } = await supabase
      .from('match_players')
      .select('match_id')
      .eq('player_id', uid)

    if (myPlays) {
      setRequestedMatchIds(new Set(myPlays.map((mp: any) => mp.match_id)))
    }

    setLoading(false)
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        const fIds = await loadFriendIds(user.id)
        setFriendIds(fIds)
        await loadFeed(user.id, fIds)
      } else {
        setLoading(false)
      }
    }
    init()
  }, [loadFeed, loadFriendIds])

  // Real-time subscription for activity feed — filter client-side to friends
  useEffect(() => {
    if (!userId) return
    const allIds = new Set([...friendIds, userId])

    const channel = supabase
      .channel('feed-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_feed' }, async (payload) => {
        const newItem = payload.new as any
        if (!allIds.has(newItem.user_id)) return

        const { data: userData } = await supabase
          .from('applications')
          .select('full_name')
          .eq('id', newItem.user_id)
          .single()

        const uName = userData?.full_name || 'Unknown'
        const avatar = uName.split(' ').map((w: string) => w[0]).join('').slice(0, 2).toUpperCase()

        setFeed((prev) => [{
          ...newItem,
          user_name: uName,
          user_avatar: avatar,
        }, ...prev])

        hapticLight()
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, friendIds])

  async function handleRequestJoin(matchId: string) {
    if (!userId) {
      showToast('Please sign in', 'error')
      return
    }
    hapticMedium()

    const { error } = await supabase
      .from('match_players')
      .insert({ match_id: matchId, player_id: userId, status: 'pending' })

    if (error) {
      if (error.code === '23505') {
        showToast('Already requested', 'error')
      } else {
        showToast('Failed to send request', 'error')
      }
      return
    }

    setRequestedMatchIds((prev) => new Set([...prev, matchId]))
    showToast('Request sent!')
  }

  async function handleRefresh() {
    if (!userId) return
    setRefreshing(true)
    hapticLight()
    const fIds = await loadFriendIds(userId)
    setFriendIds(fIds)
    await loadFeed(userId, fIds)
    setRefreshing(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
          <span className="text-white/40 text-sm font-medium">Loading feed...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex justify-center overflow-y-auto">
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast((t) => ({ ...t, visible: false }))} />
      <div className="w-full max-w-[480px] min-h-screen relative pb-24">
        {/* Header */}
        <div className="pt-12 pb-4 px-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Activity</h1>
              <p className="text-white/30 text-sm">Friends Activity</p>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleRefresh}
              disabled={refreshing}
              className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center border border-white/5 hover:border-white/10 transition-colors disabled:opacity-50"
            >
              <motion.svg
                animate={refreshing ? { rotate: 360 } : {}}
                transition={refreshing ? { duration: 0.8, repeat: Infinity, ease: 'linear' } : {}}
                width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </motion.svg>
            </motion.button>
          </div>
        </div>

        {/* Live indicator */}
        <div className="px-6 mb-4">
          <div className="flex items-center gap-2 bg-white/[0.03] rounded-xl px-4 py-2.5 border border-white/5">
            <span className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
            <span className="text-[11px] text-white/40 font-medium">Live updates enabled</span>
          </div>
        </div>

        {/* Feed Items */}
        <div className="px-6 space-y-3">
          <AnimatePresence initial={false}>
            {feed.map((item, i) => {
              const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.match_created
              const hasMatchId = item.type === 'match_created' && item.metadata?.match_id
              const alreadyRequested = hasMatchId && requestedMatchIds.has(item.metadata.match_id)
              // Don't show join button on user's own match_created posts
              const isOwnPost = item.user_id === userId

              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ delay: i < 10 ? i * 0.04 : 0, ...spring }}
                  className="bg-[#111] rounded-2xl border border-white/5 p-4 hover:border-white/10 transition-colors"
                >
                  <div className="flex gap-3.5">
                    {/* Avatar */}
                    <Link href={`/profile/${item.user_id}`} className="shrink-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1a1a2e] to-[#16213e] flex items-center justify-center border border-white/10">
                        <span className="text-[11px] font-bold text-white/60">{item.user_avatar}</span>
                      </div>
                    </Link>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <p className="text-[13px] font-semibold leading-snug">{item.title}</p>
                        <span className="text-[10px] text-white/20 font-medium shrink-0">{relativeTime(item.created_at)}</span>
                      </div>

                      {item.description && (
                        <p className="text-[11px] text-white/30 leading-relaxed mb-2">{item.description}</p>
                      )}

                      {/* Type badge */}
                      <div className="flex items-center gap-1.5">
                        <div
                          className="w-5 h-5 rounded-md flex items-center justify-center"
                          style={{ backgroundColor: `${config.color}15`, color: config.color }}
                        >
                          {config.icon}
                        </div>
                        <span
                          className="text-[9px] font-bold uppercase tracking-wider"
                          style={{ color: config.color }}
                        >
                          {config.label}
                        </span>
                      </div>

                      {/* Request to Join button for match_created items */}
                      {hasMatchId && !isOwnPost && (
                        <div className="mt-3">
                          {alreadyRequested ? (
                            <button className="w-full py-2 bg-white/5 text-white/30 font-bold rounded-xl text-[11px] uppercase tracking-wider cursor-default">
                              Requested
                            </button>
                          ) : (
                            <motion.button
                              whileTap={{ scale: 0.97 }}
                              onClick={() => handleRequestJoin(item.metadata.match_id)}
                              className="w-full py-2 bg-[#00ff88]/10 text-[#00ff88] font-bold rounded-xl text-[11px] uppercase tracking-wider border border-[#00ff88]/20 hover:bg-[#00ff88]/20 transition-all"
                            >
                              Request to Join
                            </motion.button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>

          {feed.length === 0 && (
            <div className="text-center py-16">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="text-white/15">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <p className="text-white/30 text-sm font-medium">Your friends&apos; activities will appear here</p>
              <p className="text-white/20 text-xs mt-1 mb-4">Follow players to see their updates</p>
              <Link
                href="/add-player"
                className="inline-block px-5 py-2.5 bg-[#00ff88] text-black text-xs font-bold uppercase rounded-xl"
              >
                Find Players
              </Link>
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
