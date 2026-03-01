'use client'
import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { hapticLight, hapticSuccess, hapticError } from '@/lib/haptics'
import { getClub, getTier } from '@/lib/ladder-config'
import BottomNav from '@/app/components/BottomNav'
import Toast from '@/app/components/Toast'
import Avatar from '@/app/components/Avatar'
import LadderBreadcrumb from '@/app/components/LadderBreadcrumb'

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 30 } } }

type Member = {
  id: string
  full_name: string
  avatar_url?: string | null
  skill_level?: number
}

export default function TierRegisterPage() {
  const router = useRouter()
  const params = useParams<{ clubId: string; tierId: string }>()
  const { clubId, tierId } = params

  const club = getClub(clubId)
  const tier = getTier(clubId, tierId)

  const [userId, setUserId] = useState<string | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [search, setSearch] = useState('')
  const [selectedPartner, setSelectedPartner] = useState<Member | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })

  useEffect(() => {
    if (!club || !tier) {
      router.replace('/ladder')
      return
    }

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }
      setUserId(user.id)

      const { data } = await supabase
        .from('applications')
        .select('id, full_name, avatar_url, skill_level')
        .eq('status', 'approved')
        .neq('id', user.id)
        .order('full_name', { ascending: true })

      setMembers((data as Member[]) || [])
      setLoading(false)
    }
    init()
  }, [router, club, tier])

  const filtered = members.filter((m) =>
    m.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  async function handleRegister() {
    if (!selectedPartner || !userId) return
    setIsSubmitting(true)
    hapticLight()

    try {
      const { data: { session } } = await supabase.auth.getSession()
      const res = await fetch('/api/ladder/register-team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          partner_id: selectedPartner.id,
          tier: tierId,
          club_id: clubId,
        }),
      })
      const json = await res.json()

      if (!res.ok) {
        setToast({ visible: true, message: json.error, type: 'error' })
        hapticError()
        setIsSubmitting(false)
        return
      }

      hapticSuccess()
      setToast({ visible: true, message: 'Team registered!', type: 'success' })
      setTimeout(() => router.push(`/ladder/${clubId}/${tierId}`), 1000)
    } catch {
      setToast({ visible: true, message: 'Something went wrong', type: 'error' })
      hapticError()
      setIsSubmitting(false)
    }
  }

  if (!club || !tier) return null

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex justify-center">
        <div className="w-full max-w-[480px] relative" style={{ minHeight: '100dvh' }}>
          <div className="pt-[max(1rem,env(safe-area-inset-top))] px-6">
            <div className="h-8 w-40 bg-white/5 rounded-lg animate-pulse mt-2 mb-6" />
            <div className="h-12 bg-white/5 rounded-xl animate-pulse mb-4" />
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-16 bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
          <BottomNav />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex justify-center">
      <div className="w-full max-w-[480px] relative" style={{ minHeight: '100dvh' }}>
        {/* Header */}
        <div className="pt-[max(1rem,env(safe-area-inset-top))] px-6 pb-2">
          <div className="flex items-center gap-3 mb-1">
            <button onClick={() => { hapticLight(); router.push(`/ladder/${clubId}/${tierId}`) }} className="cursor-pointer text-white/40 hover:text-white transition-colors">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold">Register Team</h1>
          </div>
          <div className="pl-9">
            <LadderBreadcrumb segments={[
              { label: 'Ladder', href: '/ladder' },
              { label: club.shortName, href: `/ladder/${clubId}` },
              { label: tier.name, href: `/ladder/${clubId}/${tierId}` },
              { label: 'Register', href: `/ladder/${clubId}/${tierId}/register` },
            ]} />
          </div>
        </div>

        {/* Selected Partner */}
        {selectedPartner && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-6 mb-4 p-4 rounded-2xl border border-[#00ff88]/20 bg-[#00ff88]/[0.05] flex items-center gap-3"
          >
            <Avatar src={selectedPartner.avatar_url} name={selectedPartner.full_name} size="md" highlight />
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">{selectedPartner.full_name}</p>
              <p className="text-[10px] uppercase font-bold tracking-wider text-[#00ff88]/60">Selected Partner</p>
            </div>
            <button
              onClick={() => { setSelectedPartner(null); hapticLight() }}
              className="text-white/30 hover:text-white/60 transition-colors cursor-pointer p-1"
            >
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </motion.div>
        )}

        {/* Search */}
        <div className="px-6 mb-4">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search members..."
              className="w-full rounded-xl border border-white/10 bg-[#111] pl-10 pr-4 py-3 text-sm text-white placeholder-white/20 outline-none transition-colors focus:border-[#00ff88]/40"
            />
          </div>
        </div>

        {/* Members List */}
        <div className="px-6 pb-36">
          <motion.div variants={stagger} initial="hidden" animate="show" className="space-y-2">
            {filtered.map((member) => {
              const isSelected = selectedPartner?.id === member.id
              return (
                <motion.button
                  key={member.id}
                  variants={fadeUp}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => {
                    hapticLight()
                    setSelectedPartner(isSelected ? null : member)
                  }}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors cursor-pointer ${
                    isSelected
                      ? 'border-[#00ff88]/30 bg-[#00ff88]/[0.05]'
                      : 'border-white/5 bg-[#111] hover:border-white/10'
                  }`}
                >
                  <Avatar src={member.avatar_url} name={member.full_name} size="sm" highlight={isSelected} />
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-white">{member.full_name}</p>
                    {member.skill_level && (
                      <p className="text-[10px] uppercase font-bold tracking-wider text-white/30">
                        Level {member.skill_level}
                      </p>
                    )}
                  </div>
                  {isSelected && (
                    <div className="w-5 h-5 rounded-full bg-[#00ff88] flex items-center justify-center">
                      <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="black" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </motion.button>
              )
            })}
          </motion.div>

          {filtered.length === 0 && (
            <p className="text-center text-white/30 text-sm mt-10">No members found</p>
          )}
        </div>

        {/* Register Button (fixed) */}
        {selectedPartner && (
          <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-full max-w-[480px] px-6 z-40">
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleRegister}
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-full bg-[#00ff88] text-black text-sm font-bold cursor-pointer transition-opacity disabled:opacity-50 shadow-lg shadow-[#00ff88]/20"
            >
              {isSubmitting ? 'Registering...' : 'Register Team'}
            </motion.button>
          </div>
        )}

        <BottomNav />
      </div>

      <Toast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onClose={() => setToast((t) => ({ ...t, visible: false }))}
      />
    </div>
  )
}
