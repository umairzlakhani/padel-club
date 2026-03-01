'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics'

type SetScore = { team_a: number; team_b: number }

type Props = {
  isOpen: boolean
  onClose: () => void
  challengerName: string
  defenderName: string
  onSubmit: (scores: SetScore[]) => Promise<void>
}

export default function KGScoreModal({ isOpen, onClose, challengerName, defenderName, onSubmit }: Props) {
  const [set1a, setSet1a] = useState('')
  const [set1b, setSet1b] = useState('')
  const [set2a, setSet2a] = useState('')
  const [set2b, setSet2b] = useState('')
  const [set3a, setSet3a] = useState('')
  const [set3b, setSet3b] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Determine if sets are split 1-1 to show 3rd set
  const set1Done = set1a !== '' && set1b !== ''
  const set2Done = set2a !== '' && set2b !== ''
  const needsSet3 =
    set1Done && set2Done &&
    ((Number(set1a) > Number(set1b) && Number(set2b) > Number(set2a)) ||
     (Number(set1b) > Number(set1a) && Number(set2a) > Number(set2b)))

  const close = useCallback(() => {
    onClose()
    setSet1a(''); setSet1b('')
    setSet2a(''); setSet2b('')
    setSet3a(''); setSet3b('')
    setError('')
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
    setError('')
    hapticLight()

    const scores: SetScore[] = [
      { team_a: Number(set1a), team_b: Number(set1b) },
      { team_a: Number(set2a), team_b: Number(set2b) },
    ]

    if (needsSet3) {
      if (set3a === '' || set3b === '') {
        setError('Super tiebreak score is required')
        hapticError()
        return
      }
      scores.push({ team_a: Number(set3a), team_b: Number(set3b) })
    }

    setIsSubmitting(true)
    try {
      await onSubmit(scores)
      hapticSuccess()
      close()
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit score'
      setError(message)
      hapticError()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
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

            <h2 className="text-lg font-bold text-white mb-1">Submit Score</h2>
            <p className="text-xs text-white/40 mb-5">KG Rules: First to 6 (margin of 2). Tiebreak at 5-5 (first to 5, win by 2). Golden deuce on second deuce.</p>

            {/* Team Labels */}
            <div className="flex items-center gap-3 mb-4 px-1">
              <div className="w-[72px]" />
              <span className="flex-1 text-[10px] font-bold uppercase tracking-wider text-[#00ff88]/60 text-center truncate">{challengerName}</span>
              <span className="flex-1 text-[10px] font-bold uppercase tracking-wider text-white/40 text-center truncate">{defenderName}</span>
            </div>

            {/* Set 1 */}
            <SetRow
              label="Set 1"
              valueA={set1a}
              valueB={set1b}
              onChangeA={setSet1a}
              onChangeB={setSet1b}
              max={6}
              hint="Max 6"
            />

            {/* Set 2 */}
            <SetRow
              label="Set 2"
              valueA={set2a}
              valueB={set2b}
              onChangeA={setSet2a}
              onChangeB={setSet2b}
              max={6}
              hint="Max 6"
            />

            {/* Set 3 (Super Tiebreak) */}
            {needsSet3 && (
              <SetRow
                label="TB"
                valueA={set3a}
                valueB={set3b}
                onChangeA={setSet3a}
                onChangeB={setSet3b}
                max={99}
                hint="TB to 5, 7, or 10 (win by 2)"
              />
            )}

            {/* Info */}
            <p className="text-[10px] text-white/30 mt-3 mb-4">
              Sets 1 & 2: First to 6, margin of 2. Tiebreak at 5-5 (first to 5, win by 2). Set 3: Tiebreak to 5, 7, or 10 — teams decide before starting. Win by 2.
            </p>

            {/* Error */}
            {error && (
              <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            {/* CTA */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSubmit}
              disabled={isSubmitting || !set1Done || !set2Done}
              className="w-full py-3.5 rounded-full bg-[#00ff88] text-black text-sm font-bold cursor-pointer transition-opacity disabled:opacity-50"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Score'}
            </motion.button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function SetRow({
  label,
  valueA,
  valueB,
  onChangeA,
  onChangeB,
  max,
  hint,
}: {
  label: string
  valueA: string
  valueB: string
  onChangeA: (v: string) => void
  onChangeB: (v: string) => void
  max: number
  hint: string
}) {
  function handleChange(setter: (v: string) => void, maxVal: number) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value.replace(/\D/g, '')
      if (val === '') { setter(''); return }
      const num = Math.min(Number(val), maxVal)
      setter(String(num))
    }
  }

  return (
    <div className="flex items-center gap-3 mb-3 px-1">
      <span className="w-[72px] text-[11px] font-bold uppercase tracking-wider text-white/40">
        {label}
        <span className="block text-[9px] text-white/20 font-normal normal-case tracking-normal">{hint}</span>
      </span>
      <input
        type="text"
        inputMode="numeric"
        value={valueA}
        onChange={handleChange(onChangeA, max)}
        placeholder="0"
        className="flex-1 text-center rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-[#00ff88]/40"
      />
      <span className="text-white/20 text-xs font-bold">vs</span>
      <input
        type="text"
        inputMode="numeric"
        value={valueB}
        onChange={handleChange(onChangeB, max)}
        placeholder="0"
        className="flex-1 text-center rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-2.5 text-sm text-white placeholder-white/20 outline-none focus:border-[#00ff88]/40"
      />
    </div>
  )
}
