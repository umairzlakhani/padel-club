'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/app/components/BottomNav'
import Toast from '@/app/components/Toast'

// Mock match history — replace with real data when the matches table exists
const MOCK_MATCHES = [
  {
    id: 1,
    date: '08/02/2026',
    venue: 'DHA Padel Court · Karachi',
    team1: ['U', 'A'],
    team2: ['S', 'M'],
    scores: [
      [6, 2],
      [6, 4],
    ],
    won: true,
    ratingChange: +0.07,
  },
  {
    id: 2,
    date: '01/02/2026',
    venue: 'Clifton Padel Arena · Karachi',
    team1: ['U', 'R'],
    team2: ['K', 'F'],
    scores: [
      [4, 6],
      [3, 6],
    ],
    won: false,
    ratingChange: -0.04,
  },
  {
    id: 3,
    date: '25/01/2026',
    venue: 'Open Match · Karachi',
    team1: ['U', 'H'],
    team2: ['Z', 'T'],
    scores: [
      [6, 3],
      [7, 5],
    ],
    won: true,
    ratingChange: +0.05,
  },
]

// Level evolution data points (mock)
const LEVEL_POINTS = [
  { month: 'Sep', value: 1.8 },
  { month: 'Oct', value: 2.0 },
  { month: 'Nov', value: 1.9 },
  { month: 'Dec', value: 2.15 },
  { month: 'Jan', value: 2.3 },
  { month: 'Feb', value: 2.5 },
]

function LevelEvolutionGraph({ currentLevel }: { currentLevel: number }) {
  const min = 1.5
  const max = 3.0
  const graphH = 120
  const graphW = 360
  const padX = 10
  const padY = 10
  const usableW = graphW - padX * 2
  const usableH = graphH - padY * 2

  const points = LEVEL_POINTS.map((pt, i) => {
    const x = padX + (i / (LEVEL_POINTS.length - 1)) * usableW
    const y = padY + usableH - ((pt.value - min) / (max - min)) * usableH
    return { x, y, ...pt }
  })

  const linePath = points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ')
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${graphH} L ${points[0].x} ${graphH} Z`
  const lastPt = points[points.length - 1]

  return (
    <div className="relative">
      <svg width="100%" height="140" viewBox={`0 0 ${graphW} ${graphH + 20}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="blueGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Grid lines */}
        {[0, 1, 2, 3].map((i) => (
          <line
            key={i}
            x1={padX}
            y1={padY + (i / 3) * usableH}
            x2={graphW - padX}
            y2={padY + (i / 3) * usableH}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="1"
          />
        ))}
        {/* Gradient fill */}
        <path d={areaPath} fill="url(#blueGrad)" />
        {/* Line */}
        <path d={linePath} fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* End dot */}
        <circle cx={lastPt.x} cy={lastPt.y} r="5" fill="#3B82F6" />
        <circle cx={lastPt.x} cy={lastPt.y} r="8" fill="#3B82F6" fillOpacity="0.25" />
        {/* Month labels */}
        {points.map((pt) => (
          <text key={pt.month} x={pt.x} y={graphH + 14} fill="rgba(255,255,255,0.3)" fontSize="9" textAnchor="middle" fontWeight="600">
            {pt.month}
          </text>
        ))}
      </svg>
      {/* Current level badge */}
      <div className="absolute top-2 right-2 bg-[#3B82F6] text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-lg shadow-blue-500/30">
        {currentLevel.toFixed(1)}
      </div>
    </div>
  )
}

function MatchCard({ match }: { match: (typeof MOCK_MATCHES)[0] }) {
  const isWin = match.won
  return (
    <div className="bg-[#111] rounded-2xl border border-white/5 overflow-hidden hover:border-white/10 transition-all">
      <div className="p-4">
        <div className="flex items-center justify-between">
          {/* Teams */}
          <div className="flex items-center gap-4">
            {/* Team 1 */}
            <div className="flex -space-x-2">
              {match.team1.map((initial, i) => (
                <div
                  key={i}
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border-2 border-[#111] flex items-center justify-center"
                >
                  <span className="text-[11px] font-bold text-white/70">{initial}</span>
                </div>
              ))}
            </div>
            {/* Scores */}
            <div className="flex gap-2">
              {match.scores.map((set, i) => (
                <div key={i} className="text-center">
                  <span className={`text-sm font-bold block ${set[0] > set[1] ? 'text-white' : 'text-white/40'}`}>{set[0]}</span>
                  <span className={`text-sm font-bold block ${set[1] > set[0] ? 'text-white' : 'text-white/40'}`}>{set[1]}</span>
                </div>
              ))}
            </div>
            {/* Team 2 */}
            <div className="flex -space-x-2">
              {match.team2.map((initial, i) => (
                <div
                  key={i}
                  className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border-2 border-[#111] flex items-center justify-center"
                >
                  <span className="text-[11px] font-bold text-white/50">{initial}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Result badge */}
          <div className="text-right pl-3 border-l border-white/5 min-w-[56px]">
            <span className={`text-[11px] font-bold uppercase block ${isWin ? 'text-[#00ff88]' : 'text-red-400'}`}>
              {isWin ? 'Win' : 'Loss'}
            </span>
            <span className={`text-[11px] font-semibold block ${isWin ? 'text-[#00ff88]/70' : 'text-red-400/70'}`}>
              {isWin ? '+' : ''}
              {match.ratingChange.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
      <div className="px-4 py-2.5 border-t border-white/5 flex justify-between items-center bg-white/[0.01]">
        <span className="text-[10px] text-white/30 font-semibold">{match.venue}</span>
        <span className="text-[10px] text-white/20 font-medium">{match.date}</span>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const [p, setP] = useState<any>(null)
  const [activeTab, setActiveTab] = useState('Activity')
  const [loading, setLoading] = useState(true)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })
  const fileInputRef = useRef<HTMLInputElement>(null)

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
      }
      setLoading(false)
    }
    getProfile()
  }, [])

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    // Validate file type client-side
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
      // Get the current session token
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        showToast('Please sign in again', 'error')
        setUploading(false)
        return
      }

      // Upload via server-side API route (bypasses storage RLS)
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

      // Update UI immediately — no page refresh needed
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
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex justify-center">
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast((t) => ({ ...t, visible: false }))} />
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleAvatarUpload}
      />
      <div className="w-full max-w-[480px] min-h-screen relative">
        {/* ─── Header / Profile Card ─── */}
        <div className="pt-12 pb-6 px-6">
          {/* Back + Settings row */}
          <div className="flex justify-between items-center mb-8">
            <a href="/" className="text-white/40 hover:text-white transition-colors">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </a>
            <button className="text-white/40 hover:text-white transition-colors">
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
                {/* Edit overlay */}
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

          {/* Stats row */}
          <div className="flex justify-center gap-12 mt-6">
            <div className="text-center">
              <p className="text-xl font-bold">{matchesPlayed}</p>
              <p className="text-[10px] text-white/30 uppercase font-semibold tracking-wider">Matches</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold">{matchesWon}</p>
              <p className="text-[10px] text-white/30 uppercase font-semibold tracking-wider">Wins</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold">{winRate}%</p>
              <p className="text-[10px] text-white/30 uppercase font-semibold tracking-wider">Win Rate</p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 mt-6">
            <button className="flex-1 py-3 bg-[#00ff88] text-black font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-[#00ff88]/90 transition-all">
              Edit Profile
            </button>
            <button className="flex-1 py-3 bg-white/5 text-white/70 border border-white/10 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-white/10 transition-all">
              Advanced Stats
            </button>
          </div>
        </div>

        {/* ─── Tab Navigation ─── */}
        <div className="flex border-b border-white/5 px-6 sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-md z-20">
          {['Activity', 'Posts'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3.5 text-[11px] font-bold uppercase tracking-widest transition-all ${
                activeTab === tab ? 'text-[#00ff88] border-b-2 border-[#00ff88]' : 'text-white/30 border-b-2 border-transparent'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ─── Tab Content ─── */}
        {activeTab === 'Activity' && (
          <div className="px-6 py-6 space-y-6 pb-24">
            {/* Level Evolution */}
            <section>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs uppercase font-bold tracking-wider text-white/40">Level Evolution</h3>
                <button className="text-[10px] text-white/30 font-medium bg-white/5 px-3 py-1 rounded-full hover:bg-white/10 transition-all">
                  All results
                </button>
              </div>
              <div className="bg-[#111] rounded-2xl border border-white/5 p-4 overflow-hidden">
                <LevelEvolutionGraph currentLevel={skillLevel} />
              </div>
            </section>

            {/* Last Matches */}
            <section>
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-xs uppercase font-bold tracking-wider text-white/40">Last Matches</h3>
                <button className="text-[10px] text-[#00ff88] font-semibold uppercase hover:underline">See all</button>
              </div>
              <div className="space-y-3">
                {MOCK_MATCHES.map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'Posts' && (
          <div className="px-6 py-16 text-center">
            <div className="text-white/10 text-4xl mb-3">📝</div>
            <p className="text-white/20 text-sm font-medium">No posts yet</p>
            <p className="text-white/10 text-xs mt-1">Share your padel journey</p>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
