'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { supabase, getUserRole, UserRole } from '@/lib/supabase'
import { IMAGES } from '@/lib/images'
import BottomNav from '@/app/components/BottomNav'
import Toast from '@/app/components/Toast'

// ─── Mock Data (mirrors /profile) ───────────────────────────────────────────

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

const LEVEL_POINTS = [
  { month: 'Sep', value: 1.8 },
  { month: 'Oct', value: 2.0 },
  { month: 'Nov', value: 1.9 },
  { month: 'Dec', value: 2.15 },
  { month: 'Jan', value: 2.3 },
  { month: 'Feb', value: 2.5 },
]

// ─── Level Evolution Graph ──────────────────────────────────────────────────

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
          <linearGradient id="dashGreenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </linearGradient>
        </defs>
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
        <path d={areaPath} fill="url(#dashGreenGrad)" />
        <path d={linePath} fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={lastPt.x} cy={lastPt.y} r="5" fill="#3B82F6" />
        <circle cx={lastPt.x} cy={lastPt.y} r="8" fill="#3B82F6" fillOpacity="0.25" />
        {points.map((pt) => (
          <text key={pt.month} x={pt.x} y={graphH + 14} fill="rgba(255,255,255,0.3)" fontSize="9" textAnchor="middle" fontWeight="600">
            {pt.month}
          </text>
        ))}
      </svg>
      <div className="absolute top-2 right-2 bg-[#3B82F6] text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-lg shadow-blue-500/30">
        {currentLevel.toFixed(1)}
      </div>
    </div>
  )
}

// ─── Match Card ─────────────────────────────────────────────────────────────

function MatchCard({ match }: { match: (typeof MOCK_MATCHES)[0] }) {
  const isWin = match.won
  return (
    <div className="bg-[#111] rounded-2xl border border-white/5 overflow-hidden hover:border-white/10 transition-all">
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
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
            <div className="flex gap-2">
              {match.scores.map((set, i) => (
                <div key={i} className="text-center">
                  <span className={`text-sm font-bold block ${set[0] > set[1] ? 'text-white' : 'text-white/40'}`}>{set[0]}</span>
                  <span className={`text-sm font-bold block ${set[1] > set[0] ? 'text-white' : 'text-white/40'}`}>{set[1]}</span>
                </div>
              ))}
            </div>
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

// ─── Player Dashboard ───────────────────────────────────────────────────────

function PlayerDashboard({ userId, inTabs = false }: { userId: string; inTabs?: boolean }) {
  const [profile, setProfile] = useState<any>(null)
  const [upcomingMatches, setUpcomingMatches] = useState<any[]>([])
  const [pendingCounts, setPendingCounts] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      // Fetch profile
      const { data: prof } = await supabase
        .from('applications')
        .select('full_name, skill_level, matches_played, matches_won, avatar_url')
        .eq('id', userId)
        .single()
      setProfile(prof)

      // Fetch upcoming matches: get match_ids from match_players, then fetch matches
      const { data: mp } = await supabase
        .from('match_players')
        .select('match_id')
        .eq('player_id', userId)

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
        setUpcomingMatches(matches || [])

        // For creator matches, fetch pending request counts
        const creatorMatches = (matches || []).filter((m: any) => m.creator_id === userId)
        if (creatorMatches.length > 0) {
          const creatorMatchIds = creatorMatches.map((m: any) => m.id)
          const { data: pendingRows } = await supabase
            .from('match_players')
            .select('match_id')
            .in('match_id', creatorMatchIds)
            .eq('status', 'pending')

          if (pendingRows) {
            const counts: Record<string, number> = {}
            pendingRows.forEach((r: any) => {
              counts[r.match_id] = (counts[r.match_id] || 0) + 1
            })
            setPendingCounts(counts)
          }
        }
      }

      setLoading(false)
    }
    load()
  }, [userId])

  if (loading) return <LoadingSpinner label="Loading dashboard..." />

  const skillLevel = parseFloat(profile?.skill_level) || 2.5
  const matchesPlayed = profile?.matches_played || 0
  const matchesWon = profile?.matches_won || 0
  const winRate = matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100) : 0

  return (
    <div className={`${inTabs ? 'pt-2' : ''} pb-24`}>
      {/* Hero Banner */}
      {!inTabs && (
        <div className="relative w-full aspect-[2.5/1] overflow-hidden">
          <Image
            src={IMAGES.dashboardHero}
            alt="Match Day"
            fill
            unoptimized
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/30 to-transparent" />
          <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
            <div>
              <p className="text-white/60 text-xs font-semibold uppercase tracking-wider mb-1">Welcome back</p>
              <h1 className="text-2xl font-bold tracking-tight">{profile?.full_name || 'Player'}</h1>
            </div>
            <div className="flex gap-2">
              <Link href="/add-player" className="w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/10" aria-label="Friends">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </Link>
              <Link href="/profile" className="w-10 h-10 bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/10" aria-label="Profile">
                <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      )}
      {inTabs && (
        <div className="px-6 pt-4 mb-4 flex items-center justify-between">
          <div>
            <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-1">Welcome back</p>
            <h1 className="text-2xl font-bold tracking-tight">{profile?.full_name || 'Player'}</h1>
          </div>
          <div className="flex gap-2">
            <Link href="/add-player" className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center border border-white/5" aria-label="Friends">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-white/40">
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </Link>
            <Link href="/profile" className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center border border-white/5" aria-label="Profile">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" className="text-white/40">
                <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </Link>
          </div>
        </div>
      )}

      <div className="px-6 pt-6">
      {/* Stat Cards */}
      <div className="grid grid-cols-3 gap-3 mb-8">
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

      {/* Upcoming Games */}
      <section className="mb-8">
        <h3 className="text-xs uppercase font-bold tracking-wider text-white/40 mb-3">My Upcoming Games</h3>
        {upcomingMatches.length === 0 ? (
          <div className="bg-[#111] rounded-2xl border border-white/5 p-8 text-center">
            <p className="text-white/20 text-sm mb-3">No upcoming games</p>
            <Link
              href="/matchmaking"
              className="inline-block px-5 py-2.5 bg-[#00ff88] text-black text-xs font-bold uppercase rounded-xl"
            >
              Find a Match
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {upcomingMatches.map((match) => (
              <div key={match.id} className="bg-[#111] rounded-2xl border border-white/5 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold">{match.venue}</span>
                  <div className="flex items-center gap-2">
                    {pendingCounts[match.id] > 0 && (
                      <Link
                        href="/matchmaking"
                        className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400"
                      >
                        {pendingCounts[match.id]} pending
                      </Link>
                    )}
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      match.status === 'full' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-[#00ff88]/10 text-[#00ff88]'
                    }`}>
                      {match.status === 'full' ? 'Full' : 'Open'}
                    </span>
                  </div>
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
          </div>
        )}
      </section>

      {/* Level Evolution */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs uppercase font-bold tracking-wider text-white/40">Level Evolution</h3>
        </div>
        <div className="bg-[#111] rounded-2xl border border-white/5 p-4 overflow-hidden">
          <LevelEvolutionGraph currentLevel={skillLevel} />
        </div>
      </section>

      {/* Last Matches */}
      <section>
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs uppercase font-bold tracking-wider text-white/40">Last Matches</h3>
          <Link href="/profile" className="text-[10px] text-[#00ff88] font-semibold uppercase hover:underline">See all</Link>
        </div>
        <div className="space-y-3">
          {MOCK_MATCHES.map((match) => (
            <MatchCard key={match.id} match={match} />
          ))}
        </div>
      </section>
      </div>
    </div>
  )
}

// ─── Coach Dashboard ────────────────────────────────────────────────────────

function CoachDashboard({ userId }: { userId: string }) {
  const [coachName, setCoachName] = useState('')
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })

  useEffect(() => {
    async function load() {
      // Get coach's name from applications
      const { data: app } = await supabase
        .from('applications')
        .select('full_name')
        .eq('id', userId)
        .single()
      const name = app?.full_name || ''
      setCoachName(name)

      // Find coach record by name
      const { data: coaches } = await supabase
        .from('coaches')
        .select('id, name, rate')
        .ilike('name', `%${name}%`)

      if (coaches && coaches.length > 0) {
        const coachId = coaches[0].id

        // Fetch confirmed bookings
        const { data: bks } = await supabase
          .from('coaching_bookings')
          .select('id, user_id, day, time_slot, price, status')
          .eq('coach_id', coachId)
          .eq('status', 'confirmed')

        if (bks && bks.length > 0) {
          // Resolve student names
          const studentIds = [...new Set(bks.map((b: any) => b.user_id))]
          const { data: students } = await supabase
            .from('applications')
            .select('id, full_name')
            .in('id', studentIds)

          const nameMap: Record<string, string> = {}
          students?.forEach((s: any) => { nameMap[s.id] = s.full_name })

          setBookings(bks.map((b: any) => ({ ...b, student_name: nameMap[b.user_id] || 'Unknown' })))
        }
      }

      setLoading(false)
    }
    load()
  }, [userId])

  if (loading) return <LoadingSpinner label="Loading coach dashboard..." />

  const totalBookings = bookings.length
  const totalRevenue = bookings.reduce((sum, b) => sum + (b.price || 0), 0)

  // Group bookings by day
  const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const grouped: Record<string, any[]> = {}
  bookings.forEach((b) => {
    if (!grouped[b.day]) grouped[b.day] = []
    grouped[b.day].push(b)
  })
  const sortedDays = Object.keys(grouped).sort((a, b) => dayOrder.indexOf(a) - dayOrder.indexOf(b))

  return (
    <div className="px-6 pt-12 pb-24">
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast(t => ({ ...t, visible: false }))} />

      {/* Header */}
      <div className="mb-8">
        <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-1">Coach Portal</p>
        <h1 className="text-2xl font-bold tracking-tight">{coachName || 'Coach'}</h1>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-3 mb-8">
        <div className="bg-[#111] rounded-2xl border border-white/5 p-5 text-center">
          <p className="text-3xl font-bold">{totalBookings}</p>
          <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider mt-1">Total Bookings</p>
        </div>
        <div className="bg-[#111] rounded-2xl border border-white/5 p-5 text-center">
          <p className="text-3xl font-bold text-[#00ff88]">PKR {totalRevenue.toLocaleString()}</p>
          <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider mt-1">Revenue</p>
        </div>
      </div>

      {/* Weekly Schedule */}
      <section className="mb-8">
        <h3 className="text-xs uppercase font-bold tracking-wider text-white/40 mb-3">Weekly Schedule</h3>
        {sortedDays.length === 0 ? (
          <div className="bg-[#111] rounded-2xl border border-white/5 p-8 text-center">
            <p className="text-white/20 text-sm">No confirmed bookings yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedDays.map((day) => (
              <div key={day} className="bg-[#111] rounded-2xl border border-white/5 p-4">
                <h4 className="text-xs font-bold text-[#00ff88] uppercase tracking-wider mb-2">{day}</h4>
                <div className="space-y-2">
                  {grouped[day].map((b: any) => (
                    <div key={b.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-white/60">{b.time_slot}</span>
                        <span className="text-white/20">·</span>
                        <span className="text-white/80">{b.student_name}</span>
                      </div>
                      <span className="text-white/30 text-xs">PKR {b.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Verify Player Button */}
      <button
        onClick={() => setToast({ visible: true, message: 'Coming soon — player verification will be available in the next update', type: 'success' })}
        className="w-full py-3.5 bg-white/5 border border-white/10 text-white/60 font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-white/10 transition-all"
      >
        Verify Player Level
      </button>
    </div>
  )
}

// ─── Admin Dashboard (with applications management) ─────────────────────────

interface Application {
  id: string
  full_name: string
  whatsapp_number: string
  skill_level: number
  status: string | null
  created_at: string
}

function AdminDashboard({ inTabs = false }: { inTabs?: boolean }) {
  const [stats, setStats] = useState({ members: 0, revenue: 0, activeMatches: 0 })
  const [applications, setApplications] = useState<Application[]>([])
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [membersRes, bookingsRes, matchesRes, appsRes] = await Promise.all([
        supabase
          .from('applications')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'member'),
        supabase
          .from('court_bookings')
          .select('price')
          .eq('club_id', 'legends')
          .eq('status', 'confirmed'),
        supabase
          .from('matches')
          .select('id', { count: 'exact', head: true })
          .in('status', ['open', 'full']),
        supabase
          .from('applications')
          .select('*')
          .order('created_at', { ascending: false }),
      ])

      const memberCount = membersRes.count || 0
      const legendsRevenue = (bookingsRes.data || []).reduce((sum: number, b: any) => sum + (b.price || 0), 0)
      const activeMatchCount = matchesRes.count || 0

      setStats({ members: memberCount, revenue: legendsRevenue, activeMatches: activeMatchCount })
      setApplications(appsRes.data || [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleApprove(id: string) {
    setApprovingId(id)

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    const res = await fetch('/api/approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ id }),
    })

    const result = await res.json()

    if (!res.ok || result.error) {
      console.error('Approve error:', result.error)
    } else {
      setApplications((prev) =>
        prev.map((app) => (app.id === id ? { ...app, status: 'member' } : app))
      )
    }
    setApprovingId(null)
  }

  function buildWhatsAppUrl(app: Application) {
    const number = app.whatsapp_number.replace(/[^0-9]/g, '')
    const text = encodeURIComponent(
      `Hi ${app.full_name}, welcome to Match Day! We saw your ${app.skill_level} rating—ready for an evaluation?`
    )
    return `https://wa.me/${number}?text=${text}`
  }

  if (loading) return <LoadingSpinner label="Loading admin dashboard..." />

  const pendingCount = applications.filter((a) => a.status !== 'member').length

  return (
    <div className={`px-6 ${inTabs ? 'pt-6' : 'pt-12'} pb-24`}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div>
          <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-1">Admin Portal</p>
          <h1 className="text-2xl font-bold tracking-tight">Match Day HQ</h1>
        </div>
        <span className="ml-auto text-[10px] font-bold uppercase tracking-wider bg-[#00ff88]/10 text-[#00ff88] px-3 py-1 rounded-full">
          Admin
        </span>
      </div>

      {/* Stat Cards */}
      <div className="space-y-3 mb-8">
        <div className="bg-[#111] rounded-2xl border border-white/5 p-6 flex items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-[#00ff88]/10 flex items-center justify-center flex-shrink-0">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#00ff88" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div>
            <p className="text-3xl font-bold">{stats.members}</p>
            <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider mt-0.5">Total Members</p>
          </div>
        </div>

        <div className="bg-[#111] rounded-2xl border border-white/5 p-6 flex items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-[#00ff88]/10 flex items-center justify-center flex-shrink-0">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#00ff88" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-3xl font-bold text-[#00ff88]">PKR {stats.revenue.toLocaleString()}</p>
            <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider mt-0.5">Legends Arena Revenue</p>
          </div>
        </div>

        <div className="bg-[#111] rounded-2xl border border-white/5 p-6 flex items-center gap-5">
          <div className="w-12 h-12 rounded-xl bg-[#00ff88]/10 flex items-center justify-center flex-shrink-0">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#00ff88" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <p className="text-3xl font-bold">{stats.activeMatches}</p>
            <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider mt-0.5">Active Matches</p>
          </div>
        </div>
      </div>

      {/* Applications List */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs uppercase font-bold tracking-wider text-white/40">Applications</h3>
          {pendingCount > 0 && (
            <span className="text-[10px] font-bold uppercase bg-yellow-500/10 text-yellow-400 px-2.5 py-0.5 rounded-full">
              {pendingCount} pending
            </span>
          )}
        </div>
        {applications.length === 0 ? (
          <div className="bg-[#111] rounded-2xl border border-white/5 p-8 text-center">
            <p className="text-white/20 text-sm">No applications yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {applications.map((app) => (
              <div key={app.id} className="bg-[#111] rounded-2xl border border-white/5 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold">{app.full_name}</span>
                  {app.status === 'member' ? (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#00ff88]/10 text-[#00ff88]">
                      Member
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white/5 text-white/40">
                      {app.status ?? 'Pending'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 text-white/40 text-xs mb-3">
                  <span>Level {app.skill_level}</span>
                  <span>·</span>
                  <span>{app.whatsapp_number}</span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={buildWhatsAppUrl(app)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white/60 hover:border-[#00ff88]/30 hover:text-[#00ff88] transition-all"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    WhatsApp
                  </a>
                  {app.status !== 'member' && (
                    <button
                      onClick={() => handleApprove(app.id)}
                      disabled={approvingId === app.id}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#00ff88]/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#00ff88] hover:bg-[#00ff88]/20 transition-all disabled:opacity-50"
                    >
                      {approvingId === app.id ? (
                        'Approving...'
                      ) : (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                          Approve
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

// ─── Pending Approval Screen ────────────────────────────────────────────────

function PendingApprovalScreen() {
  const router = useRouter()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full text-center">
        <div className="bg-[#111] rounded-[40px] border border-white/5 p-10 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-6">
            <svg width="32" height="32" fill="none" viewBox="0 0 24 24" stroke="#EAB308" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black uppercase tracking-tighter mb-2">Pending Approval</h2>
          <p className="text-white/40 text-sm mb-8 leading-relaxed">
            Your application is being reviewed. You&apos;ll get full access once an admin approves your membership.
          </p>
          <button
            onClick={handleSignOut}
            className="w-full py-4 bg-white/5 border border-white/10 text-white/60 font-bold rounded-2xl uppercase tracking-widest text-xs hover:bg-white/10 transition-all"
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Shared Loading Spinner ─────────────────────────────────────────────────

function LoadingSpinner({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-32">
      <div className="w-8 h-8 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
      <span className="text-white/40 text-sm font-medium mt-3">{label}</span>
    </div>
  )
}

// ─── Main Dashboard Page ────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter()
  const [role, setRole] = useState<UserRole | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [memberStatus, setMemberStatus] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'profile' | 'admin'>('profile')

  useEffect(() => {
    async function init() {
      const { role, userId } = await getUserRole()
      if (!userId) {
        router.replace('/login')
        return
      }

      // Fetch application status
      const { data } = await supabase
        .from('applications')
        .select('status')
        .eq('id', userId)
        .single()

      setRole(role)
      setUserId(userId)
      setMemberStatus(data?.status || null)
      setLoading(false)
    }
    init()
  }, [router])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
          <span className="text-white/40 text-sm font-medium">Loading...</span>
        </div>
      </div>
    )
  }

  // Pending gate — admins bypass this
  if (role !== 'admin' && memberStatus !== 'member') {
    return <PendingApprovalScreen />
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex justify-center overflow-y-auto">
      <div className="w-full max-w-[480px] min-h-screen relative pb-24 page-transition">
        {/* Sign Out button */}
        <div className="flex justify-end px-6 pt-4">
          <button
            onClick={handleSignOut}
            className="text-[10px] font-bold uppercase tracking-wider text-white/30 hover:text-white/60 transition-all px-3 py-1.5 rounded-lg border border-white/5 hover:border-white/10"
          >
            Sign Out
          </button>
        </div>

        {/* Tabs for admin users */}
        {role === 'admin' && (
          <>
            <div className="flex border-b border-white/5 px-6 sticky top-0 bg-[#0a0a0a]/95 backdrop-blur-md z-20">
              {(['profile', 'admin'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3.5 text-[11px] font-bold uppercase tracking-widest transition-all ${
                    activeTab === tab ? 'text-[#00ff88] border-b-2 border-[#00ff88]' : 'text-white/30 border-b-2 border-transparent'
                  }`}
                >
                  {tab === 'profile' ? 'My Profile' : 'Admin'}
                </button>
              ))}
            </div>
            {activeTab === 'profile' && userId && <PlayerDashboard userId={userId} inTabs />}
            {activeTab === 'admin' && <AdminDashboard inTabs />}
          </>
        )}

        {role === 'coach' && userId && <CoachDashboard userId={userId} />}
        {role === 'player' && userId && <PlayerDashboard userId={userId} />}
      </div>
      <BottomNav />
    </div>
  )
}
