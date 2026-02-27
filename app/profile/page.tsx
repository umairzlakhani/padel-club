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
  const [editSide, setEditSide] = useState('Right')
  const [editSaving, setEditSaving] = useState(false)

  // Tab state
  const [activeTab, setActiveTab] = useState<'bookings' | 'performance' | 'stats'>('bookings')

  // Upcoming games + Bookings
  const [upcomingGames, setUpcomingGames] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [cancellingBookingId, setCancellingBookingId] = useState<string | null>(null)
  const [confirmCancelBookingId, setConfirmCancelBookingId] = useState<string | null>(null)

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
    setEditSide(p?.preferred_side || 'Right')
    setShowEditProfile(true)
  }

  async function handleSaveProfile() {
    if (!userId || !editName.trim()) return
    setEditSaving(true)
    const { error } = await supabase
      .from('applications')
      .update({ full_name: editName.trim(), playing_hand: editHand, preferred_side: editSide })
      .eq('id', userId)
    if (error) {
      showToast('Failed to update profile', 'error')
    } else {
      setP((prev: any) => ({ ...prev, full_name: editName.trim(), playing_hand: editHand, preferred_side: editSide }))
      showToast('Profile updated!')
      setShowEditProfile(false)
    }
    setEditSaving(false)
  }

  async function handleCancelBooking(bookingId: string) {
    setCancellingBookingId(bookingId)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token

      const res = await fetch('/api/delete-booking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ id: bookingId }),
      })

      const result = await res.json()

      if (!res.ok || result.error) {
        showToast(result.error || 'Failed to cancel booking', 'error')
      } else {
        setBookings((prev) => prev.filter((b) => b.id !== bookingId))
        showToast('Booking cancelled')
      }
    } catch {
      showToast('Failed to cancel booking', 'error')
    }
    setCancellingBookingId(null)
    setConfirmCancelBookingId(null)
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
            <div className="min-w-[44px]" />
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

        {/* ─── Tab Bar ─── */}
        <div className="px-6 mb-1">
          <div className="flex bg-white/5 rounded-xl p-1 gap-1">
            {(['bookings', 'performance', 'stats'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors relative ${
                  activeTab === tab ? 'text-black' : 'text-white/40'
                }`}
              >
                {activeTab === tab && (
                  <motion.div
                    layoutId="profileTab"
                    className="absolute inset-0 bg-[#00ff88] rounded-lg"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">
                  {tab === 'bookings' ? 'Bookings' : tab === 'performance' ? 'Performance' : 'Stats'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ─── Tab Content ─── */}
        <AnimatePresence mode="wait">
          {activeTab === 'bookings' && (
            <motion.div
              key="bookings"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="px-6 py-5 space-y-6 pb-24"
            >
              {/* Upcoming Games */}
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-xs uppercase font-bold tracking-wider text-white/40">Upcoming Games</h3>
                  {upcomingGames.length > 0 && (
                    <span className="text-[10px] font-bold bg-[#00ff88]/10 text-[#00ff88] px-2 py-0.5 rounded-full">
                      {upcomingGames.length}
                    </span>
                  )}
                </div>
                {upcomingGames.length === 0 ? (
                  <div className="bg-[#111] rounded-2xl border border-white/5 p-6 text-center">
                    <p className="text-white/20 text-sm">No upcoming games</p>
                    <Link href="/matchmaking" className="inline-block mt-3 px-4 py-2 bg-[#00ff88] text-black text-xs font-bold uppercase rounded-xl">
                      Find a Match
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {upcomingGames.map((match: any) => (
                      <Link key={match.id} href={`/match/${match.id}`}>
                        <div className="bg-[#111] rounded-2xl border border-white/5 p-4 active:scale-[0.98] transition-transform">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-bold">{match.venue}</span>
                            <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              match.status === 'full' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-[#00ff88]/10 text-[#00ff88]'
                            }`}>
                              {match.status === 'full' ? 'Full' : 'Open'}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-white/40 text-xs mb-3">
                            <span>{new Date(match.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                            <span>·</span>
                            <span>{match.time}</span>
                          </div>
                          {/* Mini player slots */}
                          <div className="flex items-center gap-2">
                            {Array.from({ length: match.current_players || 0 }).map((_, i) => (
                              <div key={`filled-${i}`} className="w-8 h-8 rounded-full bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border-2 border-[#00ff88] flex items-center justify-center">
                                <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#00ff88" strokeWidth="2.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            ))}
                            {Array.from({ length: Math.max(0, (match.max_players || 4) - (match.current_players || 0)) }).map((_, i) => (
                              <div key={`empty-${i}`} className="w-8 h-8 rounded-full border-2 border-dashed border-white/10 flex items-center justify-center">
                                <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.2)" strokeWidth="2.5">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                                </svg>
                              </div>
                            ))}
                            <span className="text-[10px] text-white/30 ml-1">{match.current_players}/{match.max_players}</span>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </section>

              {/* Court Bookings */}
              <section>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-xs uppercase font-bold tracking-wider text-white/40">Court Bookings</h3>
                  <Link href="/booking" className="text-[10px] text-[#00ff88] font-semibold uppercase hover:underline">Book court</Link>
                </div>
                {bookings.length === 0 ? (
                  <div className="bg-[#111] rounded-2xl border border-white/5 p-6 text-center">
                    <p className="text-white/20 text-sm mb-3">No bookings yet</p>
                    <Link href="/booking" className="inline-block px-4 py-2 bg-[#00ff88] text-black text-xs font-bold uppercase rounded-xl">
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
                        <div className="flex items-center gap-3 text-white/40 text-xs mb-3">
                          <span>{new Date(b.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                          <span>·</span>
                          <span>{b.time_slot || b.time}</span>
                          {b.court_number && (<><span>·</span><span>Court {b.court_number}</span></>)}
                          {b.price > 0 && (<><span>·</span><span>PKR {b.price.toLocaleString()}</span></>)}
                        </div>
                        {confirmCancelBookingId === b.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleCancelBooking(b.id)}
                              disabled={cancellingBookingId === b.id}
                              className="inline-flex items-center gap-1.5 rounded-xl bg-red-500/15 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/25 transition-all disabled:opacity-50"
                            >
                              {cancellingBookingId === b.id ? 'Cancelling...' : 'Confirm Cancel'}
                            </button>
                            <button
                              onClick={() => setConfirmCancelBookingId(null)}
                              className="inline-flex items-center rounded-xl border border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white/40 hover:text-white/60 transition-all"
                            >
                              Keep
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmCancelBookingId(b.id)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/20 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-red-400/60 hover:border-red-500/40 hover:text-red-400 transition-all"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                            </svg>
                            Cancel Booking
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </motion.div>
          )}

          {activeTab === 'performance' && (
            <motion.div
              key="performance"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="px-6 py-5 space-y-6 pb-24"
            >
              {/* Skill Level Card */}
              <section>
                <h3 className="text-xs uppercase font-bold tracking-wider text-white/40 mb-3">Current Level</h3>
                <div className="bg-[#111] rounded-2xl border border-white/5 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <p className="text-4xl font-black text-[#00ff88]">{skillLevel.toFixed(1)}</p>
                      <p className="text-white/30 text-xs mt-1">Skill Rating</p>
                    </div>
                    <div className="w-20 h-20 relative">
                      <svg viewBox="0 0 36 36" className="w-20 h-20 -rotate-90">
                        <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
                        <motion.circle
                          cx="18" cy="18" r="15.5" fill="none" stroke="#00ff88" strokeWidth="3"
                          strokeLinecap="round"
                          strokeDasharray={`${(skillLevel / 7) * 97.4} 97.4`}
                          initial={{ strokeDasharray: '0 97.4' }}
                          animate={{ strokeDasharray: `${(skillLevel / 7) * 97.4} 97.4` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-white/30">/ 7.0</span>
                      </div>
                    </div>
                  </div>
                  <div className="h-px bg-white/5 mb-4" />
                  <div className="flex justify-between text-[10px]">
                    <span className="text-white/20">Beginner</span>
                    <span className="text-white/20">Intermediate</span>
                    <span className="text-white/20">Pro</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full mt-1.5 overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-gradient-to-r from-[#00ff88]/50 to-[#00ff88]"
                      initial={{ width: 0 }}
                      animate={{ width: `${(skillLevel / 7) * 100}%` }}
                      transition={{ duration: 0.8, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              </section>

              {/* Win Rate Ring */}
              <section>
                <h3 className="text-xs uppercase font-bold tracking-wider text-white/40 mb-3">Win Rate</h3>
                <div className="bg-[#111] rounded-2xl border border-white/5 p-6 flex items-center gap-6">
                  <div className="w-28 h-28 relative flex-shrink-0">
                    <svg viewBox="0 0 36 36" className="w-28 h-28 -rotate-90">
                      <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2.5" />
                      <motion.circle
                        cx="18" cy="18" r="15.5" fill="none" stroke="#00ff88" strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeDasharray={`${(winRate / 100) * 97.4} 97.4`}
                        initial={{ strokeDasharray: '0 97.4' }}
                        animate={{ strokeDasharray: `${(winRate / 100) * 97.4} 97.4` }}
                        transition={{ duration: 1, ease: 'easeOut', delay: 0.2 }}
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-black">{winRate}%</span>
                      <span className="text-[9px] text-white/20 uppercase font-bold">Win Rate</span>
                    </div>
                  </div>
                  <div className="flex-1 space-y-3">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[11px] text-white/40">Wins</span>
                        <span className="text-sm font-bold text-[#00ff88]">{matchesWon}</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-[#00ff88]"
                          initial={{ width: 0 }}
                          animate={{ width: matchesPlayed > 0 ? `${(matchesWon / matchesPlayed) * 100}%` : '0%' }}
                          transition={{ duration: 0.6, delay: 0.3 }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[11px] text-white/40">Losses</span>
                        <span className="text-sm font-bold text-red-400">{matchesPlayed - matchesWon}</span>
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-red-400"
                          initial={{ width: 0 }}
                          animate={{ width: matchesPlayed > 0 ? `${((matchesPlayed - matchesWon) / matchesPlayed) * 100}%` : '0%' }}
                          transition={{ duration: 0.6, delay: 0.4 }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </section>

              {/* Performance Summary */}
              <section>
                <h3 className="text-xs uppercase font-bold tracking-wider text-white/40 mb-3">Summary</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[#111] rounded-2xl border border-white/5 p-4 text-center">
                    <p className="text-2xl font-bold">{matchesPlayed}</p>
                    <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider mt-1">Total Matches</p>
                  </div>
                  <div className="bg-[#111] rounded-2xl border border-white/5 p-4 text-center">
                    <p className="text-2xl font-bold text-[#00ff88]">{matchesWon}</p>
                    <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider mt-1">Victories</p>
                  </div>
                </div>
              </section>
            </motion.div>
          )}

          {activeTab === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="px-6 py-5 space-y-4 pb-24"
            >
              {/* Stat Rows */}
              {[
                { label: 'Skill Level', value: skillLevel.toFixed(1), color: '#00ff88' },
                { label: 'Matches Played', value: String(matchesPlayed), color: '#ffffff' },
                { label: 'Matches Won', value: String(matchesWon), color: '#00ff88' },
                { label: 'Matches Lost', value: String(matchesPlayed - matchesWon), color: '#f87171' },
                { label: 'Win Rate', value: `${winRate}%`, color: '#00ff88' },
                { label: 'Playing Hand', value: p?.playing_hand || 'Right', color: '#ffffff' },
                { label: 'Preferred Side', value: p?.preferred_side || 'Right', color: '#ffffff' },
                { label: 'Followers', value: String(followers), color: '#ffffff' },
                { label: 'Following', value: String(following), color: '#ffffff' },
              ].map((stat, i) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 30 }}
                  className="bg-[#111] rounded-2xl border border-white/5 p-4 flex items-center justify-between"
                >
                  <span className="text-white/40 text-sm">{stat.label}</span>
                  <span className="text-lg font-bold" style={{ color: stat.color }}>{stat.value}</span>
                </motion.div>
              ))}

              {/* Member Since */}
              {p?.created_at && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35, type: 'spring', stiffness: 300, damping: 30 }}
                  className="bg-[#111] rounded-2xl border border-white/5 p-4 flex items-center justify-between"
                >
                  <span className="text-white/40 text-sm">Member Since</span>
                  <span className="text-sm font-bold text-white/70">
                    {new Date(p.created_at).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                  </span>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
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

              <div className="grid grid-cols-2 gap-3">
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
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-gray-500 font-bold ml-1">Preferred Side</label>
                  <select
                    value={editSide}
                    onChange={(e) => setEditSide(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl p-4 outline-none focus:border-[#00ff88] transition-all appearance-none"
                  >
                    <option value="Right">Right</option>
                    <option value="Left">Left</option>
                  </select>
                </div>
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
