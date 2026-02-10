'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/app/components/BottomNav'

type Tournament = {
  id: string
  name: string
  date: string
  venue: string
  format: string
  entryFee: number
  maxTeams: number
  registeredTeams: number
  status: 'upcoming' | 'open' | 'full' | 'in_progress' | 'completed'
  description: string
  prizePool: string
}

const MOCK_TOURNAMENTS: Tournament[] = [
  {
    id: '1',
    name: 'KPC Open — February Cup',
    date: 'Sat, 22 Feb 2026',
    venue: 'Legends Arena, DHA Phase 6',
    format: 'Round Robin + Knockout',
    entryFee: 5000,
    maxTeams: 16,
    registeredTeams: 11,
    status: 'open',
    description: 'The monthly flagship tournament of the Karachi Padel Circuit. Open to all skill levels with seeded brackets.',
    prizePool: 'PKR 50,000',
  },
  {
    id: '2',
    name: 'Beginners Bash 2.0',
    date: 'Sun, 2 Mar 2026',
    venue: 'Viva Padel, Clifton',
    format: 'Round Robin',
    entryFee: 3000,
    maxTeams: 12,
    registeredTeams: 7,
    status: 'open',
    description: 'Exclusive tournament for players rated 1.0–2.5. Great atmosphere, perfect for your first competitive experience.',
    prizePool: 'PKR 25,000',
  },
  {
    id: '3',
    name: 'Corporate Challenge',
    date: 'Fri, 14 Mar 2026',
    venue: 'Greenwich Padel, DHA Phase 8',
    format: 'Knockout',
    entryFee: 10000,
    maxTeams: 8,
    registeredTeams: 8,
    status: 'full',
    description: 'Inter-company padel showdown. Register as a corporate pair and compete for the Corporate Cup.',
    prizePool: 'PKR 100,000',
  },
  {
    id: '4',
    name: 'KPC Pro Series — March',
    date: 'Sat, 22 Mar 2026',
    venue: 'Padelverse, Bukhari Commercial',
    format: 'Double Elimination',
    entryFee: 8000,
    maxTeams: 16,
    registeredTeams: 3,
    status: 'upcoming',
    description: 'High-level competitive tournament for players rated 3.5+. Streamed live on KPC social channels.',
    prizePool: 'PKR 75,000',
  },
  {
    id: '5',
    name: 'Valentine Mixer',
    date: 'Sat, 15 Feb 2026',
    venue: 'Legends Arena, DHA Phase 6',
    format: 'Mixed Doubles Round Robin',
    entryFee: 6000,
    maxTeams: 12,
    registeredTeams: 12,
    status: 'full',
    description: 'Mixed doubles tournament with randomized partner assignments. Social event with dinner included.',
    prizePool: 'PKR 40,000',
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
  const [tournaments, setTournaments] = useState<Tournament[]>(MOCK_TOURNAMENTS)
  const [filter, setFilter] = useState<'all' | 'open' | 'upcoming'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [registeredIds, setRegisteredIds] = useState<string[]>([])

  useEffect(() => {
    // Try loading from Supabase tournaments table
    async function load() {
      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('date', { ascending: true })
      if (!error && data && data.length > 0) {
        // Transform when real table exists
      }
    }
    load()
  }, [])

  const filtered = filter === 'all'
    ? tournaments
    : tournaments.filter((t) => t.status === filter)

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex justify-center">
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
            const isRegistered = registeredIds.includes(tournament.id)
            const spotsLeft = tournament.maxTeams - tournament.registeredTeams
            const capacityPct = (tournament.registeredTeams / tournament.maxTeams) * 100

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
                      <p className="text-white/30 text-xs mt-1">{tournament.date}</p>
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
                        {tournament.registeredTeams}/{tournament.maxTeams} teams
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
                        <span className="text-[11px] font-bold mt-0.5 block">PKR {tournament.entryFee.toLocaleString()}</span>
                      </div>
                      <div className="bg-white/5 rounded-xl p-3 text-center">
                        <span className="text-[10px] text-white/20 font-medium block">Prize</span>
                        <span className="text-[11px] font-bold text-[#00ff88] mt-0.5 block">{tournament.prizePool}</span>
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
                        onClick={() => setRegisteredIds([...registeredIds, tournament.id])}
                        className="w-full py-3 bg-[#00ff88] text-black font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-[#00ff88]/90 transition-all"
                      >
                        Register — PKR {tournament.entryFee.toLocaleString()}
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
