'use client'
import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { hapticLight, hapticMedium, hapticHeavy } from '@/lib/haptics'

// ─── Types ───
type Answers = {
  sportsHistory: 'never' | 'yes' | null
  walls: 'avoid' | 'slow' | 'attack' | null
  net: 'no' | 'slow_speeds' | 'aggressive' | null
  techniques: ('bandeja' | 'smash' | 'vibora')[]
  selfAssessment: 'initiation' | 'intermediate' | 'competition' | null
}

// ─── Scoring ───
function calculateSkillLevel(answers: Answers): number {
  let score = 0
  score += answers.sportsHistory === 'never' ? 1.0 : 1.5
  const wallScores = { avoid: 0, slow: 0.5, attack: 1.2 }
  score += wallScores[answers.walls!]
  const netScores = { no: 0, slow_speeds: 0.5, aggressive: 1.0 }
  score += netScores[answers.net!]
  const techScores: Record<string, number> = { bandeja: 0.4, smash: 0.3, vibora: 0.5 }
  for (const tech of answers.techniques) score += techScores[tech]
  const selfScores = { initiation: -0.2, intermediate: 0.5, competition: 1.0 }
  score += selfScores[answers.selfAssessment!]
  return Math.round(Math.min(7.0, Math.max(1.0, score)) * 10) / 10
}

function getLevelLabel(score: number): string {
  if (score < 2.0) return 'Initiation'
  if (score < 3.0) return 'Beginner'
  if (score < 4.0) return 'Intermediate'
  if (score < 5.0) return 'Advanced'
  return 'Competition'
}

// ─── Step Indicator ───
function StepIndicator({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 px-6 py-4">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
          {i <= current && (
            <motion.div
              className="h-full rounded-full bg-[#00ff88]"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30, delay: i === current ? 0.1 : 0 }}
              style={{ transformOrigin: 'left' }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Option Card ───
function OptionCard({
  label,
  description,
  selected,
  onSelect,
}: {
  label: string
  description?: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={() => {
        hapticLight()
        onSelect()
      }}
      className={`w-full p-5 rounded-2xl border backdrop-blur-md transition-all text-left ${
        selected
          ? 'bg-[#00ff88]/10 border-[#00ff88]/30 shadow-[0_0_20px_rgba(0,255,136,0.1)]'
          : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <h4 className="text-sm font-bold text-white">{label}</h4>
          {description && <p className="text-white/30 text-xs mt-0.5">{description}</p>}
        </div>
        {selected && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
            className="w-6 h-6 rounded-full bg-[#00ff88] flex items-center justify-center shrink-0"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </motion.div>
        )}
      </div>
    </motion.button>
  )
}

// ─── Toggle Card (multi-select) ───
function ToggleCard({
  label,
  description,
  selected,
  onToggle,
}: {
  label: string
  description?: string
  selected: boolean
  onToggle: () => void
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={() => {
        hapticLight()
        onToggle()
      }}
      className={`w-full p-5 rounded-2xl border backdrop-blur-md transition-all text-left ${
        selected
          ? 'bg-[#00ff88]/10 border-[#00ff88]/30 shadow-[0_0_20px_rgba(0,255,136,0.1)]'
          : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.06]'
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex-1">
          <h4 className="text-sm font-bold text-white">{label}</h4>
          {description && <p className="text-white/30 text-xs mt-0.5">{description}</p>}
        </div>
        <div
          className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${
            selected ? 'bg-[#00ff88] border-[#00ff88]' : 'border-white/20'
          }`}
        >
          {selected && (
            <motion.svg
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="black" strokeWidth="3"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </motion.svg>
          )}
        </div>
      </div>
    </motion.button>
  )
}

// ─── Main Page ───
export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState(0)
  const [answers, setAnswers] = useState<Answers>({
    sportsHistory: null,
    walls: null,
    net: null,
    techniques: [],
    selfAssessment: null,
  })
  const [calculatedScore, setCalculatedScore] = useState<number | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [animatedScore, setAnimatedScore] = useState(1.0)

  // Auth guard + already-completed guard
  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      const { data } = await supabase
        .from('applications')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single()
      if (data?.onboarding_completed) {
        router.replace('/dashboard')
        return
      }
      setLoading(false)
    }
    check()
  }, [router])

  // Animate score counter
  useEffect(() => {
    if (calculatedScore === null) return
    const start = 1.0
    const end = calculatedScore
    const duration = 1200
    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      const val = start + (end - start) * eased
      setAnimatedScore(Math.round(val * 10) / 10)
      if (progress >= 1) clearInterval(interval)
    }, 30)
    return () => clearInterval(interval)
  }, [calculatedScore])

  const canProceed = useCallback(() => {
    switch (currentStep) {
      case 0: return answers.sportsHistory !== null
      case 1: return answers.walls !== null
      case 2: return answers.net !== null
      case 3: return true // techniques can be empty
      case 4: return answers.selfAssessment !== null
      default: return false
    }
  }, [currentStep, answers])

  function handleNext() {
    if (!canProceed()) return
    hapticMedium()
    if (currentStep < 4) {
      setCurrentStep((s) => s + 1)
    } else {
      // Calculate score and show reveal
      const score = calculateSkillLevel(answers)
      setCalculatedScore(score)
      setCurrentStep(5)
      hapticHeavy()
    }
  }

  function handleBack() {
    if (currentStep > 0 && currentStep <= 4) {
      hapticLight()
      setCurrentStep((s) => s - 1)
    }
  }

  async function handleSubmit() {
    if (calculatedScore === null) return
    setSubmitting(true)
    setError(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.access_token) {
        setError('Session expired. Please sign in again.')
        setSubmitting(false)
        return
      }
      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ skill_level: calculatedScore }),
      })
      const result = await res.json()
      if (!res.ok || result.error) {
        setError(result.error || 'Something went wrong')
        setSubmitting(false)
        return
      }
      hapticHeavy()
      router.push('/matchmaking')
    } catch {
      setError('Something went wrong. Please try again.')
      setSubmitting(false)
    }
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

  // ─── Score Reveal ───
  if (currentStep === 5 && calculatedScore !== null) {
    const levelLabel = getLevelLabel(calculatedScore)
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex justify-center overflow-y-auto">
        <div className="w-full max-w-[480px] min-h-screen relative flex flex-col items-center justify-center px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="flex flex-col items-center"
          >
            {/* Title */}
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/30 mb-8"
            >
              Your Match Day Level
            </motion.p>

            {/* Score Ring */}
            <div className="relative w-44 h-44 mb-8">
              <svg viewBox="0 0 36 36" className="w-44 h-44 -rotate-90">
                <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2.5" />
                <motion.circle
                  cx="18" cy="18" r="15.5" fill="none" stroke="#00ff88" strokeWidth="2.5"
                  strokeLinecap="round"
                  initial={{ strokeDasharray: '0 97.4' }}
                  animate={{ strokeDasharray: `${(calculatedScore / 7) * 97.4} 97.4` }}
                  transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-black text-[#00ff88]">{animatedScore.toFixed(1)}</span>
                <span className="text-[10px] text-white/20 uppercase font-bold mt-1">/ 7.0</span>
              </div>
            </div>

            {/* Level Label */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              className="mb-2"
            >
              <span className="px-4 py-1.5 rounded-full bg-[#00ff88]/10 text-[#00ff88] text-xs font-bold uppercase tracking-wider">
                {levelLabel}
              </span>
            </motion.div>

            {/* Reliability note */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.0 }}
              className="text-white/20 text-xs text-center mt-4 max-w-[280px] leading-relaxed"
            >
              Your reliability starts at 30%. Play more matches to increase your rating confidence.
            </motion.p>
          </motion.div>

          {/* CTA */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2 }}
            className="w-full mt-12 space-y-3"
          >
            {error && (
              <p className="text-red-400 text-xs text-center font-semibold">{error}</p>
            )}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full py-4 bg-[#00ff88] text-black font-black rounded-2xl uppercase tracking-widest text-xs hover:shadow-[0_0_20px_rgba(0,255,136,0.2)] transition-all disabled:opacity-50"
            >
              {submitting ? 'Saving...' : 'Find My First Match'}
            </motion.button>
          </motion.div>
        </div>
      </div>
    )
  }

  // ─── Steps Data ───
  const steps = [
    {
      title: 'Sports History',
      question: 'Have you played other racket sports?',
      subtitle: 'Tennis, Squash, Badminton, etc.',
    },
    {
      title: 'The Walls',
      question: 'How comfortable are you with the glass walls?',
      subtitle: 'A key part of Padel strategy',
    },
    {
      title: 'The Net',
      question: 'Can you sustain a volley rally?',
      subtitle: 'Net play defines your game',
    },
    {
      title: 'Technique',
      question: 'Which shots can you hit consistently?',
      subtitle: 'Select all that apply',
    },
    {
      title: 'Self-Assessment',
      question: 'Where do you honestly think you fit?',
      subtitle: 'Be honest — it helps us find better matches',
    },
  ]

  const step = steps[currentStep]

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex justify-center overflow-y-auto">
      <div className="w-full max-w-[480px] min-h-screen relative flex flex-col">
        {/* Header */}
        <div className="pt-[max(3rem,calc(env(safe-area-inset-top)+1.5rem))] px-6 pb-2">
          <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/20">
            Step {currentStep + 1} of 5
          </p>
        </div>

        <StepIndicator current={currentStep} total={5} />

        {/* Step Content */}
        <div className="flex-1 px-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="space-y-6"
            >
              {/* Question */}
              <div className="pt-2">
                <h2 className="text-xl font-bold tracking-tight">{step.question}</h2>
                <p className="text-white/30 text-sm mt-1">{step.subtitle}</p>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {currentStep === 0 && (
                  <>
                    <OptionCard
                      label="Never played racket sports"
                      description="Padel is my first racket sport"
                      selected={answers.sportsHistory === 'never'}
                      onSelect={() => setAnswers((a) => ({ ...a, sportsHistory: 'never' }))}
                    />
                    <OptionCard
                      label="Yes, I have experience"
                      description="Tennis, Squash, Badminton, or similar"
                      selected={answers.sportsHistory === 'yes'}
                      onSelect={() => setAnswers((a) => ({ ...a, sportsHistory: 'yes' }))}
                    />
                  </>
                )}

                {currentStep === 1 && (
                  <>
                    <OptionCard
                      label="I avoid them"
                      description="I stay away from the glass walls"
                      selected={answers.walls === 'avoid'}
                      onSelect={() => setAnswers((a) => ({ ...a, walls: 'avoid' }))}
                    />
                    <OptionCard
                      label="I can return slow balls"
                      description="Comfortable with basic wall returns"
                      selected={answers.walls === 'slow'}
                      onSelect={() => setAnswers((a) => ({ ...a, walls: 'slow' }))}
                    />
                    <OptionCard
                      label="I use them for attack"
                      description="I play off the walls strategically"
                      selected={answers.walls === 'attack'}
                      onSelect={() => setAnswers((a) => ({ ...a, walls: 'attack' }))}
                    />
                  </>
                )}

                {currentStep === 2 && (
                  <>
                    <OptionCard
                      label="No"
                      description="I'm still learning net play"
                      selected={answers.net === 'no'}
                      onSelect={() => setAnswers((a) => ({ ...a, net: 'no' }))}
                    />
                    <OptionCard
                      label="Yes, at slow speeds"
                      description="I can sustain controlled rallies"
                      selected={answers.net === 'slow_speeds'}
                      onSelect={() => setAnswers((a) => ({ ...a, net: 'slow_speeds' }))}
                    />
                    <OptionCard
                      label="Yes, aggressive net play"
                      description="I dominate at the net with power and placement"
                      selected={answers.net === 'aggressive'}
                      onSelect={() => setAnswers((a) => ({ ...a, net: 'aggressive' }))}
                    />
                  </>
                )}

                {currentStep === 3 && (
                  <>
                    <ToggleCard
                      label="Bandeja"
                      description="Overhead slice shot to control the point"
                      selected={answers.techniques.includes('bandeja')}
                      onToggle={() =>
                        setAnswers((a) => ({
                          ...a,
                          techniques: a.techniques.includes('bandeja')
                            ? a.techniques.filter((t) => t !== 'bandeja')
                            : [...a.techniques, 'bandeja'],
                        }))
                      }
                    />
                    <ToggleCard
                      label="Smash"
                      description="Power overhead to finish the point"
                      selected={answers.techniques.includes('smash')}
                      onToggle={() =>
                        setAnswers((a) => ({
                          ...a,
                          techniques: a.techniques.includes('smash')
                            ? a.techniques.filter((t) => t !== 'smash')
                            : [...a.techniques, 'smash'],
                        }))
                      }
                    />
                    <ToggleCard
                      label="Vibora"
                      description="Aggressive side-spin overhead shot"
                      selected={answers.techniques.includes('vibora')}
                      onToggle={() =>
                        setAnswers((a) => ({
                          ...a,
                          techniques: a.techniques.includes('vibora')
                            ? a.techniques.filter((t) => t !== 'vibora')
                            : [...a.techniques, 'vibora'],
                        }))
                      }
                    />
                    {answers.techniques.length === 0 && (
                      <p className="text-white/15 text-xs text-center pt-1">
                        No worries — you can skip if none apply yet
                      </p>
                    )}
                  </>
                )}

                {currentStep === 4 && (
                  <>
                    <OptionCard
                      label="Initiation"
                      description="I'm just starting out and learning the basics"
                      selected={answers.selfAssessment === 'initiation'}
                      onSelect={() => setAnswers((a) => ({ ...a, selfAssessment: 'initiation' }))}
                    />
                    <OptionCard
                      label="Intermediate"
                      description="I can play full games and know the rules well"
                      selected={answers.selfAssessment === 'intermediate'}
                      onSelect={() => setAnswers((a) => ({ ...a, selfAssessment: 'intermediate' }))}
                    />
                    <OptionCard
                      label="Competition"
                      description="I play competitively and train regularly"
                      selected={answers.selfAssessment === 'competition'}
                      onSelect={() => setAnswers((a) => ({ ...a, selfAssessment: 'competition' }))}
                    />
                  </>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Navigation */}
        <div className="px-6 pb-[max(2rem,calc(env(safe-area-inset-bottom)+1rem))] pt-4">
          <div className="flex gap-3">
            {currentStep > 0 && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={handleBack}
                className="px-6 py-4 bg-white/5 text-white/40 font-bold rounded-2xl text-xs uppercase tracking-wider border border-white/10"
              >
                Back
              </motion.button>
            )}
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={handleNext}
              disabled={!canProceed()}
              className={`flex-1 py-4 font-black rounded-2xl text-xs uppercase tracking-widest transition-all ${
                canProceed()
                  ? 'bg-[#00ff88] text-black hover:shadow-[0_0_20px_rgba(0,255,136,0.2)]'
                  : 'bg-white/5 text-white/20 cursor-not-allowed'
              }`}
            >
              {currentStep === 4 ? 'See My Level' : 'Next'}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  )
}
