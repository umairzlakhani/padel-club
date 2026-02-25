'use client'
import { motion } from 'framer-motion'

type Player = {
  id: string
  full_name: string
  avatar_url?: string | null
  skill_level?: number
}

type Props = {
  maxPlayers: number
  acceptedPlayers: Player[]
  pendingPlayers?: Player[]
  creatorId: string
  currentUserId: string | null
  matchStatus: string
  onRequestJoin?: () => void
  onAccept?: (playerId: string) => void
  onDecline?: (playerId: string) => void
  size?: 'sm' | 'md' | 'lg'
  userRequestStatus?: 'none' | 'pending' | 'accepted'
}

const SIZES = {
  sm: { circle: 'w-10 h-10', font: 'text-xs', name: 'text-[9px]', badge: 'w-3.5 h-3.5 text-[6px]', plus: 'w-4 h-4' },
  md: { circle: 'w-14 h-14', font: 'text-base', name: 'text-[10px]', badge: 'w-4 h-4 text-[7px]', plus: 'w-5 h-5' },
  lg: { circle: 'w-18 h-18', font: 'text-xl', name: 'text-[11px]', badge: 'w-5 h-5 text-[8px]', plus: 'w-6 h-6' },
}

export default function PlayerSlots({
  maxPlayers,
  acceptedPlayers,
  pendingPlayers = [],
  creatorId,
  currentUserId,
  matchStatus,
  onRequestJoin,
  onAccept,
  onDecline,
  size = 'md',
  userRequestStatus = 'none',
}: Props) {
  const s = SIZES[size]
  const isCreator = currentUserId === creatorId

  // Sort accepted: creator first
  const sorted = [...acceptedPlayers].sort((a, b) => {
    if (a.id === creatorId) return -1
    if (b.id === creatorId) return 1
    return 0
  })

  const emptyCount = Math.max(0, maxPlayers - sorted.length - (isCreator ? pendingPlayers.length : 0))
  const canJoin = matchStatus === 'open' && currentUserId && !sorted.find(p => p.id === currentUserId) && userRequestStatus === 'none'

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex justify-center gap-3 flex-wrap">
        {/* Accepted players */}
        {sorted.map((player, i) => (
          <motion.div
            key={player.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: i * 0.08, type: 'spring', stiffness: 300, damping: 25 }}
            className="flex flex-col items-center gap-1"
          >
            <div className="relative">
              <div className={`${s.circle} rounded-full border-2 border-[#00ff88] flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#1a1a2e] to-[#16213e]`}>
                {player.avatar_url ? (
                  <img src={player.avatar_url} alt={player.full_name} className="w-full h-full object-cover" />
                ) : (
                  <span className={`${s.font} font-bold text-white/70`}>{player.full_name?.charAt(0) || '?'}</span>
                )}
              </div>
              {/* Creator star badge */}
              {player.id === creatorId && (
                <div className={`absolute -top-1 -right-1 ${s.badge} bg-[#00ff88] rounded-full flex items-center justify-center`}>
                  <span>★</span>
                </div>
              )}
            </div>
            <span className={`${s.name} text-white/50 font-semibold truncate max-w-[60px] text-center`}>
              {player.full_name?.split(' ')[0]}
            </span>
          </motion.div>
        ))}

        {/* Pending players (visible to creator only) */}
        {isCreator && pendingPlayers.map((player, i) => (
          <motion.div
            key={player.id}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: (sorted.length + i) * 0.08, type: 'spring', stiffness: 300, damping: 25 }}
            className="flex flex-col items-center gap-1"
          >
            <div className={`${s.circle} rounded-full border-2 border-yellow-400 flex items-center justify-center overflow-hidden bg-gradient-to-br from-[#1a1a2e] to-[#16213e] relative`}>
              {player.avatar_url ? (
                <img src={player.avatar_url} alt={player.full_name} className="w-full h-full object-cover opacity-70" />
              ) : (
                <span className={`${s.font} font-bold text-yellow-400/70`}>{player.full_name?.charAt(0) || '?'}</span>
              )}
              <div className="absolute inset-0 bg-yellow-400/10 rounded-full" />
            </div>
            <span className={`${s.name} text-yellow-400/70 font-semibold truncate max-w-[60px] text-center`}>
              {player.full_name?.split(' ')[0]}
            </span>
            {onAccept && onDecline && (
              <div className="flex gap-1 mt-0.5">
                <button
                  onClick={() => onAccept(player.id)}
                  className="px-2 py-0.5 bg-[#00ff88] text-black text-[8px] font-bold rounded-md uppercase"
                >
                  ✓
                </button>
                <button
                  onClick={() => onDecline(player.id)}
                  className="px-2 py-0.5 bg-white/10 text-white/40 text-[8px] font-bold rounded-md uppercase"
                >
                  ✕
                </button>
              </div>
            )}
          </motion.div>
        ))}

        {/* Empty "+" slots */}
        {Array.from({ length: emptyCount }).map((_, i) => (
          <motion.div
            key={`empty-${i}`}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: (sorted.length + (isCreator ? pendingPlayers.length : 0) + i) * 0.08, type: 'spring', stiffness: 300, damping: 25 }}
            className="flex flex-col items-center gap-1"
          >
            {canJoin && i === 0 ? (
              <button
                onClick={onRequestJoin}
                className={`${s.circle} rounded-full border-2 border-dashed border-[#00ff88]/30 flex items-center justify-center hover:border-[#00ff88]/60 hover:bg-[#00ff88]/5 transition-all active:scale-95`}
              >
                <svg className={`${s.plus} text-[#00ff88]/50`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </button>
            ) : userRequestStatus === 'pending' && i === 0 && !isCreator ? (
              <div className={`${s.circle} rounded-full border-2 border-dashed border-yellow-400/30 flex items-center justify-center bg-yellow-400/5`}>
                <span className="text-yellow-400/50 text-[9px] font-bold uppercase">Wait</span>
              </div>
            ) : (
              <div className={`${s.circle} rounded-full border-2 border-dashed border-white/10 flex items-center justify-center`}>
                <svg className={`${s.plus} text-white/15`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
            )}
            <span className={`${s.name} text-white/20 font-semibold`}>
              {canJoin && i === 0 ? 'Join' : userRequestStatus === 'pending' && i === 0 && !isCreator ? 'Pending' : 'Open'}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
