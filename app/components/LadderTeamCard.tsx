'use client'
import { motion } from 'framer-motion'
import Avatar from './Avatar'
import { hapticLight } from '@/lib/haptics'

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
  player1: TeamPlayer
  player2: TeamPlayer
}

type Props = {
  team: LadderTeam
  userTeamRank?: number | null
  userTeamId?: string | null
  userTeamStatus?: string | null
  onChallenge?: (teamId: string) => void
}

const fadeUp = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 30 } },
}

export default function LadderTeamCard({ team, userTeamRank, userTeamId, userTeamStatus, onChallenge }: Props) {
  const isTop3 = team.rank <= 3
  const isUserTeam = team.id === userTeamId
  const losses = team.matches_played - team.matches_won

  // Can challenge if: target is 1-3 ranks above (lower number), both teams active
  const canChallenge =
    userTeamRank != null &&
    userTeamId != null &&
    !isUserTeam &&
    userTeamStatus === 'active' &&
    team.status === 'active' &&
    userTeamRank - team.rank >= 1 &&
    userTeamRank - team.rank <= 3

  return (
    <motion.div
      variants={fadeUp}
      className={`bg-[#111] rounded-2xl border p-4 flex items-center gap-3 ${
        isUserTeam
          ? 'border-[#00ff88]/30 bg-[#00ff88]/[0.03]'
          : 'border-white/5'
      }`}
    >
      {/* Rank */}
      <div className="w-9 shrink-0 text-center">
        <span
          className={`text-xl font-black ${
            isTop3 ? 'text-[#00ff88]' : 'text-white/30'
          }`}
        >
          {team.rank}
        </span>
      </div>

      {/* Overlapping Avatars */}
      <div className="flex -space-x-3 shrink-0">
        <Avatar
          src={team.player1?.avatar_url}
          name={team.player1?.full_name || '?'}
          size="sm"
          highlight={isUserTeam}
        />
        <Avatar
          src={team.player2?.avatar_url}
          name={team.player2?.full_name || '?'}
          size="sm"
          highlight={isUserTeam}
          className="-ml-3"
        />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-white truncate">{team.team_name}</span>
          {team.status !== 'active' && (
            <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${
              team.status === 'challenging'
                ? 'bg-yellow-400/10 text-yellow-400'
                : 'bg-orange-400/10 text-orange-400'
            }`}>
              {team.status === 'challenging' ? 'Challenging' : 'Defending'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5">
          <span className="text-[10px] uppercase font-bold tracking-wider text-white/40">
            {team.points} pts
          </span>
          <span className="text-[10px] uppercase font-bold tracking-wider text-white/40">
            {team.matches_won}W {losses}L
          </span>
        </div>
      </div>

      {/* Challenge Button */}
      {canChallenge && (
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => {
            hapticLight()
            onChallenge?.(team.id)
          }}
          className="shrink-0 px-3 py-1.5 rounded-full bg-[#00ff88]/10 text-[#00ff88] text-[11px] font-bold uppercase tracking-wider cursor-pointer"
        >
          Challenge
        </motion.button>
      )}

      {isUserTeam && !canChallenge && (
        <span className="text-[10px] font-bold uppercase tracking-wider text-[#00ff88]/50 shrink-0">
          You
        </span>
      )}
    </motion.div>
  )
}
