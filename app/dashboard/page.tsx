'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { supabase, getUserRole, UserRole } from '@/lib/supabase'
import { IMAGES } from '@/lib/images'
import { CLUBS } from '@/lib/clubs'
import { hapticLight } from '@/lib/haptics'
import BottomNav from '@/app/components/BottomNav'
import Toast from '@/app/components/Toast'
import AvailabilityPicker, { type AvailabilityEntry } from '@/app/components/AvailabilityPicker'

// ─── Quick Action Items ─────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  {
    label: 'Find Match',
    href: '/matchmaking',
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    label: 'Book Court',
    href: '/booking',
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: 'Tournaments',
    href: '/tournaments',
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 4v12l-4-2-4 2V4M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    label: 'Americano',
    href: '/americano',
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
      </svg>
    ),
  },
  {
    label: 'Coaching',
    href: '/coaching',
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    label: 'Leaderboard',
    href: '/leaderboard',
    icon: (
      <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.8">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
]

// ─── Bank Discounts ─────────────────────────────────────────────────────────

const BANK_DISCOUNTS = [
  {
    bank: 'HBL',
    color: '#00A651',
    discount: '15% OFF',
    description: 'Court bookings with HBL cards',
    code: 'HBL15',
  },
  {
    bank: 'Meezan Bank',
    color: '#00796B',
    discount: '10% OFF',
    description: 'All coaching sessions',
    code: 'MEEZAN10',
  },
  {
    bank: 'JS Bank',
    color: '#1E3A5F',
    discount: '20% OFF',
    description: 'First tournament entry',
    code: 'JSBANK20',
  },
]

// ─── Courts Carousel — center, pause, slide ────────────────────────────────

function CourtsCarousel() {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % CLUBS.length)
    }, 3000) // 3s per card (pause included via spring ease)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="overflow-hidden -mx-6">
      <motion.div
        className="flex gap-4 pl-6"
        animate={{ x: -(current * 290) }}
        transition={{ type: 'spring', stiffness: 200, damping: 30 }}
      >
        {CLUBS.map((club, i) => {
          const isActive = i === current
          return (
            <Link
              key={club.id}
              href={`/booking?club=${club.id}`}
              onClick={() => hapticLight()}
              className="flex-shrink-0 active:scale-[0.98] transition-all"
              style={{ width: 274 }}
            >
              <motion.div
                animate={{
                  scale: isActive ? 1 : 0.92,
                  opacity: isActive ? 1 : 0.5,
                }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                className="bg-[#111] rounded-2xl border border-white/5 overflow-hidden"
                style={{ borderColor: isActive ? 'rgba(0,255,136,0.15)' : undefined }}
              >
                <div className="relative w-full h-36">
                  <Image
                    src={club.imageUrl}
                    alt={club.name}
                    fill
                    sizes="274px"
                    className="object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4">
                    <h4 className="text-base font-bold drop-shadow-lg">{club.name}</h4>
                    <p className="text-white/50 text-[11px] drop-shadow">{club.location}</p>
                  </div>
                </div>
                <div className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-white/30 bg-white/5 px-2 py-1 rounded-md">{club.courts} courts</span>
                  </div>
                  <span className="text-[12px] font-bold text-[#00ff88]">
                    PKR {club.pricePerHour.toLocaleString()}<span className="text-white/20 font-normal text-[10px]">/hr</span>
                  </span>
                </div>
              </motion.div>
            </Link>
          )
        })}
      </motion.div>

      {/* Dots indicator */}
      <div className="flex justify-center gap-1.5 mt-3">
        {CLUBS.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === current ? 'w-5 bg-[#00ff88]' : 'w-1.5 bg-white/10'
            }`}
            aria-label={`Go to court ${i + 1}`}
          />
        ))}
      </div>
    </div>
  )
}

// ─── Shared Components ──────────────────────────────────────────────────────

// ─── Player Dashboard ───────────────────────────────────────────────────────

function PlayerDashboard({ userId, inTabs = false }: { userId: string; inTabs?: boolean }) {
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: prof } = await supabase
        .from('applications')
        .select('full_name, skill_level, matches_played, matches_won, avatar_url')
        .eq('id', userId)
        .single()
      setProfile(prof)
      setLoading(false)
    }
    load()
  }, [userId])

  if (loading) return <LoadingSpinner label="Loading dashboard..." />

  return (
    <div className={`${inTabs ? 'pt-2' : ''} pb-24`}>
      {/* Hero Banner */}
      {!inTabs && (
        <div className="relative w-full aspect-[2/1] overflow-hidden">
          <Image
            src={IMAGES.dashboardHero}
            alt="Match Day"
            fill
            sizes="(max-width: 480px) 100vw, 480px"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/50 to-transparent" />
          <div className="absolute bottom-5 left-6 right-6 flex items-end justify-between">
            <div>
              <p className="text-[#00ff88] text-[10px] font-bold uppercase tracking-widest mb-1">Welcome back</p>
              <h1 className="text-2xl font-bold tracking-tight">{profile?.full_name || 'Player'}</h1>
              <p className="text-white/40 text-xs mt-1">Ready to play?</p>
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
            <p className="text-[#00ff88] text-[10px] font-bold uppercase tracking-widest mb-1">Welcome back</p>
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

      {/* ── Featured Promo Banner ── */}
      <section className="mb-8">
        <Link href="/matchmaking" onClick={() => hapticLight()}>
          <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#00ff88]/20 via-[#00ff88]/5 to-transparent border border-[#00ff88]/10 p-5">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#00ff88]/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-20 h-20 bg-[#00ff88]/5 rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#00ff88] mb-1">This Week</p>
              <h3 className="text-lg font-bold mb-1">Find Your Next Match</h3>
              <p className="text-white/40 text-xs mb-3">Skill-based matchmaking with players in Karachi</p>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-[#00ff88] uppercase tracking-wider">
                Play Now
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </span>
            </div>
          </div>
        </Link>
      </section>

      {/* ── Quick Actions ── */}
      <section className="mb-8">
        <h3 className="text-xs uppercase font-bold tracking-wider text-white/40 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-3 gap-3">
          {QUICK_ACTIONS.map((action, i) => (
            <motion.div
              key={action.href}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 30 }}
            >
              <Link
                href={action.href}
                onClick={() => hapticLight()}
                className="bg-[#111] rounded-2xl border border-white/5 p-4 flex flex-col items-center gap-2 active:scale-95 transition-transform relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-b from-[#00ff88]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="text-[#00ff88] relative">{action.icon}</span>
                <span className="text-[10px] font-bold uppercase tracking-wider text-white/50 relative">{action.label}</span>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── Courts — infinite marquee ── */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-xs uppercase font-bold tracking-wider text-white/40">Courts</h3>
          <Link href="/booking" className="text-[10px] text-[#00ff88] font-semibold uppercase hover:underline">See all</Link>
        </div>
        <CourtsCarousel />
      </section>

      {/* ── Bank Discounts ── */}
      <section className="mb-8">
        <h3 className="text-xs uppercase font-bold tracking-wider text-white/40 mb-3">Bank Discounts</h3>
        <div className="space-y-3">
          {BANK_DISCOUNTS.map((deal) => (
            <motion.div
              key={deal.bank}
              whileTap={{ scale: 0.98 }}
              className="bg-[#111] rounded-2xl border border-white/5 p-4 flex items-center gap-4 overflow-hidden relative"
            >
              {/* Bank accent bar */}
              <div className="absolute left-0 top-0 bottom-0 w-1 rounded-l-2xl" style={{ backgroundColor: deal.color }} />

              {/* Bank logo circle */}
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-[11px] font-black tracking-tight"
                style={{ backgroundColor: `${deal.color}15`, color: deal.color }}
              >
                {deal.bank.split(' ').map(w => w[0]).join('')}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h4 className="text-sm font-bold">{deal.bank}</h4>
                  <span
                    className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${deal.color}20`, color: deal.color }}
                  >
                    {deal.discount}
                  </span>
                </div>
                <p className="text-white/30 text-[11px]">{deal.description}</p>
              </div>

              <div className="flex-shrink-0 text-right">
                <p className="text-[10px] text-white/20 uppercase font-bold tracking-wider">Code</p>
                <p className="text-xs font-bold text-white/60 font-mono">{deal.code}</p>
              </div>
            </motion.div>
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
  const [coachRecord, setCoachRecord] = useState<any>(null)
  const [bookings, setBookings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'schedule' | 'profile'>('schedule')
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })

  // Profile edit state
  const [editSpecialization, setEditSpecialization] = useState('')
  const [editRate, setEditRate] = useState('')
  const [editLevel, setEditLevel] = useState('Pro')
  const [editAvailability, setEditAvailability] = useState<AvailabilityEntry[]>([])
  const [saving, setSaving] = useState(false)

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

      // Find coach record by user_id
      const { data: coach } = await supabase
        .from('coaches')
        .select('*')
        .eq('user_id', userId)
        .single()

      if (coach) {
        setCoachRecord(coach)
        setEditSpecialization(coach.specialization || '')
        setEditRate(String(coach.rate || ''))
        setEditLevel(coach.level || 'Pro')
        const avail = typeof coach.availability === 'string'
          ? JSON.parse(coach.availability)
          : coach.availability || []
        setEditAvailability(avail)

        // Fetch confirmed bookings
        const { data: bks } = await supabase
          .from('coaching_bookings')
          .select('id, user_id, day, time_slot, price, status')
          .eq('coach_id', coach.id)
          .eq('status', 'confirmed')

        if (bks && bks.length > 0) {
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

  async function handleSaveProfile() {
    if (!coachRecord) return
    setSaving(true)

    const { error } = await supabase
      .from('coaches')
      .update({
        specialization: editSpecialization,
        rate: Number(editRate),
        level: editLevel,
        availability: editAvailability,
      })
      .eq('user_id', userId)

    if (error) {
      setToast({ visible: true, message: error.message, type: 'error' })
    } else {
      setToast({ visible: true, message: 'Profile updated!', type: 'success' })
      setCoachRecord({ ...coachRecord, specialization: editSpecialization, rate: Number(editRate), level: editLevel, availability: editAvailability })
    }
    setSaving(false)
  }

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
      <div className="mb-6">
        <p className="text-white/40 text-xs font-semibold uppercase tracking-wider mb-1">Coach Portal</p>
        <h1 className="text-2xl font-bold tracking-tight">{coachName || 'Coach'}</h1>
      </div>

      {/* Tab Toggle */}
      <div className="flex border-b border-white/5 mb-6">
        {(['schedule', 'profile'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-3 text-[11px] font-bold uppercase tracking-widest transition-all ${
              activeTab === tab ? 'text-[#00ff88] border-b-2 border-[#00ff88]' : 'text-white/30 border-b-2 border-transparent'
            }`}
          >
            {tab === 'schedule' ? 'Schedule' : 'My Profile'}
          </button>
        ))}
      </div>

      {activeTab === 'schedule' && (
        <>
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
        </>
      )}

      {activeTab === 'profile' && (
        <div className="space-y-4">
          {!coachRecord ? (
            <div className="bg-[#111] rounded-2xl border border-white/5 p-8 text-center">
              <p className="text-white/20 text-sm">No coach profile found. Contact admin.</p>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <label className="text-[10px] uppercase text-gray-500 font-bold ml-1">Specialization</label>
                <input value={editSpecialization} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 outline-none focus:border-[#00ff88] transition-all"
                  onChange={e => setEditSpecialization(e.target.value)} />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase text-gray-500 font-bold ml-1">Hourly Rate (PKR)</label>
                <input type="number" value={editRate} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 outline-none focus:border-[#00ff88] transition-all"
                  onChange={e => setEditRate(e.target.value)} />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase text-gray-500 font-bold ml-1">Level</label>
                <select
                  value={editLevel}
                  onChange={e => setEditLevel(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 outline-none focus:border-[#00ff88] transition-all appearance-none"
                >
                  <option value="Elite">Elite</option>
                  <option value="Pro">Pro</option>
                  <option value="Intermediate">Intermediate</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase text-gray-500 font-bold ml-1">Availability</label>
                <AvailabilityPicker value={editAvailability} onChange={setEditAvailability} />
              </div>

              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="w-full mt-2 py-4 bg-[#00ff88] text-black font-black rounded-2xl uppercase tracking-widest text-xs hover:shadow-[0_0_20px_rgba(0,255,136,0.2)] transition-all disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          )}
        </div>
      )}
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
  role?: string | null
  created_at: string
}

function AdminDashboard({ inTabs = false }: { inTabs?: boolean }) {
  const [stats, setStats] = useState({ members: 0, revenue: 0, activeMatches: 0 })
  const [applications, setApplications] = useState<Application[]>([])
  const [coaches, setCoaches] = useState<any[]>([])
  const [matches, setMatches] = useState<any[]>([])
  const [editingCoachId, setEditingCoachId] = useState<string | null>(null)
  const [editCoachData, setEditCoachData] = useState<any>({})
  const [savingCoach, setSavingCoach] = useState(false)
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingMatchId, setDeletingMatchId] = useState<string | null>(null)
  const [confirmDeleteMatchId, setConfirmDeleteMatchId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [membersRes, bookingsRes, matchesRes, appsRes, coachesRes, allMatchesRes] = await Promise.all([
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
        supabase
          .from('coaches')
          .select('*'),
        supabase
          .from('matches')
          .select('*')
          .order('date', { ascending: false }),
      ])

      const memberCount = membersRes.count || 0
      const legendsRevenue = (bookingsRes.data || []).reduce((sum: number, b: any) => sum + (b.price || 0), 0)
      const activeMatchCount = matchesRes.count || 0

      setStats({ members: memberCount, revenue: legendsRevenue, activeMatches: activeMatchCount })
      setApplications(appsRes.data || [])

      // Enrich matches with creator names
      const allMatches = allMatchesRes.data || []
      const creatorIds = [...new Set(allMatches.map((m: any) => m.creator_id))]
      let creatorMap: Record<string, string> = {}
      if (creatorIds.length > 0) {
        const { data: creators } = await supabase
          .from('applications')
          .select('id, full_name')
          .in('id', creatorIds)
        creators?.forEach((c: any) => { creatorMap[c.id] = c.full_name })
      }
      setMatches(allMatches.map((m: any) => ({ ...m, creator_name: creatorMap[m.creator_id] || 'Unknown' })))

      setCoaches((coachesRes.data || []).map((c: any) => ({
        ...c,
        availability: typeof c.availability === 'string' ? JSON.parse(c.availability) : c.availability || [],
      })))
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

  async function handleDelete(id: string) {
    setDeletingId(id)

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    const res = await fetch('/api/delete-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ id }),
    })

    const result = await res.json()

    if (!res.ok || result.error) {
      console.error('Delete error:', result.error)
    } else {
      setApplications((prev) => prev.filter((app) => app.id !== id))
    }
    setDeletingId(null)
    setConfirmDeleteId(null)
  }

  async function handleDeleteMatch(matchId: string) {
    setDeletingMatchId(matchId)

    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    const res = await fetch('/api/delete-match', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ id: matchId }),
    })

    const result = await res.json()

    if (!res.ok || result.error) {
      console.error('Delete match error:', result.error)
      alert(`Delete failed: ${result.error || 'Unknown error'}`)
    } else {
      setMatches((prev) => prev.filter((m) => m.id !== matchId))
    }
    setDeletingMatchId(null)
    setConfirmDeleteMatchId(null)
  }

  function buildWhatsAppUrl(app: Application) {
    const number = app.whatsapp_number.replace(/[^0-9]/g, '')
    const text = encodeURIComponent(
      `Hi ${app.full_name}, welcome to Match Day! We saw your ${app.skill_level} rating—ready for an evaluation?`
    )
    return `https://wa.me/${number}?text=${text}`
  }

  function startEditCoach(coach: any) {
    setEditingCoachId(coach.id)
    setEditCoachData({
      specialization: coach.specialization || '',
      rate: String(coach.rate || ''),
      level: coach.level || 'Pro',
      availability: coach.availability || [],
    })
  }

  async function handleSaveCoach(coachId: string) {
    setSavingCoach(true)
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token

    const res = await fetch('/api/update-coach', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        coachId,
        specialization: editCoachData.specialization,
        rate: Number(editCoachData.rate),
        level: editCoachData.level,
        availability: editCoachData.availability,
      }),
    })

    if (res.ok) {
      setCoaches((prev) =>
        prev.map((c) =>
          c.id === coachId
            ? { ...c, specialization: editCoachData.specialization, rate: Number(editCoachData.rate), level: editCoachData.level, availability: editCoachData.availability }
            : c
        )
      )
      setEditingCoachId(null)
    }
    setSavingCoach(false)
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
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold">{app.full_name}</span>
                    {app.role === 'coach' && (
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400">
                        Coach
                      </span>
                    )}
                  </div>
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
                <div className="flex items-center gap-2 flex-wrap">
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
                  {confirmDeleteId === app.id ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleDelete(app.id)}
                        disabled={deletingId === app.id}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-red-500/15 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/25 transition-all disabled:opacity-50"
                      >
                        {deletingId === app.id ? 'Deleting...' : 'Confirm'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="inline-flex items-center rounded-xl border border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white/40 hover:text-white/60 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(app.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/20 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-red-400/60 hover:border-red-500/40 hover:text-red-400 transition-all"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Matches Management */}
      <section className="mt-8">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs uppercase font-bold tracking-wider text-white/40">Matches</h3>
          <span className="text-[10px] font-bold text-white/20">{matches.length} total</span>
        </div>
        {matches.length === 0 ? (
          <div className="bg-[#111] rounded-2xl border border-white/5 p-8 text-center">
            <p className="text-white/20 text-sm">No matches yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.map((match: any) => (
              <div key={match.id} className="bg-[#111] rounded-2xl border border-white/5 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-bold">{match.venue}</span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    match.status === 'open' ? 'bg-[#00ff88]/10 text-[#00ff88]'
                      : match.status === 'full' ? 'bg-blue-500/10 text-blue-400'
                      : 'bg-white/5 text-white/30'
                  }`}>
                    {match.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-white/40 text-xs mb-2">
                  <span>{new Date(match.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                  <span>·</span>
                  <span>{match.time}</span>
                  <span>·</span>
                  <span>Level {parseFloat(match.skill_min).toFixed(1)}–{parseFloat(match.skill_max).toFixed(1)}</span>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-white/30">by {match.creator_name}</span>
                  <span className="text-xs text-white/30">{match.current_players}/{match.max_players} players</span>
                </div>
                <div className="flex items-center gap-2">
                  {confirmDeleteMatchId === match.id ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleDeleteMatch(match.id)}
                        disabled={deletingMatchId === match.id}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-red-500/15 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-red-400 hover:bg-red-500/25 transition-all disabled:opacity-50"
                      >
                        {deletingMatchId === match.id ? 'Deleting...' : 'Confirm Delete'}
                      </button>
                      <button
                        onClick={() => setConfirmDeleteMatchId(null)}
                        className="inline-flex items-center rounded-xl border border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white/40 hover:text-white/60 transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteMatchId(match.id)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-red-500/20 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-red-400/60 hover:border-red-500/40 hover:text-red-400 transition-all"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Coaches Management */}
      <section className="mt-8">
        <h3 className="text-xs uppercase font-bold tracking-wider text-white/40 mb-3">Coaches</h3>
        {coaches.length === 0 ? (
          <div className="bg-[#111] rounded-2xl border border-white/5 p-8 text-center">
            <p className="text-white/20 text-sm">No coaches registered yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {coaches.map((coach) => (
              <div key={coach.id} className="bg-[#111] rounded-2xl border border-white/5 p-4">
                {editingCoachId === coach.id ? (
                  <div className="space-y-3">
                    <h4 className="text-sm font-bold mb-2">{coach.name}</h4>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-gray-500 font-bold ml-1">Specialization</label>
                      <input value={editCoachData.specialization} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-[#00ff88] transition-all"
                        onChange={e => setEditCoachData({ ...editCoachData, specialization: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase text-gray-500 font-bold ml-1">Rate (PKR)</label>
                        <input type="number" value={editCoachData.rate} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-[#00ff88] transition-all"
                          onChange={e => setEditCoachData({ ...editCoachData, rate: e.target.value })} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] uppercase text-gray-500 font-bold ml-1">Level</label>
                        <select value={editCoachData.level} className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-[#00ff88] transition-all appearance-none"
                          onChange={e => setEditCoachData({ ...editCoachData, level: e.target.value })}>
                          <option value="Elite">Elite</option>
                          <option value="Pro">Pro</option>
                          <option value="Intermediate">Intermediate</option>
                        </select>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase text-gray-500 font-bold ml-1">Availability</label>
                      <AvailabilityPicker value={editCoachData.availability} onChange={(v: AvailabilityEntry[]) => setEditCoachData({ ...editCoachData, availability: v })} />
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setEditingCoachId(null)} className="flex-1 py-2.5 bg-white/5 text-white/50 font-bold rounded-xl text-xs uppercase tracking-wider">
                        Cancel
                      </button>
                      <button onClick={() => handleSaveCoach(coach.id)} disabled={savingCoach} className="flex-1 py-2.5 bg-[#00ff88] text-black font-bold rounded-xl text-xs uppercase tracking-wider disabled:opacity-50">
                        {savingCoach ? 'Saving...' : 'Save'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold">{coach.name}</span>
                        <span className="text-[10px] font-semibold text-[#00ff88] bg-[#00ff88]/10 px-1.5 py-0.5 rounded">
                          {coach.level || 'Pro'}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-[#00ff88]">PKR {(coach.rate || 0).toLocaleString()}/hr</span>
                    </div>
                    <p className="text-white/40 text-xs mb-2">{coach.specialization || 'No specialization set'}</p>
                    <div className="flex items-center gap-2 flex-wrap mb-3">
                      {(coach.availability || []).slice(0, 4).map((a: any) => (
                        <span key={a.day} className="text-[10px] font-medium text-white/20 bg-white/5 px-2 py-1 rounded-md">
                          {a.day} · {a.slots?.length || 0} slots
                        </span>
                      ))}
                    </div>
                    <button
                      onClick={() => startEditCoach(coach)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white/60 hover:border-[#00ff88]/30 hover:text-[#00ff88] transition-all"
                    >
                      Edit
                    </button>
                  </>
                )}
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
