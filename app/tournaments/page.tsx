'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/app/components/BottomNav'
import Toast from '@/app/components/Toast'

type Tournament = {
  id: string
  name: string
  date: string
  display_date: string
  venue: string
  format: string
  entry_fee: number
  max_teams: number
  registered_teams: number
  status: 'upcoming' | 'open' | 'full' | 'in_progress' | 'completed'
  description: string
  prize_pool: string
}

const FALLBACK_TOURNAMENTS: Tournament[] = [
  {
    id: '1', name: 'KPC Open — February Cup', date: '2026-02-22', display_date: 'Sat, 22 Feb 2026',
    venue: 'Legends Arena, DHA Phase 6', format: 'Round Robin + Knockout', entry_fee: 5000,
    max_teams: 16, registered_teams: 11, status: 'open',
    description: 'The monthly flagship tournament of the Karachi Padel Circuit. Open to all skill levels with seeded brackets.',
    prize_pool: 'PKR 50,000',
  },
  {
    id: '2', name: 'Beginners Bash 2.0', date: '2026-03-02', display_date: 'Sun, 2 Mar 2026',
    venue: 'Viva Padel, Clifton', format: 'Round Robin', entry_fee: 3000,
    max_teams: 12, registered_teams: 7, status: 'open',
    description: 'Exclusive tournament for players rated 1.0-2.5. Great atmosphere, perfect for your first competitive experience.',
    prize_pool: 'PKR 25,000',
  },
  {
    id: '3', name: 'Corporate Challenge', date: '2026-03-14', display_date: 'Fri, 14 Mar 2026',
    venue: 'Greenwich Padel, DHA Phase 8', format: 'Knockout', entry_fee: 10000,
    max_teams: 8, registered_teams: 8, status: 'full',
    description: 'Inter-company padel showdown. Register as a corporate pair and compete for the Corporate Cup.',
    prize_pool: 'PKR 100,000',
  },
  {
    id: '4', name: 'KPC Pro Series — March', date: '2026-03-22', display_date: 'Sat, 22 Mar 2026',
    venue: 'Padelverse, Bukhari Commercial', format: 'Double Elimination', entry_fee: 8000,
    max_teams: 16, registered_teams: 3, status: 'upcoming',
    description: 'High-level competitive tournament for players rated 3.5+. Streamed live on KPC social channels.',
    prize_pool: 'PKR 75,000',
  },
  {
    id: '5', name: 'Valentine Mixer', date: '2026-02-15', display_date: 'Sat, 15 Feb 2026',
    venue: 'Legends Arena, DHA Phase 6', format: 'Mixed Doubles Round Robin', entry_fee: 6000,
    max_teams: 12, registered_teams: 12, status: 'full',
    description: 'Mixed doubles tournament with randomized partner assignments. Social event with dinner included.',
    prize_pool: 'PKR 40,000',
  },
]

function StatusBadge({ status }: { status: Tournament['status'] }) {
  const styles: Record<string, string> = {
    open: 'bg-[#00ff88]/10 text-[#00ff88] border-[#00ff88]/20',
    upcoming: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    full: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
    in_progress: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
    completed: 'bg-white/5 text-white/30 border-white/10',
  }
  const labels: Record<string, string> = {
    open: 'Registration Open',
    upcoming: 'Coming Soon',
    full: 'Sold Out',
    in_progress: 'Live Now',
    completed: 'Completed',
  }
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

export default function TournamentsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [filter, setFilter] = useState<'all' | 'open' | 'upcoming'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [registeredIds, setRegisteredIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [registering, setRegistering] = useState<string | null>(null)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type })
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)

        // Load user's registrations
        const { data: regs } = await supabase
          .from('tournament_registrations')
          .select('tournament_id')
          .eq('user_id', user.id)
        if (regs) {
          setRegisteredIds(new Set(regs.map((r: any) => r.tournament_id)))
        }
      }

      // Fetch tournaments from Supabase
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('date', { ascending: true })

      if (!error && data && data.length > 0) {
        setTournaments(
          data.map((t: any) => ({
            id: t.id,
            name: t.name,
            date: t.date,
            display_date: t.display_date,
            venue: t.venue,
            format: t.format,
            entry_fee: t.entry_fee,
            max_teams: t.max_teams,
            registered_teams: t.registered_teams,
            status: t.status,
            description: t.description || '',
            prize_pool: t.prize_pool || '',
          }))
        )
      } else {
        // Fallback to hardcoded data if table doesn't exist yet
        setTournaments(FALLBACK_TOURNAMENTS)
      }
      setLoading(false)
    }
    init()
  }, [])

  async function handleRegister(tournamentId: string) {
    if (!userId) {
      showToast('Please sign in to register', 'error')
      return
    }
    setRegistering(tournamentId)

    // Insert registration
    const { error: regError } = await supabase
      .from('tournament_registrations')
      .insert({ tournament_id: tournamentId, user_id: userId })

    if (regError) {
      if (regError.code === '23505') {
        showToast('You are already registered', 'error')
      } else {
        showToast('Failed to register', 'error')
      }
      setRegistering(null)
      return
    }

    // Increment registered_teams count
    const tournament = tournaments.find((t) => t.id === tournamentId)
    if (tournament) {
      const newCount = tournament.registered_teams + 1
      const newStatus = newCount >= tournament.max_teams ? 'full' : tournament.status
      await supabase
        .from('tournaments')
        .update({ registered_teams: newCount, status: newStatus })
        .eq('id', tournamentId)

      setTournaments(
        tournaments.map((t) =>
          t.id === tournamentId ? { ...t, registered_teams: newCount, status: newStatus as Tournament['status'] } : t
        )
      )
    }

    setRegisteredIds(new Set([...registeredIds, tournamentId]))
    showToast('Registered successfully!')
    setRegistering(null)
  }

  const filtered = filter === 'all'
    ? tournaments
    : tournaments.filter((t) => t.status === filter)

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
          <span className="text-white/40 text-sm font-medium">Loading tournaments...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex justify-center">
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast((t) => ({ ...t, visible: false }))} />
      <div className="w-full max-w-[480px] min-h-screen relative pb-24">
        {/* Header */}
        <div className="pt-12 pb-4 px-6">
          <h1 className="text-2xl font-bold tracking-tight mb-1">Tournaments</h1>
          <p className="text-white/30 text-sm">Karachi Padel Circuit events</p>
        </div>

        {/* Filters */}
        <div className="px-6 mb-4">
          <div className="flex bg-white/5 rounded-lg p-0.5">
            {(['all', 'open', 'upcoming'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all ${
                  filter === f ? 'bg-[#00ff88] text-black' : 'text-white/40'
                }`}
              >
                {f === 'all' ? 'All' : f === 'open' ? 'Open' : 'Upcoming'}
              </button>
            ))}
          </div>
        </div>

        {/* Tournament Cards */}
        <div className="px-6 space-y-3">
          {filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="text-white/20 text-sm">No tournaments found</p>
            </div>
          )}
          {filtered.map((tournament) => {
            const isExpanded = expandedId === tournament.id
            const isRegistered = registeredIds.has(tournament.id)
            const isRegistering = registering === tournament.id
            const spotsLeft = tournament.max_teams - tournament.registered_teams
            const capacityPct = (tournament.registered_teams / tournament.max_teams) * 100

            return (
              <div
                key={tournament.id}
                className="bg-[#111] rounded-2xl border border-white/5 overflow-hidden hover:border-white/10 transition-all"
              >
                <button
                  onClick={() => setExpandedId(isExpanded ? null : tournament.id)}
                  className="w-full text-left p-5"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0 pr-3">
                      <h3 className="text-sm font-bold">{tournament.name}</h3>
                      <p className="text-white/30 text-xs mt-1">{tournament.display_date}</p>
                    </div>
                    <StatusBadge status={tournament.status} />
                  </div>

                  <div className="flex items-center gap-3 text-[10px] text-white/20 font-medium">
                    <span className="flex items-center gap-1">
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {tournament.venue}
                    </span>
                  </div>

                  {/* Capacity bar */}
                  <div className="mt-3">
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-[10px] text-white/20 font-medium">
                        {tournament.registered_teams}/{tournament.max_teams} teams
                      </span>
                      {spotsLeft > 0 && spotsLeft <= 4 && (
                        <span className="text-[10px] text-orange-400 font-semibold">
                          {spotsLeft} spots left!
                        </span>
                      )}
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${capacityPct}%`,
                          backgroundColor: capacityPct >= 100 ? '#f97316' : capacityPct >= 75 ? '#eab308' : '#00ff88',
                        }}
                      />
                    </div>
                  </div>
                </button>

                {/* Expanded details */}
                {isExpanded && (
                  <div className="px-5 pb-5 space-y-3 border-t border-white/5 pt-4">
                    <p className="text-white/30 text-[12px] leading-relaxed">{tournament.description}</p>

                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white/5 rounded-xl p-3 text-center">
                        <span className="text-[10px] text-white/20 font-medium block">Format</span>
                        <span className="text-[11px] font-bold mt-0.5 block">{tournament.format}</span>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3 text-center">
                        <span className="text-[10px] text-white/20 font-medium block">Entry</span>
                        <span className="text-[11px] font-bold mt-0.5 block">PKR {tournament.entry_fee.toLocaleString()}</span>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3 text-center">
                        <span className="text-[10px] text-white/20 font-medium block">Prize</span>
                        <span className="text-[11px] font-bold text-[#00ff88] mt-0.5 block">{tournament.prize_pool}</span>
                      </div>
                    </div>

                    {isRegistered ? (
                      <button className="w-full py-3 bg-[#00ff88]/10 text-[#00ff88] font-bold rounded-xl text-xs uppercase tracking-wider border border-[#00ff88]/20">
                        Registered ✓
                      </button>
                    ) : tournament.status === 'full' ? (
                      <button className="w-full py-3 bg-white/5 text-white/20 font-bold rounded-xl text-xs uppercase tracking-wider cursor-not-allowed">
                        Sold Out
                      </button>
                    ) : tournament.status === 'open' ? (
                      <button
                        onClick={() => handleRegister(tournament.id)}
                        disabled={isRegistering}
                        className="w-full py-3 bg-[#00ff88] text-black font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-[#00ff88]/90 transition-all disabled:opacity-50"
                      >
                        {isRegistering ? 'Registering...' : `Register — PKR ${tournament.entry_fee.toLocaleString()}`}
                      </button>
                    ) : (
                      <button className="w-full py-3 bg-blue-500/10 text-blue-400 font-bold rounded-xl text-xs uppercase tracking-wider border border-blue-500/20 cursor-default">
                        Registration Opens Soon
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
