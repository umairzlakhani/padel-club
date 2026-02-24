'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { hapticLight, hapticMedium } from '@/lib/haptics'
import BottomNav from '@/app/components/BottomNav'
import Toast from '@/app/components/Toast'

type Tournament = {
  id: string
  name: string
  date: string
  end_date: string
  display_date: string
  venue: string
  format: string
  entry_fee: number
  max_teams: number
  registered_teams: number
  status: 'upcoming' | 'open' | 'full' | 'in_progress' | 'completed'
  description: string
  prize_pool: string
  organizer: string
  organizer_logo: string
}

type Match = {
  id: string
  tournament_id: string
  group: string
  player1: { name: string; avatar: string }
  player2: { name: string; avatar: string }
  court: number
  time: string
  score1?: number
  score2?: number
  status: 'scheduled' | 'live' | 'completed'
}

type StatusTab = 'ongoing' | 'upcoming' | 'completed'

// Fallback/mock data removed — tournaments and matches load from Supabase only

const LOGO_COLORS: Record<string, string> = {
  KPC: '#00ff88',
  MD: '#3B82F6',
  GC: '#f97316',
  LA: '#a855f7',
}

const spring = { type: 'spring' as const, stiffness: 300, damping: 30 }

function OrganizerLogo({ initials }: { initials: string }) {
  const color = LOGO_COLORS[initials] || '#00ff88'
  return (
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-black tracking-tight shrink-0"
      style={{ backgroundColor: `${color}15`, color }}
    >
      {initials}
    </div>
  )
}

function CornerRibbon({ type }: { type: 'live' | 'upcoming' }) {
  const isLive = type === 'live'
  return (
    <div className="absolute top-0 right-0 overflow-hidden w-20 h-20 pointer-events-none">
      <div
        className={`absolute top-[10px] right-[-28px] w-[120px] text-center text-[9px] font-black uppercase tracking-wider py-1 rotate-45 ${
          isLive
            ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
            : 'bg-[#00ff88] text-black shadow-lg shadow-[#00ff88]/30'
        }`}
      >
        {isLive ? (
          <span className="flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            Live
          </span>
        ) : (
          'Upcoming'
        )}
      </div>
    </div>
  )
}

function PlayerAvatar({ initials }: { initials: string }) {
  return (
    <div className="w-7 h-7 text-[10px] rounded-full bg-white/10 flex items-center justify-center font-bold text-white/60 shrink-0">
      {initials}
    </div>
  )
}

function MatchCard({ match }: { match: Match }) {
  const isLive = match.status === 'live'
  const isCompleted = match.status === 'completed'

  return (
    <div className={`bg-white/[0.03] rounded-xl p-3.5 border transition-all ${
      isLive ? 'border-red-500/20' : 'border-white/5'
    }`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 flex-1 min-w-0">
          <PlayerAvatar initials={match.player1.avatar} />
          <span className={`text-xs font-semibold truncate ${
            isCompleted && match.score1 !== undefined && match.score2 !== undefined && match.score1 > match.score2
              ? 'text-[#00ff88]' : 'text-white/80'
          }`}>
            {match.player1.name}
          </span>
        </div>

        <div className="px-3 shrink-0 text-center min-w-[56px]">
          {isCompleted || isLive ? (
            <div className="flex items-center justify-center gap-1.5">
              <span className={`text-sm font-bold ${
                match.score1 !== undefined && match.score2 !== undefined && match.score1 > match.score2 ? 'text-[#00ff88]' : 'text-white/50'
              }`}>
                {match.score1 ?? 0}
              </span>
              <span className="text-white/20 text-[10px]">–</span>
              <span className={`text-sm font-bold ${
                match.score1 !== undefined && match.score2 !== undefined && match.score2 > match.score1 ? 'text-[#00ff88]' : 'text-white/50'
              }`}>
                {match.score2 ?? 0}
              </span>
            </div>
          ) : (
            <span className="text-[10px] text-white/20 font-bold uppercase">VS</span>
          )}
        </div>

        <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end">
          <span className={`text-xs font-semibold truncate text-right ${
            isCompleted && match.score1 !== undefined && match.score2 !== undefined && match.score2 > match.score1
              ? 'text-[#00ff88]' : 'text-white/80'
          }`}>
            {match.player2.name}
          </span>
          <PlayerAvatar initials={match.player2.avatar} />
        </div>
      </div>

      <div className="flex items-center justify-between mt-2.5 pt-2.5 border-t border-white/5">
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-white/20 font-medium flex items-center gap-1">
            <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Court {match.court}
          </span>
          <span className="text-[10px] text-white/20 font-medium flex items-center gap-1">
            <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {match.time}
          </span>
        </div>
        {isLive && (
          <span className="flex items-center gap-1.5 text-[10px] font-bold text-red-400">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
            LIVE
          </span>
        )}
        {isCompleted && <span className="text-[10px] font-medium text-white/20">Final</span>}
        {match.status === 'scheduled' && <span className="text-[10px] font-medium text-white/20">Scheduled</span>}
      </div>
    </div>
  )
}

function GroupedMatches({ matches }: { matches: Match[] }) {
  const groups = matches.reduce<Record<string, Match[]>>((acc, m) => {
    if (!acc[m.group]) acc[m.group] = []
    acc[m.group].push(m)
    return acc
  }, {})

  return (
    <div className="space-y-4">
      {Object.entries(groups).map(([group, groupMatches], gi) => (
        <motion.div
          key={group}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: gi * 0.08, ...spring }}
        >
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-[10px] uppercase font-bold tracking-wider text-white/20">{group}</span>
            <div className="flex-1 h-px bg-white/5" />
            <span className="text-[10px] text-white/15 font-medium">{groupMatches.length} matches</span>
          </div>
          <div className="space-y-2">
            {groupMatches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

export default function TournamentsPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [tournaments, setTournaments] = useState<Tournament[]>([])
  const [tab, setTab] = useState<StatusTab>('ongoing')
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
        const { data: regs } = await supabase
          .from('tournament_registrations')
          .select('tournament_id')
          .eq('user_id', user.id)
        if (regs) setRegisteredIds(new Set(regs.map((r: any) => r.tournament_id)))
      }

      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .order('date', { ascending: true })

      if (!error && data && data.length > 0) {
        setTournaments(
          data.map((t: any) => ({
            id: t.id, name: t.name, date: t.date,
            end_date: t.end_date || t.date, display_date: t.display_date, venue: t.venue,
            format: t.format, entry_fee: t.entry_fee, max_teams: t.max_teams,
            registered_teams: t.registered_teams, status: t.status,
            description: t.description || '', prize_pool: t.prize_pool || '',
            organizer: t.organizer || 'Match Day', organizer_logo: t.organizer_logo || 'MD',
          }))
        )
      }
      setLoading(false)
    }
    init()
  }, [])

  useEffect(() => {
    const channel = supabase
      .channel('tournaments-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, (payload) => {
        if (payload.eventType === 'UPDATE') {
          const u = payload.new as any
          setTournaments((prev) => prev.map((t) => t.id === u.id ? { ...t, status: u.status, registered_teams: u.registered_teams ?? t.registered_teams, name: u.name ?? t.name, prize_pool: u.prize_pool ?? t.prize_pool } : t))
        } else if (payload.eventType === 'INSERT') {
          const ins = payload.new as any
          setTournaments((prev) => [...prev, { id: ins.id, name: ins.name, date: ins.date, end_date: ins.end_date || ins.date, display_date: ins.display_date || '', venue: ins.venue || '', format: ins.format || '', entry_fee: ins.entry_fee || 0, max_teams: ins.max_teams || 0, registered_teams: ins.registered_teams || 0, status: ins.status || 'upcoming', description: ins.description || '', prize_pool: ins.prize_pool || '', organizer: ins.organizer || 'Match Day', organizer_logo: ins.organizer_logo || 'MD' }])
        } else if (payload.eventType === 'DELETE') {
          setTournaments((prev) => prev.filter((t) => t.id !== (payload.old as any).id))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function handleRegister(tournamentId: string) {
    if (!userId) { showToast('Please sign in to register', 'error'); return }
    setRegistering(tournamentId)
    hapticMedium()

    const { error: regError } = await supabase
      .from('tournament_registrations')
      .insert({ tournament_id: tournamentId, user_id: userId })

    if (regError) {
      showToast(regError.code === '23505' ? 'You are already registered' : 'Failed to register', 'error')
      setRegistering(null)
      return
    }

    const tournament = tournaments.find((t) => t.id === tournamentId)
    if (tournament) {
      const newCount = tournament.registered_teams + 1
      const newStatus = newCount >= tournament.max_teams ? 'full' : tournament.status
      await supabase.from('tournaments').update({ registered_teams: newCount, status: newStatus }).eq('id', tournamentId)
      setTournaments(tournaments.map((t) => t.id === tournamentId ? { ...t, registered_teams: newCount, status: newStatus as Tournament['status'] } : t))
    }

    // Post to activity feed
    const { data: profileData } = await supabase.from('applications').select('full_name').eq('id', userId).single()
    const playerName = profileData?.full_name || 'A player'
    await supabase.from('activity_feed').insert({
      user_id: userId,
      type: 'tournament_registered',
      title: `${playerName} registered for ${tournament?.name || 'a tournament'}`,
      description: `${tournament?.display_date} · ${tournament?.venue} · ${(tournament?.registered_teams || 0) + 1}/${tournament?.max_teams} teams`,
      metadata: { tournament_id: tournamentId, tournament_name: tournament?.name },
    }).then(() => {})

    setRegisteredIds(new Set([...registeredIds, tournamentId]))
    showToast('Registered successfully!')
    setRegistering(null)
  }

  function getTabTournaments(t: StatusTab): Tournament[] {
    switch (t) {
      case 'ongoing': return tournaments.filter((x) => x.status === 'in_progress' || x.status === 'open' || x.status === 'full')
      case 'upcoming': return tournaments.filter((x) => x.status === 'upcoming')
      case 'completed': return tournaments.filter((x) => x.status === 'completed')
    }
  }

  const filtered = getTabTournaments(tab)
  const tabCounts: Record<StatusTab, number> = {
    ongoing: getTabTournaments('ongoing').length,
    upcoming: getTabTournaments('upcoming').length,
    completed: getTabTournaments('completed').length,
  }

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
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex justify-center overflow-y-auto">
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast((t) => ({ ...t, visible: false }))} />
      <div className="w-full max-w-[480px] min-h-screen relative pb-24">
        {/* Header */}
        <div className="pt-12 pb-4 px-6">
          <h1 className="text-2xl font-bold tracking-tight mb-1">Tournaments</h1>
          <p className="text-white/30 text-sm">Live scores & upcoming events</p>
        </div>

        {/* Status Tabs */}
        <div className="px-6 mb-5">
          <div className="flex bg-white/5 rounded-xl p-1 gap-1">
            {(['ongoing', 'upcoming', 'completed'] as const).map((t) => (
              <motion.button
                key={t}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setTab(t); setExpandedId(null); hapticLight() }}
                className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                  tab === t ? 'bg-[#00ff88] text-black' : 'text-white/40'
                }`}
              >
                {t === 'ongoing' ? 'Ongoing' : t === 'upcoming' ? 'Upcoming' : 'Completed'}
                {tabCounts[t] > 0 && (
                  <span className={`text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center ${
                    tab === t ? 'bg-black/20 text-black' : 'bg-white/10 text-white/30'
                  }`}>
                    {tabCounts[t]}
                  </span>
                )}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Tournament Cards */}
        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={spring}
            className="px-6 space-y-3"
          >
            {filtered.length === 0 && (
              <div className="text-center py-16">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="text-white/15">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="text-white/20 text-sm font-medium">No {tab} tournaments</p>
                <p className="text-white/10 text-xs mt-1">Check back later for updates</p>
              </div>
            )}
            {filtered.map((tournament, i) => {
              const isExpanded = expandedId === tournament.id
              const isRegistered = registeredIds.has(tournament.id)
              const isRegistering = registering === tournament.id
              const spotsLeft = tournament.max_teams - tournament.registered_teams
              const capacityPct = (tournament.registered_teams / tournament.max_teams) * 100
              const isLive = tournament.status === 'in_progress'
              const isUpcoming = tournament.status === 'upcoming'
              const matches: Match[] = []

              return (
                <motion.div
                  key={tournament.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06, ...spring }}
                  className={`bg-[#111] rounded-2xl border overflow-hidden relative ${
                    isLive ? 'border-red-500/15' : 'border-white/5'
                  }`}
                >
                  {isLive && <CornerRibbon type="live" />}
                  {isUpcoming && <CornerRibbon type="upcoming" />}

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setExpandedId(isExpanded ? null : tournament.id); hapticLight() }}
                    className="w-full text-left p-5"
                  >
                    <div className="flex items-start gap-3.5 mb-3 pr-10">
                      <OrganizerLogo initials={tournament.organizer_logo} />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold leading-snug">{tournament.name}</h3>
                        <p className="text-white/25 text-[11px] mt-0.5 font-medium">{tournament.organizer}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-[10px] text-white/25 font-medium mb-3">
                      <span className="flex items-center gap-1.5">
                        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {tournament.display_date}
                      </span>
                      <span className="w-px h-3 bg-white/10" />
                      <span className="flex items-center gap-1.5 truncate">
                        <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {tournament.venue}
                      </span>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="text-[10px] text-white/20 font-medium">
                          {tournament.registered_teams}/{tournament.max_teams} teams
                        </span>
                        {spotsLeft > 0 && spotsLeft <= 4 && (
                          <span className="text-[10px] text-orange-400 font-semibold">{spotsLeft} spots left!</span>
                        )}
                      </div>
                      <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${capacityPct}%` }}
                          transition={{ duration: 0.6, ease: 'easeOut' }}
                          style={{
                            backgroundColor: capacityPct >= 100 ? '#f97316' : capacityPct >= 75 ? '#eab308' : '#00ff88',
                          }}
                        />
                      </div>
                    </div>
                  </motion.button>

                  {/* Expanded Details — smooth height animation */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={spring}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 space-y-4 border-t border-white/5 pt-4">
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

                          {matches.length > 0 && (
                            <div>
                              <h3 className="text-xs uppercase font-bold tracking-wider text-white/30 mb-3">Matches</h3>
                              <GroupedMatches matches={matches} />
                            </div>
                          )}

                          {isRegistered ? (
                            <motion.button whileTap={{ scale: 0.95 }} className="w-full py-3 bg-[#00ff88]/10 text-[#00ff88] font-bold rounded-xl text-xs uppercase tracking-wider border border-[#00ff88]/20">
                              Registered ✓
                            </motion.button>
                          ) : tournament.status === 'full' ? (
                            <motion.button whileTap={{ scale: 0.95 }} className="w-full py-3 bg-white/5 text-white/20 font-bold rounded-xl text-xs uppercase tracking-wider cursor-not-allowed">
                              Sold Out
                            </motion.button>
                          ) : tournament.status === 'open' ? (
                            <motion.button
                              whileTap={{ scale: 0.95 }}
                              onClick={() => handleRegister(tournament.id)}
                              disabled={isRegistering}
                              className="w-full py-3 bg-[#00ff88] text-black font-bold rounded-xl text-xs uppercase tracking-wider disabled:opacity-50"
                            >
                              {isRegistering ? 'Registering...' : `Register — PKR ${tournament.entry_fee.toLocaleString()}`}
                            </motion.button>
                          ) : tournament.status === 'in_progress' ? (
                            <motion.button whileTap={{ scale: 0.95 }} className="w-full py-3 bg-red-500/10 text-red-400 font-bold rounded-xl text-xs uppercase tracking-wider border border-red-500/20 cursor-default">
                              Tournament In Progress
                            </motion.button>
                          ) : tournament.status === 'completed' ? (
                            <motion.button whileTap={{ scale: 0.95 }} className="w-full py-3 bg-white/5 text-white/30 font-bold rounded-xl text-xs uppercase tracking-wider cursor-default">
                              Tournament Ended
                            </motion.button>
                          ) : (
                            <motion.button whileTap={{ scale: 0.95 }} className="w-full py-3 bg-blue-500/10 text-blue-400 font-bold rounded-xl text-xs uppercase tracking-wider border border-blue-500/20 cursor-default">
                              Registration Opens Soon
                            </motion.button>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              )
            })}
          </motion.div>
        </AnimatePresence>
      </div>
      <BottomNav />
    </div>
  )
}
