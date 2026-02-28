'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { hapticLight, hapticSuccess } from '@/lib/haptics'
import Avatar from './Avatar'

type TeamPlayer = {
  id: string
  full_name: string
  avatar_url?: string | null
}

type DefenderTeam = {
  id: string
  rank: number
  team_name: string
  player1: TeamPlayer
  player2: TeamPlayer
}

type Props = {
  isOpen: boolean
  onClose: () => void
  defenderTeam: DefenderTeam | null
  onSubmit: (data: { defender_team_id: string; scheduled_date: string; scheduled_time: string; venue: string }) => Promise<void>
}

export default function ChallengeSheet({ isOpen, onClose, defenderTeam, onSubmit }: Props) {
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [venue, setVenue] = useState('Karachi Gymkhana')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const close = useCallback(() => {
    onClose()
    setDate('')
    setTime('')
    setVenue('Karachi Gymkhana')
  }, [onClose])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    if (isOpen) {
      document.addEventListener('keydown', onKey)
      document.body.style.overflow = 'hidden'
    }
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, close])

  async function handleSubmit() {
    if (!defenderTeam) return
    setIsSubmitting(true)
    hapticLight()
    try {
      await onSubmit({
        defender_team_id: defenderTeam.id,
        scheduled_date: date,
        scheduled_time: time,
        venue,
      })
      hapticSuccess()
      close()
    } catch {
      // Error handled by parent
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && defenderTeam && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm"
            onClick={close}
          />

          {/* Sheet */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[480px] z-50 bg-[#111] rounded-t-3xl border-t border-white/10 p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]"
          >
            {/* Handle */}
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-5" />

            {/* Defender Team Info */}
            <div className="flex items-center gap-3 mb-6">
              <div className="flex -space-x-3">
                <Avatar src={defenderTeam.player1?.avatar_url} name={defenderTeam.player1?.full_name || '?'} size="md" />
                <Avatar src={defenderTeam.player2?.avatar_url} name={defenderTeam.player2?.full_name || '?'} size="md" className="-ml-3" />
              </div>
              <div>
                <p className="text-white font-semibold">{defenderTeam.team_name}</p>
                <p className="text-white/40 text-xs">Rank #{defenderTeam.rank}</p>
              </div>
            </div>

            {/* Fields */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-[#00ff88]/40 [color-scheme:dark]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Time
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm text-white outline-none transition-colors focus:border-[#00ff88]/40 [color-scheme:dark]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-white/40">
                  Venue
                </label>
                <input
                  type="text"
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  placeholder="Karachi Gymkhana"
                  className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-4 py-3 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-[#00ff88]/40"
                />
              </div>
            </div>

            {/* CTA */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-full bg-[#00ff88] text-black text-sm font-bold cursor-pointer transition-opacity disabled:opacity-50"
            >
              {isSubmitting ? 'Sending...' : 'Send Challenge'}
            </motion.button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
