'use client'
import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { hapticLight } from '@/lib/haptics'
import { getClub } from '@/lib/ladder-config'
import BottomNav from '@/app/components/BottomNav'
import LadderBreadcrumb from '@/app/components/LadderBreadcrumb'
import TierCard from '@/app/components/TierCard'

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } }
const fadeUp = { hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 30 } } }

type TierSummary = {
  slug: string
  name: string
  icon: string
  teamCount: number
  topTeam: string | null
}

export default function ClubDashboardPage() {
  const router = useRouter()
  const params = useParams<{ clubId: string }>()
  const clubId = params.clubId
  const club = getClub(clubId)

  const [loading, setLoading] = useState(true)
  const [tierSummaries, setTierSummaries] = useState<TierSummary[]>([])
  const [isMember, setIsMember] = useState(false)

  useEffect(() => {
    if (!club) {
      router.replace('/ladder')
      return
    }

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/'); return }

      // Check membership
      const { data: app } = await supabase
        .from('applications')
        .select('id, status')
        .eq('id', user.id)
        .eq('status', 'approved')
        .maybeSingle()

      setIsMember(!!app)

      // Fetch tier summaries
      const summaries: TierSummary[] = []
      for (const tier of club!.tiers) {
        const { count } = await supabase
          .from('ladder_teams')
          .select('*', { count: 'exact', head: true })
          .eq('club_id', clubId)
          .eq('tier', tier.slug)

        const { data: topTeamRow } = await supabase
          .from('ladder_teams')
          .select('team_name')
          .eq('club_id', clubId)
          .eq('tier', tier.slug)
          .eq('rank', 1)
          .maybeSingle()

        summaries.push({
          slug: tier.slug,
          name: tier.name,
          icon: tier.icon,
          teamCount: count ?? 0,
          topTeam: topTeamRow?.team_name ?? null,
        })
      }
      setTierSummaries(summaries)
      setLoading(false)
    }
    init()
  }, [router, clubId, club])

  if (!club) return null

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex justify-center">
        <div className="w-full max-w-[480px] relative" style={{ minHeight: '100dvh' }}>
          <div className="pt-[max(1rem,env(safe-area-inset-top))] px-6 pb-4">
            <div className="h-8 w-40 bg-white/5 rounded-lg animate-pulse mt-2 mb-6" />
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-white/5 rounded-2xl animate-pulse" />
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
        <div className="pt-[max(1rem,env(safe-area-inset-top))] px-6 pb-2">
          <div className="flex items-center gap-3 mb-1">
            <button onClick={() => { hapticLight(); router.push('/ladder') }} className="cursor-pointer text-white/40 hover:text-white transition-colors">
              <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-2xl font-bold">{club.shortName}</h1>
          </div>
          <div className="pl-9">
            <LadderBreadcrumb segments={[
              { label: 'Ladder', href: '/ladder' },
              { label: club.shortName, href: `/ladder/${clubId}` },
            ]} />
          </div>
        </div>

        {/* Membership Badge */}
        <div className="px-6 mb-4">
          {isMember ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#00ff88]/[0.05] border border-[#00ff88]/20">
              <div className="w-2 h-2 rounded-full bg-[#00ff88]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#00ff88]">Verified Member</span>
            </div>
          ) : (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => hapticLight()}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/[0.08] border border-amber-500/20 cursor-pointer"
            >
              <div className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">Verify Membership</span>
            </motion.button>
          )}
        </div>

        {/* Tier Grid */}
        <div className="px-6 pb-28">
          <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 gap-3">
            {tierSummaries.map((tier) => (
              <motion.div key={tier.slug} variants={fadeUp}>
                <TierCard
                  name={tier.name}
                  slug={tier.slug}
                  clubId={clubId}
                  icon={tier.icon}
                  topTeam={tier.topTeam}
                  teamCount={tier.teamCount}
                />
              </motion.div>
            ))}
          </motion.div>
        </div>

        <BottomNav />
      </div>
    </div>
  )
}
