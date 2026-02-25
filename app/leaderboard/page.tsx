'use client'
import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/app/components/BottomNav'
import Avatar from '@/app/components/Avatar'
import Link from 'next/link'

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 30 } } }
const scaleIn = { hidden: { opacity: 0, scale: 0.7 }, show: { opacity: 1, scale: 1, transition: { type: 'spring' as const, stiffness: 300, damping: 20 } } }

type Player = {
  id: string
  full_name: string
  skill_level: number
  matches_played: number
  matches_won: number
  win_rate: number
  avatar_url: string | null
}

export default function LeaderboardPage() {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<'skill' | 'wins'>('skill')
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setCurrentUserId(user.id)

      const { data, error } = await supabase
        .from('applications')
        .select('id, full_name, skill_level, matches_played, matches_won, avatar_url')
        .eq('status', 'member')

      if (!error && data) {
        const mapped: Player[] = data.map((p: any) => {
          const played = p.matches_played || 0
          const won = p.matches_won || 0
          return {
            id: p.id,
            full_name: p.full_name || 'Unknown',
            skill_level: parseFloat(p.skill_level) || 1.0,
            matches_played: played,
            matches_won: won,
            win_rate: played > 0 ? Math.round((won / played) * 100) : 0,
            avatar_url: p.avatar_url || null,
          }
        })
        setPlayers(mapped)
      }
      setLoading(false)
    }
    load()
  }, [])

  const sorted = [...players].sort((a, b) => {
    if (sortBy === 'skill') {
      if (b.skill_level !== a.skill_level) return b.skill_level - a.skill_level
      return b.matches_won - a.matches_won
    }
    if (b.matches_won !== a.matches_won) return b.matches_won - a.matches_won
    return b.skill_level - a.skill_level
  })

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
          <span className="text-white/40 text-sm font-medium">Loading leaderboard...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex justify-center overflow-y-auto">
      <div className="w-full max-w-[480px] min-h-screen relative pb-24 page-transition">
        {/* Header */}
        <div className="pt-12 pb-4 px-6">
          <h1 className="text-2xl font-bold tracking-tight mb-1">Leaderboard</h1>
          <p className="text-white/30 text-sm">{players.length} members ranked</p>
        </div>

        {/* Sort Toggle */}
        <div className="px-6 mb-4">
          <div className="flex bg-white/5 rounded-lg p-0.5">
            <button
              onClick={() => setSortBy('skill')}
              className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all ${
                sortBy === 'skill' ? 'bg-[#00ff88] text-black' : 'text-white/40'
              }`}
            >
              By Skill Level
            </button>
            <button
              onClick={() => setSortBy('wins')}
              className={`flex-1 py-2 text-[11px] font-bold uppercase tracking-wider rounded-md transition-all ${
                sortBy === 'wins' ? 'bg-[#00ff88] text-black' : 'text-white/40'
              }`}
            >
              By Wins
            </button>
          </div>
        </div>

        {/* Top 3 Podium */}
        {sorted.length >= 3 && (
          <motion.div variants={stagger} initial="hidden" animate="show" className="px-6 mb-5">
            <div className="flex items-end justify-center gap-3">
              {/* 2nd Place */}
              <motion.div variants={scaleIn} className="flex-1">
              <Link href={`/profile/${sorted[1].id}`} className="flex flex-col items-center group">
                <Avatar
                  src={sorted[1].avatar_url}
                  name={sorted[1].full_name}
                  size="md"
                  className="border-2 border-white/10 mb-2 group-hover:border-white/30 transition-all"
                />
                <div className="bg-white/5 rounded-xl w-full pt-6 pb-3 text-center border border-white/5 group-hover:border-white/10 transition-all">
                  <span className="text-white/30 text-[10px] font-bold block">2ND</span>
                  <span className="text-xs font-bold block mt-1 truncate px-2">{sorted[1].full_name}</span>
                  <span className="text-[10px] text-white/30 font-medium block mt-0.5">
                    {sortBy === 'skill' ? sorted[1].skill_level.toFixed(1) : `${sorted[1].matches_won}W`}
                  </span>
                </div>
              </Link>
              </motion.div>

              {/* 1st Place */}
              <motion.div variants={scaleIn} className="flex-1">
              <Link href={`/profile/${sorted[0].id}`} className="flex flex-col items-center group">
                <Avatar
                  src={sorted[0].avatar_url}
                  name={sorted[0].full_name}
                  size="lg"
                  highlight
                  className="border-2 border-[#00ff88]/40 mb-2 shadow-lg shadow-[#00ff88]/10 group-hover:border-[#00ff88]/60 transition-all"
                />
                <div className="bg-[#00ff88]/5 rounded-xl w-full pt-8 pb-3 text-center border border-[#00ff88]/20 group-hover:border-[#00ff88]/40 transition-all">
                  <span className="text-[#00ff88] text-[10px] font-bold block">1ST</span>
                  <span className="text-sm font-bold block mt-1 truncate px-2">{sorted[0].full_name}</span>
                  <span className="text-[10px] text-[#00ff88]/60 font-semibold block mt-0.5">
                    {sortBy === 'skill' ? sorted[0].skill_level.toFixed(1) : `${sorted[0].matches_won}W`}
                  </span>
                </div>
              </Link>
              </motion.div>

              {/* 3rd Place */}
              <motion.div variants={scaleIn} className="flex-1">
              <Link href={`/profile/${sorted[2].id}`} className="flex flex-col items-center group">
                <Avatar
                  src={sorted[2].avatar_url}
                  name={sorted[2].full_name}
                  size="md"
                  className="border-2 border-white/10 mb-2 group-hover:border-white/30 transition-all"
                />
                <div className="bg-white/5 rounded-xl w-full pt-6 pb-3 text-center border border-white/5 group-hover:border-white/10 transition-all">
                  <span className="text-white/30 text-[10px] font-bold block">3RD</span>
                  <span className="text-xs font-bold block mt-1 truncate px-2">{sorted[2].full_name}</span>
                  <span className="text-[10px] text-white/30 font-medium block mt-0.5">
                    {sortBy === 'skill' ? sorted[2].skill_level.toFixed(1) : `${sorted[2].matches_won}W`}
                  </span>
                </div>
              </Link>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Full Rankings List */}
        <div className="px-6">
          <h3 className="text-xs uppercase font-bold tracking-wider text-white/30 mb-3">Full Rankings</h3>
          <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-2">
            {sorted.map((player, index) => {
              const isCurrentUser = player.id === currentUserId
              return (
                <motion.div key={player.id} variants={fadeUp}>
                <Link
                  href={`/profile/${player.id}`}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all block ${
                    isCurrentUser
                      ? 'bg-[#00ff88]/5 border-[#00ff88]/20 hover:border-[#00ff88]/40'
                      : 'bg-[#111] border-white/5 hover:border-white/10'
                  }`}
                >
                  {/* Rank */}
                  <div className={`w-8 text-center shrink-0 ${
                    index === 0 ? 'text-[#00ff88] font-bold' : 'text-white/20 font-semibold'
                  } text-sm`}>
                    {index + 1}
                  </div>

                  {/* Avatar */}
                  <Avatar
                    src={player.avatar_url}
                    name={player.full_name}
                    size="sm"
                    highlight={isCurrentUser}
                  />

                  {/* Name + Stats */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold truncate ${isCurrentUser ? 'text-[#00ff88]' : ''}`}>
                        {player.full_name}
                      </span>
                      {isCurrentUser && (
                        <span className="text-[8px] font-bold text-[#00ff88] bg-[#00ff88]/10 px-1.5 py-0.5 rounded uppercase">You</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] text-white/20 font-medium">{player.matches_played} played</span>
                      <span className="text-[10px] text-white/20 font-medium">{player.matches_won}W</span>
                      <span className="text-[10px] text-white/20 font-medium">{player.win_rate}% WR</span>
                    </div>
                  </div>

                  {/* Skill Badge */}
                  <div className={`px-2.5 py-1 rounded-lg shrink-0 ${
                    index === 0
                      ? 'bg-[#00ff88]/10 border border-[#00ff88]/20'
                      : 'bg-white/5'
                  }`}>
                    <span className={`text-xs font-bold ${index === 0 ? 'text-[#00ff88]' : 'text-white/50'}`}>
                      {player.skill_level.toFixed(1)}
                    </span>
                  </div>

                  {/* Chevron */}
                  <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.15)" strokeWidth="2" className="shrink-0">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
                </motion.div>
              )
            })}

            {sorted.length === 0 && (
              <div className="text-center py-16">
                <p className="text-white/20 text-sm">No ranked players yet</p>
                <p className="text-white/10 text-xs mt-1">Members will appear here once approved</p>
              </div>
            )}
          </motion.div>
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
