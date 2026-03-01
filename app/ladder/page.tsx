'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { hapticLight, hapticMedium, hapticSuccess, hapticError } from '@/lib/haptics'
import BottomNav from '@/app/components/BottomNav'
import Toast from '@/app/components/Toast'
import LadderTeamCard from '@/app/components/LadderTeamCard'
import ChallengeSheet from '@/app/components/ChallengeSheet'
import KGScoreModal from '@/app/components/KGScoreModal'

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 30 } } }

type TeamPlayer = {
  id: string
  full_name: string
  avatar_url?: string | null
}

type LadderTeam = {
  id: string
  rank: number
  team_name: string
  points: number
  status: 'active' | 'challenging' | 'defending'
  matches_played: number
  matches_won: number
  player1_id: string | null
  player2_id: string | null
  player1: TeamPlayer
  player2: TeamPlayer
}

type HistoryEntry = {
  id: string
  result: string
  old_challenger_rank: number
  old_defender_rank: number
  new_challenger_rank: number
  new_defender_rank: number
  scores: { team_a: number; team_b: number }[]
  created_at: string
  challenger_team: { id: string; team_name: string }
  defender_team: { id: string; team_name: string }
}

type ActiveChallenge = {
  id: string
  status: string
  result: string | null
  challenger_team_id: string
  defender_team_id: string
  challenger_rank: number
  defender_rank: number
  scheduled_date: string | null
  scheduled_time: string | null
  venue: string | null
  scores: { team_a: number; team_b: number }[] | null
  challenger_team: { id: string; team_name: string }
  defender_team: { id: string; team_name: string }
}

export default function LadderPage() {
  const router = useRouter()
  const [userId, setUserId] = useState<string | null>(null)
  const [teams, setTeams] = useState<LadderTeam[]>([])
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [userTeam, setUserTeam] = useState<LadderTeam | null>(null)
  const [activeChallenge, setActiveChallenge] = useState<ActiveChallenge | null>(null)
  const [activeTab, setActiveTab] = useState<'rankings' | 'history'>('rankings')
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })

  // Challenge sheet
  const [challengeSheetOpen, setChallengeSheetOpen] = useState(false)
  const [selectedDefender, setSelectedDefender] = useState<LadderTeam | null>(null)

  // Score modal
  const [scoreModalOpen, setScoreModalOpen] = useState(false)

  // Pull to refresh
  const [pullDistance, setPullDistance] = useState(0)
  const [pullRefreshing, setPullRefreshing] = useState(false)
  const touchStartY = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const loadData = useCallback(async (uid: string) => {
    // Load teams with player info
    const { data: teamsData } = await supabase
      .from('ladder_teams')
      .select('*')
      .order('rank', { ascending: true })

    if (teamsData) {
      // Fetch player details for teams that have linked app accounts
      const playerIds = teamsData
        .flatMap((t: { player1_id: string | null; player2_id: string | null }) => [t.player1_id, t.player2_id])
        .filter(Boolean)

      let playerMap = new Map<string, TeamPlayer>()
      if (playerIds.length > 0) {
        const { data: players } = await supabase
          .from('applications')
          .select('id, full_name, avatar_url')
          .in('id', playerIds)
        playerMap = new Map((players || []).map((p: TeamPlayer) => [p.id, p]))
      }

      const enriched: LadderTeam[] = teamsData.map((t: LadderTeam & { player1_name?: string; player2_name?: string }) => ({
        ...t,
        player1: t.player1_id ? (playerMap.get(t.player1_id) || { id: t.player1_id, full_name: t.player1_name || 'Unknown' }) : { id: '', full_name: t.player1_name || 'Unknown' },
        player2: t.player2_id ? (playerMap.get(t.player2_id) || { id: t.player2_id, full_name: t.player2_name || 'Unknown' }) : { id: '', full_name: t.player2_name || 'Unknown' },
      }))

      setTeams(enriched)

      const myTeam = enriched.find(
        (t) => t.player1_id === uid || t.player2_id === uid
      )
      setUserTeam(myTeam || null)

      // Load active challenge for user's team
      if (myTeam) {
        const { data: challenges } = await supabase
          .from('ladder_challenges')
          .select('*, challenger_team:challenger_team_id(id, team_name), defender_team:defender_team_id(id, team_name)')
          .or(`challenger_team_id.eq.${myTeam.id},defender_team_id.eq.${myTeam.id}`)
          .in('status', ['accepted', 'pending_verification'])
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle()

        setActiveChallenge(challenges || null)
      }
    }

    // Load history
    const { data: histData } = await supabase
      .from('ladder_history')
      .select('*, challenger_team:challenger_team_id(id, team_name), defender_team:defender_team_id(id, team_name)')
      .order('created_at', { ascending: false })
      .limit(20)

    setHistory((histData as HistoryEntry[]) || [])
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUserId(user.id)
      await loadData(user.id)
      setLoading(false)
    }
    init()
  }, [router, loadData])

  // Pull to refresh
  function handleTouchStart(e: React.TouchEvent) {
    if (scrollRef.current && scrollRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY
    }
  }
  function handleTouchMove(e: React.TouchEvent) {
    if (!scrollRef.current || scrollRef.current.scrollTop > 0 || pullRefreshing) return
    const delta = e.touches[0].clientY - touchStartY.current
    if (delta > 0) setPullDistance(Math.min(delta * 0.4, 80))
  }
  async function handleTouchEnd() {
    if (pullDistance > 60 && userId) {
      setPullRefreshing(true)
      hapticMedium()
      await loadData(userId)
      setPullRefreshing(false)
    }
    setPullDistance(0)
  }

  function handleChallenge(teamId: string) {
    const defender = teams.find((t) => t.id === teamId)
    if (!defender) return
    setSelectedDefender(defender)
    setChallengeSheetOpen(true)
  }

  async function submitChallenge(data: { defender_team_id: string; scheduled_date: string; scheduled_time: string; venue: string }) {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/ladder/create-challenge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify(data),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error)
    setToast({ visible: true, message: 'Challenge issued — match must be completed within 10 days', type: 'success' })
    if (userId) await loadData(userId)
  }

  async function rescindChallenge() {
    if (!activeChallenge) return
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/ladder/respond-challenge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ challenge_id: activeChallenge.id, action: 'rescind' }),
    })
    const json = await res.json()
    if (!res.ok) {
      setToast({ visible: true, message: json.error, type: 'error' })
      hapticError()
      return
    }
    hapticSuccess()
    setToast({ visible: true, message: 'Challenge rescinded (-1 rank penalty)', type: 'error' })
    if (userId) await loadData(userId)
  }

  async function forfeitChallenge() {
    if (!activeChallenge) return
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/ladder/respond-challenge', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ challenge_id: activeChallenge.id, action: 'forfeit' }),
    })
    const json = await res.json()
    if (!res.ok) {
      setToast({ visible: true, message: json.error, type: 'error' })
      hapticError()
      return
    }
    hapticSuccess()
    setToast({ visible: true, message: 'Match forfeited', type: 'error' })
    if (userId) await loadData(userId)
  }

  async function submitScore(scores: { team_a: number; team_b: number }[]) {
    if (!activeChallenge) return
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/ladder/submit-kg-score', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ challenge_id: activeChallenge.id, scores }),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error)
    setToast({ visible: true, message: 'Score submitted — awaiting verification', type: 'success' })
    if (userId) await loadData(userId)
  }

  async function verifyScore(action: 'confirm' | 'dispute') {
    if (!activeChallenge) return
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/ladder/verify-kg-score', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify({ challenge_id: activeChallenge.id, action }),
    })
    const json = await res.json()
    if (!res.ok) {
      setToast({ visible: true, message: json.error, type: 'error' })
      hapticError()
      return
    }
    hapticSuccess()
    setToast({
      visible: true,
      message: action === 'confirm' ? 'Score verified — ranks updated!' : 'Score disputed',
      type: action === 'confirm' ? 'success' : 'error',
    })
    if (userId) await loadData(userId)
  }

  // Skeleton
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex justify-center">
        <div className="w-full max-w-[480px] relative" style={{ minHeight: '100dvh' }}>
          <div className="pt-[max(1rem,env(safe-area-inset-top))] px-6 pb-4">
            <div className="h-8 w-32 bg-white/5 rounded-lg animate-pulse mt-2 mb-6" />
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />
              ))}
            </div>
          </div>
          <BottomNav />
        </div>
      </div>
    )
  }

  const isDefender = activeChallenge && userTeam && activeChallenge.defender_team_id === userTeam.id
  const isChallenger = activeChallenge && userTeam && activeChallenge.challenger_team_id === userTeam.id

  return (
    <div
      ref={scrollRef}
      className="min-h-screen bg-[#0a0a0a] text-white font-sans flex justify-center overflow-y-auto overscroll-y-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <div className="w-full max-w-[480px] relative" style={{ minHeight: '100dvh' }}>
        {/* Pull to refresh */}
        {(pullDistance > 0 || pullRefreshing) && (
          <div className="flex justify-center items-center" style={{ height: pullRefreshing ? 48 : pullDistance }}>
            <motion.div
              animate={pullRefreshing ? { rotate: 360 } : { rotate: pullDistance > 60 ? 180 : 0 }}
              transition={pullRefreshing ? { duration: 0.8, repeat: Infinity, ease: 'linear' } : { duration: 0.2 }}
              className="w-6 h-6"
            >
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="#00ff88" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </motion.div>
          </div>
        )}

        {/* Header */}
        <div className="pt-[max(1rem,env(safe-area-inset-top))] px-6 pb-2">
          <div className="flex items-center gap-3 mb-4">
            <button onClick={() => router.push('/dashboard')} className="cursor-pointer text-white/40 hover:text-white transition-colors">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold">KG Ladder</h1>
          </div>
        </div>

        {/* Active Challenge Banner */}
        {activeChallenge && userTeam && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mx-6 mb-4 p-4 rounded-2xl border border-[#00ff88]/20 bg-[#00ff88]/[0.05]"
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-[#00ff88] animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#00ff88]">
                {activeChallenge.status === 'accepted' && 'Active Challenge'}
                {activeChallenge.status === 'pending_verification' && 'Awaiting Verification'}
              </span>
            </div>
            <p className="text-sm text-white/70 mb-3">
              {activeChallenge.challenger_team?.team_name} vs {activeChallenge.defender_team?.team_name}
              {activeChallenge.scheduled_date && (
                <span className="text-white/40"> — {activeChallenge.scheduled_date}{activeChallenge.scheduled_time ? ` at ${activeChallenge.scheduled_time}` : ''}</span>
              )}
            </p>

            {/* Accepted: submit score, rescind, or forfeit */}
            {activeChallenge.status === 'accepted' && (
              <div className="space-y-2">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setScoreModalOpen(true)}
                  className="w-full py-2 rounded-full bg-[#00ff88] text-black text-xs font-bold cursor-pointer"
                >
                  Submit Score
                </motion.button>
                <div className="flex gap-2">
                  {isChallenger && (
                    <motion.button whileTap={{ scale: 0.95 }} onClick={rescindChallenge} className="flex-1 py-2 rounded-full border border-white/10 text-white/40 text-[10px] font-bold cursor-pointer">
                      Rescind (-1 rank)
                    </motion.button>
                  )}
                  <motion.button whileTap={{ scale: 0.95 }} onClick={forfeitChallenge} className="flex-1 py-2 rounded-full border border-red-500/20 text-red-400 text-[10px] font-bold cursor-pointer">
                    Forfeit Match
                  </motion.button>
                </div>
              </div>
            )}

            {/* Pending verification: show scores and verify buttons */}
            {activeChallenge.status === 'pending_verification' && (
              <div>
                {activeChallenge.scores && (
                  <div className="flex gap-2 mb-3">
                    {activeChallenge.scores.map((s, i) => (
                      <span key={i} className="text-xs text-white/60 bg-white/5 px-2 py-1 rounded-lg">
                        {s.team_a}-{s.team_b}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => verifyScore('confirm')} className="flex-1 py-2 rounded-full bg-[#00ff88] text-black text-xs font-bold cursor-pointer">
                    Confirm
                  </motion.button>
                  <motion.button whileTap={{ scale: 0.95 }} onClick={() => verifyScore('dispute')} className="flex-1 py-2 rounded-full border border-red-500/30 text-red-400 text-xs font-bold cursor-pointer">
                    Dispute
                  </motion.button>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Tab Bar */}
        <div className="px-6 mb-4">
          <div className="flex bg-white/5 rounded-xl p-1 gap-1">
            {(['rankings', 'history'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => { hapticLight(); setActiveTab(tab) }}
                className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors relative cursor-pointer ${
                  activeTab === tab ? 'text-black' : 'text-white/40'
                }`}
              >
                {activeTab === tab && (
                  <motion.div
                    layoutId="ladderTab"
                    className="absolute inset-0 bg-[#00ff88] rounded-lg"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative z-10">
                  {tab === 'rankings' ? 'Rankings' : 'History'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'rankings' && (
            <motion.div
              key="rankings"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="px-6 pb-28"
            >
              {/* No team CTA */}
              {!userTeam && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mb-5 p-5 rounded-2xl border border-dashed border-[#00ff88]/30 bg-[#00ff88]/[0.03] text-center"
                >
                  <p className="text-sm text-white/70 mb-3">You&apos;re not on the ladder yet</p>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => { hapticLight(); router.push('/ladder/register') }}
                    className="px-6 py-2.5 rounded-full bg-[#00ff88] text-black text-sm font-bold cursor-pointer"
                  >
                    Register Your Team
                  </motion.button>
                </motion.div>
              )}

              {/* Team List */}
              <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">
                {teams.map((team) => (
                  <LadderTeamCard
                    key={team.id}
                    team={team}
                    userTeamRank={userTeam?.rank ?? null}
                    userTeamId={userTeam?.id ?? null}
                    userTeamStatus={userTeam?.status ?? null}
                    onChallenge={handleChallenge}
                  />
                ))}
              </motion.div>

              {teams.length === 0 && (
                <p className="text-center text-white/30 text-sm mt-10">No teams registered yet. Be the first!</p>
              )}
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div
              key="history"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="px-6 pb-28"
            >
              <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-3">
                {history.map((entry) => {
                  const challengerWon = entry.result === 'challenger_won'
                  const winner = challengerWon ? entry.challenger_team?.team_name : entry.defender_team?.team_name
                  const loser = challengerWon ? entry.defender_team?.team_name : entry.challenger_team?.team_name
                  const newWinnerRank = challengerWon ? entry.new_challenger_rank : entry.new_defender_rank

                  return (
                    <motion.div
                      key={entry.id}
                      variants={fadeUp}
                      className="bg-[#111] rounded-2xl border border-white/5 p-4"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[#00ff88] text-sm">&#8593;</span>
                        <span className="text-sm font-semibold text-white">{winner}</span>
                        <span className="text-xs text-white/30">took Rank {newWinnerRank} from</span>
                        <span className="text-sm text-white/60">{loser}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {entry.scores?.map((s, i) => (
                          <span key={i} className="text-[11px] text-white/40 bg-white/5 px-1.5 py-0.5 rounded">
                            {s.team_a}-{s.team_b}
                          </span>
                        ))}
                        <span className="text-[10px] text-white/20 ml-auto">
                          {new Date(entry.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </motion.div>
                  )
                })}
              </motion.div>

              {history.length === 0 && (
                <p className="text-center text-white/30 text-sm mt-10">No ladder history yet</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <BottomNav />
      </div>

      {/* Challenge Sheet */}
      <ChallengeSheet
        isOpen={challengeSheetOpen}
        onClose={() => setChallengeSheetOpen(false)}
        defenderTeam={selectedDefender}
        onSubmit={submitChallenge}
      />

      {/* Score Modal */}
      <KGScoreModal
        isOpen={scoreModalOpen}
        onClose={() => setScoreModalOpen(false)}
        challengerName={activeChallenge?.challenger_team?.team_name || 'Challenger'}
        defenderName={activeChallenge?.defender_team?.team_name || 'Defender'}
        onSubmit={submitScore}
      />

      {/* Toast */}
      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onClose={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </div>
  )
}
