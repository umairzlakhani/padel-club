'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/app/components/BottomNav'
import Toast from '@/app/components/Toast'
import Avatar from '@/app/components/Avatar'
import { motion, AnimatePresence } from 'framer-motion'

type Player = {
  id: string
  full_name: string
  skill_level: string
  avatar_url?: string
}

type FriendRow = {
  id: string
  requester_id: string
  addressee_id: string
  status: 'pending' | 'accepted' | 'declined'
  created_at: string
}

type Tab = 'search' | 'friends' | 'requests'
type SkillFilter = 'all' | '1.0-2.0' | '2.0-3.0' | '3.0-4.0' | '4.0+'

const SKILL_FILTERS: { key: SkillFilter; label: string; min?: number; max?: number }[] = [
  { key: 'all', label: 'All' },
  { key: '1.0-2.0', label: '1.0–2.0', min: 1.0, max: 2.0 },
  { key: '2.0-3.0', label: '2.0–3.0', min: 2.0, max: 3.0 },
  { key: '3.0-4.0', label: '3.0–4.0', min: 3.0, max: 4.0 },
  { key: '4.0+', label: '4.0+', min: 4.0, max: 10.0 },
]

export default function AddPlayerPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>('search')
  const [search, setSearch] = useState('')
  const [skillFilter, setSkillFilter] = useState<SkillFilter>('all')
  const [results, setResults] = useState<Player[]>([])
  const [searching, setSearching] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Friend relationships
  const [friendRows, setFriendRows] = useState<FriendRow[]>([])
  const [friends, setFriends] = useState<Player[]>([])
  const [incomingRequests, setIncomingRequests] = useState<(FriendRow & { player: Player })[]>([])
  const [loadingFriends, setLoadingFriends] = useState(true)

  // Action states
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })

  const debounceRef = useRef<NodeJS.Timeout | null>(null)

  // Load current user + friend data
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      await loadFriendData(user.id)
    }
    init()
  }, [])

  async function loadFriendData(uid: string) {
    setLoadingFriends(true)

    // Fetch all friend rows involving this user
    const { data: rows } = await supabase
      .from('friends')
      .select('*')
      .or(`requester_id.eq.${uid},addressee_id.eq.${uid}`)

    const allRows = (rows || []) as FriendRow[]
    setFriendRows(allRows)

    // Accepted friends — fetch their profiles
    const acceptedIds = allRows
      .filter(r => r.status === 'accepted')
      .map(r => r.requester_id === uid ? r.addressee_id : r.requester_id)

    if (acceptedIds.length > 0) {
      const { data: friendProfiles } = await supabase
        .from('applications')
        .select('id, full_name, skill_level, avatar_url')
        .in('id', acceptedIds)
      setFriends((friendProfiles || []) as Player[])
    } else {
      setFriends([])
    }

    // Incoming pending requests — fetch requester profiles
    const incoming = allRows.filter(r => r.addressee_id === uid && r.status === 'pending')
    if (incoming.length > 0) {
      const requesterIds = incoming.map(r => r.requester_id)
      const { data: reqProfiles } = await supabase
        .from('applications')
        .select('id, full_name, skill_level, avatar_url')
        .in('id', requesterIds)

      const profileMap = new Map((reqProfiles || []).map(p => [p.id, p as Player]))
      setIncomingRequests(
        incoming.map(r => ({ ...r, player: profileMap.get(r.requester_id)! })).filter(r => r.player)
      )
    } else {
      setIncomingRequests([])
    }

    setLoadingFriends(false)
  }

  // Fetch players by skill filter (browse mode)
  const loadBySkillFilter = useCallback(async (filter: SkillFilter, query: string) => {
    setSearching(true)
    const filterDef = SKILL_FILTERS.find(f => f.key === filter)

    let q = supabase
      .from('applications')
      .select('id, full_name, skill_level, avatar_url')
      .neq('id', userId || '')
      .eq('status', 'member')

    if (query.trim().length >= 2) {
      q = q.ilike('full_name', `%${query.trim()}%`)
    }

    if (filterDef && filterDef.min !== undefined && filterDef.max !== undefined) {
      q = q.gte('skill_level', filterDef.min).lte('skill_level', filterDef.max)
    }

    const { data } = await q.order('skill_level', { ascending: true }).limit(30)
    setResults((data || []) as Player[])
    setSearching(false)
  }, [userId])

  // Debounced search
  const handleSearch = useCallback((query: string) => {
    setSearch(query)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (query.trim().length < 2 && skillFilter === 'all') {
      setResults([])
      setSearching(false)
      return
    }

    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      await loadBySkillFilter(skillFilter, query)
    }, 400)
  }, [userId, skillFilter, loadBySkillFilter])

  // When skill filter changes, re-run search
  function handleSkillFilterChange(filter: SkillFilter) {
    setSkillFilter(filter)
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (filter === 'all' && search.trim().length < 2) {
      setResults([])
      setSearching(false)
      return
    }

    setSearching(true)
    debounceRef.current = setTimeout(async () => {
      await loadBySkillFilter(filter, search)
    }, 200)
  }

  // Get relationship status with a player
  function getRelationship(playerId: string): { status: string; row?: FriendRow } {
    const row = friendRows.find(
      r => (r.requester_id === userId && r.addressee_id === playerId) ||
           (r.addressee_id === userId && r.requester_id === playerId)
    )
    if (!row) return { status: 'none' }
    if (row.status === 'accepted') return { status: 'friends', row }
    if (row.status === 'pending' && row.requester_id === userId) return { status: 'sent', row }
    if (row.status === 'pending' && row.addressee_id === userId) return { status: 'incoming', row }
    return { status: 'none' }
  }

  // Send friend request
  async function sendRequest(playerId: string) {
    if (!userId) return
    setActionLoading(playerId)
    const { error } = await supabase.from('friends').insert({
      requester_id: userId,
      addressee_id: playerId,
    })

    if (error) {
      console.error('Friend request error:', error)
      setToast({ visible: true, message: error.message || 'Could not send request', type: 'error' })
    } else {
      // Post to activity feed (non-blocking — don't let this fail the request)
      supabase.from('activity_feed').insert({
        user_id: userId,
        type: 'friend_request',
        title: 'Sent a friend request',
        metadata: { to: playerId },
      }).then(() => {})
      setToast({ visible: true, message: 'Friend request sent!', type: 'success' })
      await loadFriendData(userId)
    }
    setActionLoading(null)
  }

  // Accept request
  async function acceptRequest(row: FriendRow) {
    setActionLoading(row.id)
    await supabase.from('friends').update({ status: 'accepted' }).eq('id', row.id)
    setToast({ visible: true, message: 'Friend request accepted!', type: 'success' })
    if (userId) await loadFriendData(userId)
    setActionLoading(null)
  }

  // Decline request
  async function declineRequest(row: FriendRow) {
    setActionLoading(row.id)
    await supabase.from('friends').delete().eq('id', row.id)
    setToast({ visible: true, message: 'Request declined', type: 'success' })
    if (userId) await loadFriendData(userId)
    setActionLoading(null)
  }

  // Remove friend
  async function removeFriend(playerId: string) {
    const rel = getRelationship(playerId)
    if (!rel.row) return
    setActionLoading(playerId)
    await supabase.from('friends').delete().eq('id', rel.row.id)
    setToast({ visible: true, message: 'Friend removed', type: 'success' })
    if (userId) await loadFriendData(userId)
    setActionLoading(null)
  }

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'search', label: 'Search' },
    { key: 'friends', label: 'Friends', count: friends.length },
    { key: 'requests', label: 'Requests', count: incomingRequests.length },
  ]

  function renderActionButton(player: Player) {
    const rel = getRelationship(player.id)
    const isLoading = actionLoading === player.id

    if (isLoading) {
      return (
        <div className="w-8 h-8 flex items-center justify-center">
          <div className="w-4 h-4 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
        </div>
      )
    }

    switch (rel.status) {
      case 'friends':
        return (
          <button
            onClick={() => removeFriend(player.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#00ff88]/10 text-[#00ff88] min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            Friends ✓
          </button>
        )
      case 'sent':
        return (
          <span className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 text-white/40 min-h-[44px] flex items-center">
            Pending
          </span>
        )
      case 'incoming':
        return (
          <div className="flex gap-1.5">
            <button
              onClick={() => acceptRequest(rel.row!)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#00ff88] text-black min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              Accept
            </button>
            <button
              onClick={() => declineRequest(rel.row!)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 text-white/40 min-w-[44px] min-h-[44px] flex items-center justify-center"
            >
              ✕
            </button>
          </div>
        )
      default:
        return (
          <button
            onClick={() => sendRequest(player.id)}
            className="px-4 py-1.5 rounded-lg text-xs font-bold bg-[#00ff88] text-black hover:bg-[#00ff88]/90 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            Add Friend
          </button>
        )
    }
  }

  function renderPlayerCard(player: Player, showAction = true) {
    return (
      <motion.div
        key={player.id}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 p-3 rounded-xl bg-[#111] border border-white/5"
      >
        <Link href={`/profile/${player.id}`} className="flex items-center gap-3 flex-1 min-w-0">
          <Avatar src={player.avatar_url} name={player.full_name} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{player.full_name}</p>
            <p className="text-[11px] text-white/30">Level {parseFloat(player.skill_level || '0').toFixed(1)}</p>
          </div>
        </Link>
        {showAction && renderActionButton(player)}
      </motion.div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex justify-center overflow-y-auto">
      <div className="w-full max-w-[480px] min-h-screen relative pb-24 page-transition">
        {/* Header */}
        <div className="pt-12 pb-4 px-6">
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => router.back()}
              className="text-white/40 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
              aria-label="Go back"
            >
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Players</h1>
              <p className="text-white/30 text-sm">Find & add friends</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 mb-4">
          <div className="flex gap-1 bg-white/5 rounded-xl p-1">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all relative min-h-[44px] flex items-center justify-center gap-1.5 ${
                  activeTab === tab.key
                    ? 'bg-white/10 text-white'
                    : 'text-white/40'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    tab.key === 'requests' && activeTab !== 'requests'
                      ? 'bg-[#00ff88] text-black'
                      : 'bg-white/10 text-white/50'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Search Tab */}
        <AnimatePresence mode="wait">
          {activeTab === 'search' && (
            <motion.div
              key="search"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {/* Search Bar */}
              <div className="px-6 mb-3">
                <div className="relative">
                  <svg
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"
                    width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search players by name..."
                    value={search}
                    onChange={(e) => handleSearch(e.target.value)}
                    className="w-full bg-white/5 border border-white/5 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#00ff88]/30 transition-colors"
                  />
                </div>
              </div>

              {/* Skill Level Filter Chips */}
              <div className="px-6 mb-4">
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                  {SKILL_FILTERS.map(f => (
                    <button
                      key={f.key}
                      onClick={() => handleSkillFilterChange(f.key)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all shrink-0 ${
                        skillFilter === f.key
                          ? 'bg-[#00ff88] text-black'
                          : 'bg-white/5 text-white/40 hover:bg-white/10'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="px-6">
                {searching ? (
                  <div className="flex justify-center py-16">
                    <div className="w-6 h-6 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : results.length > 0 ? (
                  <div className="space-y-2">
                    {skillFilter !== 'all' && search.trim().length < 2 && (
                      <p className="text-white/30 text-xs font-semibold uppercase tracking-wider mb-3">Browse by Level</p>
                    )}
                    {results.map(player => renderPlayerCard(player))}
                  </div>
                ) : skillFilter !== 'all' ? (
                  <div className="text-center py-16">
                    <div className="text-white/10 text-4xl mb-3">🔍</div>
                    <p className="text-white/30 text-sm">No players at this level</p>
                    <p className="text-white/20 text-xs mt-1">Try a different skill range</p>
                  </div>
                ) : search.trim().length >= 2 ? (
                  <div className="text-center py-16">
                    <div className="text-white/10 text-4xl mb-3">🔍</div>
                    <p className="text-white/30 text-sm">No players found</p>
                    <p className="text-white/20 text-xs mt-1">Try a different name</p>
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className="text-white/10 text-4xl mb-3">👥</div>
                    <p className="text-white/30 text-sm">Search for players</p>
                    <p className="text-white/20 text-xs mt-1">Type a name or select a skill level</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Friends Tab */}
          {activeTab === 'friends' && (
            <motion.div
              key="friends"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="px-6"
            >
              {loadingFriends ? (
                <div className="flex justify-center py-16">
                  <div className="w-6 h-6 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : friends.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-white/10 text-4xl mb-3">👋</div>
                  <p className="text-white/30 text-sm">No friends yet</p>
                  <p className="text-white/20 text-xs mt-1">Search for players to add</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {friends.map(player => renderPlayerCard(player))}
                </div>
              )}
            </motion.div>
          )}

          {/* Requests Tab */}
          {activeTab === 'requests' && (
            <motion.div
              key="requests"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="px-6"
            >
              {loadingFriends ? (
                <div className="flex justify-center py-16">
                  <div className="w-6 h-6 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : incomingRequests.length === 0 ? (
                <div className="text-center py-16">
                  <div className="text-white/10 text-4xl mb-3">📬</div>
                  <p className="text-white/30 text-sm">No pending requests</p>
                  <p className="text-white/20 text-xs mt-1">Friend requests will appear here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {incomingRequests.map(req => (
                    <motion.div
                      key={req.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 p-3 rounded-xl bg-[#111] border border-white/5"
                    >
                      <Link href={`/profile/${req.player.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                        <Avatar src={req.player.avatar_url} name={req.player.full_name} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold truncate">{req.player.full_name}</p>
                          <p className="text-[11px] text-white/30">Level {parseFloat(req.player.skill_level || '0').toFixed(1)}</p>
                        </div>
                      </Link>
                      <div className="flex gap-1.5">
                        {actionLoading === req.id ? (
                          <div className="w-8 h-8 flex items-center justify-center">
                            <div className="w-4 h-4 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => acceptRequest(req)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#00ff88] text-black min-w-[44px] min-h-[44px] flex items-center justify-center"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => declineRequest(req)}
                              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-white/5 text-white/40 min-w-[44px] min-h-[44px] flex items-center justify-center"
                            >
                              ✕
                            </button>
                          </>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <BottomNav />
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast(t => ({ ...t, visible: false }))} />
    </div>
  )
}
