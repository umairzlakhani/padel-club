'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/app/components/BottomNav'
import Toast from '@/app/components/Toast'

// Mock data removed — match history and level evolution will use real data

export default function ProfilePage() {
  const router = useRouter()
  const [p, setP] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Social counts
  const [followers, setFollowers] = useState(0)
  const [following, setFollowing] = useState(0)

  // Edit profile modal
  const [showEditProfile, setShowEditProfile] = useState(false)
  const [editName, setEditName] = useState('')
  const [editHand, setEditHand] = useState('Right')
  const [editSaving, setEditSaving] = useState(false)

  // Collapsible upcoming games
  const [gamesExpanded, setGamesExpanded] = useState(false)
  const [upcomingGames, setUpcomingGames] = useState<any[]>([])

  // My Bookings
  const [bookings, setBookings] = useState<any[]>([])

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type })
  }, [])

  useEffect(() => {
    async function getProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        const { data } = await supabase.from('applications').select('*').eq('id', user.id).single()
        setP(data)
        if (data?.avatar_url) setAvatarUrl(data.avatar_url)

        // Load followers (accepted friends where user is addressee)
        const { count: followerCount } = await supabase
          .from('friends')
          .select('id', { count: 'exact', head: true })
          .eq('addressee_id', user.id)
          .eq('status', 'accepted')
        setFollowers(followerCount || 0)

        // Load following (accepted friends where user is requester)
        const { count: followingCount } = await supabase
          .from('friends')
          .select('id', { count: 'exact', head: true })
          .eq('requester_id', user.id)
          .eq('status', 'accepted')
        setFollowing(followingCount || 0)

        // Load upcoming games
        const { data: mp } = await supabase
          .from('match_players')
          .select('match_id')
          .eq('player_id', user.id)
          .eq('status', 'accepted')

        if (mp && mp.length > 0) {
          const matchIds = mp.map((m: any) => m.match_id)
          const today = new Date().toISOString().split('T')[0]
          const { data: matches } = await supabase
            .from('matches')
            .select('*')
            .in('id', matchIds)
            .in('status', ['open', 'full'])
            .gte('date', today)
            .order('date', { ascending: true })
          setUpcomingGames(matches || [])
        }

        // Fetch court bookings
        const { data: bks } = await supabase
          .from('court_bookings')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false })
          .limit(10)
        setBookings(bks || [])
      }
      setLoading(false)
    }
    getProfile()
  }, [])

  function openEditProfile() {
    setEditName(p?.full_name || '')
    setEditHand(p?.playing_hand || 'Right')
    setShowEditProfile(true)
  }

  async function handleSaveProfile() {
    if (!userId || !editName.trim()) return
    setEditSaving(true)
    const { error } = await supabase
      .from('applications')
      .update({ full_name: editName.trim(), playing_hand: editHand })
      .eq('id', userId)
    if (error) {
      showToast('Failed to update profile', 'error')
    } else {
      setP((prev: any) => ({ ...prev, full_name: editName.trim(), playing_hand: editHand }))
      showToast('Profile updated!')
      setShowEditProfile(false)
    }
    setEditSaving(false)
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      showToast('Please upload a JPEG, PNG, WebP, or GIF image', 'error')
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      showToast('Image must be under 5MB', 'error')
      return
    }

    setUploading(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        showToast('Please sign in again', 'error')
        setUploading(false)
        return
      }

      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload-avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: formData,
      })

      const result = await res.json()

      if (!res.ok) {
        showToast(result.error || 'Failed to upload image', 'error')
        setUploading(false)
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }

      const cacheBustedUrl = result.url + '?t=' + Date.now()
      setAvatarUrl(cacheBustedUrl)
      setP((prev: any) => ({ ...prev, avatar_url: cacheBustedUrl }))
      showToast('Profile photo updated!')
    } catch (err) {
      console.error('Avatar upload error:', err)
      showToast('Something went wrong', 'error')
    }
    setUploading(false)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const skillLevel = parseFloat(p?.skill_level) || 2.5
  const matchesPlayed = p?.matches_played || 0
  const matchesWon = p?.matches_won || 0
  const winRate = matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100) : 0

  if (loading)
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
          <span className="text-white/40 text-sm font-medium">Loading profile...</span>
        </div>
      </div>
    )

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex justify-center overflow-y-auto">
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast((t) => ({ ...t, visible: false }))} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleAvatarUpload}
      />
      <div className="w-full max-w-[480px] min-h-screen relative pb-24 page-transition">
        {/* ─── Header / Profile Card ─── */}
        <div className="pt-12 pb-6 px-6">
          {/* Back + Settings row */}
          <div className="flex justify-between items-center mb-8">
            <button onClick={() => router.back()} className="text-white/40 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Go back">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button className="text-white/40 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Settings">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>

          {/* Avatar + Name */}
          <div className="flex flex-col items-center">
            <div className="relative mb-4">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="relative w-24 h-24 rounded-full group cursor-pointer"
              >
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="w-24 h-24 rounded-full object-cover border-2 border-white/10"
                  />
                ) : (
                  <div className="w-24 h-24 bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-full border-2 border-white/10 flex items-center justify-center">
                    <span className="text-3xl font-bold text-white/60">{p?.full_name?.charAt(0) || '?'}</span>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                  {uploading ? (
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                </div>
              </button>
              <div className="absolute -bottom-1 -right-1 bg-[#00ff88] w-7 h-7 rounded-full border-[3px] border-[#0a0a0a] flex items-center justify-center">
                <span className="text-black text-[9px] font-bold">{skillLevel.toFixed(1)}</span>
              </div>
            </div>

            <h1 className="text-2xl font-bold tracking-tight">{p?.full_name || 'Player'}</h1>
            <p className="text-white/30 text-xs mt-1 font-medium">Match Day</p>

            {/* Bio */}
            <p className="text-white/50 text-[13px] text-center mt-3 leading-relaxed max-w-[320px]">
              Level {skillLevel.toFixed(1)} player · {matchesPlayed} matches played · {winRate}% win rate
            </p>
          </div>

          {/* Stats row — Followers / Following / Win Rate */}
          <div className="flex justify-center gap-12 mt-6">
            <Link href="/add-player" className="text-center">
              <p className="text-xl font-bold">{followers}</p>
              <p className="text-[10px] text-white/30 uppercase font-semibold tracking-wider">Followers</p>
            </Link>
            <Link href="/add-player" className="text-center">
              <p className="text-xl font-bold">{following}</p>
              <p className="text-[10px] text-white/30 uppercase font-semibold tracking-wider">Following</p>
            </Link>
            <div className="text-center">
              <p className="text-xl font-bold">{winRate}%</p>
              <p className="text-[10px] text-white/30 uppercase font-semibold tracking-wider">Win Rate</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mt-6">
            <button
              onClick={openEditProfile}
              className="flex-1 py-3 bg-[#00ff88] text-black font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-[#00ff88]/90 transition-all min-h-[44px]"
            >
              Edit Profile
            </button>
            <Link href="/add-player" className="flex-1 py-3 bg-white/5 text-white/70 border border-white/10 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-white/10 transition-all min-h-[44px] flex items-center justify-center gap-2">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
              Find Players
            </Link>
          </div>
        </div>

        {/* ─── Single Scrollable Content (no tabs) ─── */}
        <div className="px-6 py-6 space-y-6 pb-24">
          {/* Stat Cards */}
          <section>
            <h3 className="text-xs uppercase font-bold tracking-wider text-white/40 mb-3">Performance</h3>
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-[#111] rounded-2xl border border-white/5 p-4 text-center">
                <p className="text-2xl font-bold text-[#00ff88]">{skillLevel.toFixed(1)}</p>
                <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider mt-1">Skill Level</p>
              </div>
              <div className="bg-[#111] rounded-2xl border border-white/5 p-4 text-center">
                <p className="text-2xl font-bold">{matchesPlayed}</p>
                <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider mt-1">Matches</p>
              </div>
              <div className="bg-[#111] rounded-2xl border border-white/5 p-4 text-center">
                <p className="text-2xl font-bold">{winRate}%</p>
                <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider mt-1">Win Rate</p>
              </div>
            </div>
          </section>

          {/* My Bookings */}
          <section>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs uppercase font-bold tracking-wider text-white/40">My Bookings</h3>
              <Link href="/booking" className="text-[10px] text-[#00ff88] font-semibold uppercase hover:underline">Book court</Link>
            </div>
            {bookings.length === 0 ? (
              <div className="bg-[#111] rounded-2xl border border-white/5 p-6 text-center">
                <p className="text-white/20 text-sm mb-3">No bookings yet</p>
                <Link
                  href="/booking"
                  className="inline-block px-4 py-2 bg-[#00ff88] text-black text-xs font-bold uppercase rounded-xl"
                >
                  Book a Court
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {bookings.map((b: any) => (
                  <div key={b.id} className="bg-[#111] rounded-2xl border border-white/5 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold">{b.club_name || b.club_id}</span>
                      <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                        b.status === 'confirmed' ? 'bg-[#00ff88]/10 text-[#00ff88]'
                          : b.status === 'cancelled' ? 'bg-red-500/10 text-red-400'
                          : 'bg-white/5 text-white/30'
                      }`}>
                        {b.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-white/40 text-xs">
                      <span>{new Date(b.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                      <span>·</span>
                      <span>{b.time_slot || b.time}</span>
                      {b.court_number && (
                        <>
                          <span>·</span>
                          <span>Court {b.court_number}</span>
                        </>
                      )}
                      {b.price > 0 && (
                        <>
                          <span>·</span>
                          <span>PKR {b.price.toLocaleString()}</span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Collapsible Upcoming Games */}
          <section>
            <button
              onClick={() => setGamesExpanded(!gamesExpanded)}
              className="w-full flex items-center justify-between mb-3"
            >
              <div className="flex items-center gap-2">
                <h3 className="text-xs uppercase font-bold tracking-wider text-white/40">Upcoming Games</h3>
                {upcomingGames.length > 0 && (
                  <span className="text-[10px] font-bold bg-[#00ff88]/10 text-[#00ff88] px-2 py-0.5 rounded-full">
                    {upcomingGames.length}
                  </span>
                )}
              </div>
              <motion.svg
                animate={{ rotate: gamesExpanded ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-white/30"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </motion.svg>
            </button>
            <AnimatePresence initial={false}>
              {gamesExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="overflow-hidden"
                >
                  {upcomingGames.length === 0 ? (
                    <div className="bg-[#111] rounded-2xl border border-white/5 p-6 text-center">
                      <p className="text-white/20 text-sm">No upcoming games</p>
                      <Link
                        href="/matchmaking"
                        className="inline-block mt-3 px-4 py-2 bg-[#00ff88] text-black text-xs font-bold uppercase rounded-xl"
                      >
                        Find a Match
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {upcomingGames.slice(0, 2).map((match: any) => (
                        <div key={match.id} className="bg-[#111] rounded-2xl border border-white/5 p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold">{match.venue}</span>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              match.status === 'full' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-[#00ff88]/10 text-[#00ff88]'
                            }`}>
                              {match.status === 'full' ? 'Full' : 'Open'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-white/40 text-xs">
                            <span>{new Date(match.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                            <span>·</span>
                            <span>{match.time}</span>
                            <span>·</span>
                            <span>{match.current_players}/{match.max_players} players</span>
                          </div>
                        </div>
                      ))}
                      {upcomingGames.length > 2 && (
                        <Link
                          href="/dashboard"
                          className="block text-center py-2.5 text-[11px] font-bold text-[#00ff88] uppercase tracking-wider hover:underline"
                        >
                          See all {upcomingGames.length} games
                        </Link>
                      )}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Level Evolution */}
          <section>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs uppercase font-bold tracking-wider text-white/40">Level Evolution</h3>
            </div>
            <div className="bg-[#111] rounded-2xl border border-white/5 p-6 text-center">
              <p className="text-3xl font-bold text-[#00ff88] mb-1">{skillLevel.toFixed(1)}</p>
              <p className="text-white/30 text-xs">Current skill level</p>
              <p className="text-white/15 text-[10px] mt-2">Detailed level history coming soon</p>
            </div>
          </section>

          {/* Last Matches */}
          <section>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs uppercase font-bold tracking-wider text-white/40">Match History</h3>
            </div>
            {matchesPlayed === 0 ? (
              <div className="bg-[#111] rounded-2xl border border-white/5 p-8 text-center">
                <p className="text-white/20 text-sm mb-3">No matches played yet</p>
                <Link
                  href="/matchmaking"
                  className="inline-block px-5 py-2.5 bg-[#00ff88] text-black text-xs font-bold uppercase rounded-xl"
                >
                  Find a Match
                </Link>
              </div>
            ) : (
              <div className="bg-[#111] rounded-2xl border border-white/5 p-6 text-center">
                <p className="text-white/30 text-sm">{matchesWon}W – {matchesPlayed - matchesWon}L</p>
                <p className="text-white/15 text-[10px] mt-2">Match history details coming soon</p>
              </div>
            )}
          </section>
        </div>
      </div>
      <BottomNav />

      {/* Edit Profile Bottom Sheet */}
      <AnimatePresence>
        {showEditProfile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-end justify-center"
            onClick={() => setShowEditProfile(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="w-full max-w-[480px] bg-[#111] rounded-t-3xl border-t border-white/10 p-6 space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-2" />
              <h3 className="text-lg font-bold">Edit Profile</h3>

              <div className="space-y-1">
                <label className="text-[10px] uppercase text-gray-500 font-bold ml-1">Full Name</label>
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-4 outline-none focus:border-[#00ff88] transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase text-gray-500 font-bold ml-1">Playing Hand</label>
                <select
                  value={editHand}
                  onChange={(e) => setEditHand(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl p-4 outline-none focus:border-[#00ff88] transition-all appearance-none"
                >
                  <option value="Right">Right</option>
                  <option value="Left">Left</option>
                </select>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowEditProfile(false)}
                  disabled={editSaving}
                  className="flex-1 py-3 bg-white/5 text-white/50 font-bold rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  disabled={editSaving}
                  className="flex-1 py-3 bg-[#00ff88] text-black font-bold rounded-xl text-sm disabled:opacity-50"
                >
                  {editSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
