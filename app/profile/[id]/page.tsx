'use client'
import { useState, useEffect, use } from 'react'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/app/components/BottomNav'
import Toast from '@/app/components/Toast'
import { useRouter } from 'next/navigation'

// Level evolution data points (mock — same shape as main profile)
const LEVEL_POINTS = [
  { month: 'Sep', value: 1.8 },
  { month: 'Oct', value: 2.0 },
  { month: 'Nov', value: 1.9 },
  { month: 'Dec', value: 2.15 },
  { month: 'Jan', value: 2.3 },
  { month: 'Feb', value: 2.5 },
]

function LevelEvolutionGraph({ currentLevel }: { currentLevel: number }) {
  const min = 1.5
  const max = Math.max(3.0, currentLevel + 0.5)
  const graphH = 120
  const graphW = 360
  const padX = 10
  const padY = 10
  const usableW = graphW - padX * 2
  const usableH = graphH - padY * 2

  // Scale mock points relative to current level
  const scale = currentLevel / 2.5
  const points = LEVEL_POINTS.map((pt, i) => {
    const scaledValue = Math.min(pt.value * scale, max)
    const x = padX + (i / (LEVEL_POINTS.length - 1)) * usableW
    const y = padY + usableH - ((scaledValue - min) / (max - min)) * usableH
    return { x, y, month: pt.month, value: scaledValue }
  })

  const linePath = points.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`).join(' ')
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${graphH} L ${points[0].x} ${graphH} Z`
  const lastPt = points[points.length - 1]

  return (
    <div className="relative">
      <svg width="100%" height="140" viewBox={`0 0 ${graphW} ${graphH + 20}`} preserveAspectRatio="none">
        <defs>
          <linearGradient id="blueGradPlayer" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 1, 2, 3].map((i) => (
          <line
            key={i}
            x1={padX}
            y1={padY + (i / 3) * usableH}
            x2={graphW - padX}
            y2={padY + (i / 3) * usableH}
            stroke="rgba(255,255,255,0.04)"
            strokeWidth="1"
          />
        ))}
        <path d={areaPath} fill="url(#blueGradPlayer)" />
        <path d={linePath} fill="none" stroke="#3B82F6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={lastPt.x} cy={lastPt.y} r="5" fill="#3B82F6" />
        <circle cx={lastPt.x} cy={lastPt.y} r="8" fill="#3B82F6" fillOpacity="0.25" />
        {points.map((pt) => (
          <text key={pt.month} x={pt.x} y={graphH + 14} fill="rgba(255,255,255,0.3)" fontSize="9" textAnchor="middle" fontWeight="600">
            {pt.month}
          </text>
        ))}
      </svg>
      <div className="absolute top-2 right-2 bg-[#3B82F6] text-white text-[10px] font-bold px-2.5 py-1 rounded-md shadow-lg shadow-blue-500/30">
        {currentLevel.toFixed(1)}
      </div>
    </div>
  )
}

export default function PlayerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [player, setPlayer] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [isOwnProfile, setIsOwnProfile] = useState(false)
  const [rank, setRank] = useState<number | null>(null)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const [friendStatus, setFriendStatus] = useState<'none' | 'sent' | 'incoming' | 'friends'>('none')
  const [friendRowId, setFriendRowId] = useState<string | null>(null)
  const [friendActionLoading, setFriendActionLoading] = useState(false)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })
  const [followers, setFollowers] = useState(0)
  const [following, setFollowing] = useState(0)

  useEffect(() => {
    async function load() {
      // Check if viewing own profile
      const { data: { user } } = await supabase.auth.getUser()
      const uid = user?.id || null
      setCurrentUserId(uid)
      if (uid === id) {
        setIsOwnProfile(true)
      }

      // Load friend relationship
      if (uid && uid !== id) {
        const { data: friendRows } = await supabase
          .from('friends')
          .select('*')
          .or(`and(requester_id.eq.${uid},addressee_id.eq.${id}),and(requester_id.eq.${id},addressee_id.eq.${uid})`)

        if (friendRows && friendRows.length > 0) {
          const row = friendRows[0]
          setFriendRowId(row.id)
          if (row.status === 'accepted') setFriendStatus('friends')
          else if (row.status === 'pending' && row.requester_id === uid) setFriendStatus('sent')
          else if (row.status === 'pending' && row.addressee_id === uid) setFriendStatus('incoming')
        }
      }

      // Fetch player data
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        setLoading(false)
        return
      }

      setPlayer(data)

      // Load followers/following counts
      const { count: followerCount } = await supabase
        .from('friends')
        .select('id', { count: 'exact', head: true })
        .eq('addressee_id', id)
        .eq('status', 'accepted')
      setFollowers(followerCount || 0)

      const { count: followingCount } = await supabase
        .from('friends')
        .select('id', { count: 'exact', head: true })
        .eq('requester_id', id)
        .eq('status', 'accepted')
      setFollowing(followingCount || 0)

      // Determine rank among all members
      const { data: allMembers } = await supabase
        .from('applications')
        .select('id, skill_level, matches_won')
        .eq('status', 'member')

      if (allMembers) {
        const sorted = allMembers.sort((a: any, b: any) => {
          const aSkill = parseFloat(a.skill_level) || 0
          const bSkill = parseFloat(b.skill_level) || 0
          if (bSkill !== aSkill) return bSkill - aSkill
          return (b.matches_won || 0) - (a.matches_won || 0)
        })
        const idx = sorted.findIndex((m: any) => m.id === id)
        if (idx !== -1) setRank(idx + 1)
      }

      setLoading(false)
    }
    load()
  }, [id])

  async function handleFriendAction(action: 'add' | 'accept' | 'decline' | 'remove') {
    if (!currentUserId) return
    setFriendActionLoading(true)
    try {
      if (action === 'add') {
        const { error } = await supabase.from('friends').insert({
          requester_id: currentUserId,
          addressee_id: id,
        })
        if (error) {
          setToast({ visible: true, message: 'Could not send request', type: 'error' })
        } else {
          setFriendStatus('sent')
          setToast({ visible: true, message: 'Friend request sent!', type: 'success' })
        }
      } else if (action === 'accept' && friendRowId) {
        await supabase.from('friends').update({ status: 'accepted' }).eq('id', friendRowId)
        setFriendStatus('friends')
        setToast({ visible: true, message: 'Friend request accepted!', type: 'success' })
      } else if (action === 'decline' && friendRowId) {
        await supabase.from('friends').delete().eq('id', friendRowId)
        setFriendStatus('none')
        setFriendRowId(null)
        setToast({ visible: true, message: 'Request declined', type: 'success' })
      } else if (action === 'remove' && friendRowId) {
        await supabase.from('friends').delete().eq('id', friendRowId)
        setFriendStatus('none')
        setFriendRowId(null)
        setToast({ visible: true, message: 'Friend removed', type: 'success' })
      }
    } catch {
      setToast({ visible: true, message: 'Something went wrong', type: 'error' })
    }
    setFriendActionLoading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
          <span className="text-white/40 text-sm font-medium">Loading profile...</span>
        </div>
      </div>
    )
  }

  if (!player) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center gap-4">
        <p className="text-white/40 text-sm">Player not found</p>
        <button onClick={() => router.back()} className="text-[#00ff88] text-sm font-semibold">
          Go Back
        </button>
      </div>
    )
  }

  const skillLevel = parseFloat(player.skill_level) || 2.5
  const matchesPlayed = player.matches_played || 0
  const matchesWon = player.matches_won || 0
  const winRate = matchesPlayed > 0 ? Math.round((matchesWon / matchesPlayed) * 100) : 0
  const playingHand = player.playing_hand || 'Right'

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex justify-center overflow-y-auto">
      <div className="w-full max-w-[480px] min-h-screen relative pb-24 page-transition">
        {/* Header */}
        <div className="pt-12 pb-6 px-6">
          <div className="flex justify-between items-center mb-8">
            <button onClick={() => router.back()} className="text-white/40 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Go back">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            {isOwnProfile && (
              <span className="text-[9px] font-bold text-[#00ff88] bg-[#00ff88]/10 px-2.5 py-1 rounded-full uppercase tracking-wider">Your Profile</span>
            )}
          </div>

          {/* Avatar + Name */}
          <div className="flex flex-col items-center">
            <div className="relative mb-4">
              {player.avatar_url ? (
                <img
                  src={player.avatar_url}
                  alt={player.full_name}
                  className="w-24 h-24 rounded-full object-cover border-2 border-white/10"
                />
              ) : (
                <div className="w-24 h-24 bg-gradient-to-br from-[#1a1a2e] to-[#16213e] rounded-full border-2 border-white/10 flex items-center justify-center">
                  <span className="text-3xl font-bold text-white/60">{player.full_name?.charAt(0) || '?'}</span>
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 bg-[#00ff88] w-7 h-7 rounded-full border-[3px] border-[#0a0a0a] flex items-center justify-center">
                <span className="text-black text-[9px] font-bold">{skillLevel.toFixed(1)}</span>
              </div>
            </div>

            <h1 className="text-2xl font-bold tracking-tight">{player.full_name || 'Player'}</h1>
            <p className="text-white/30 text-xs mt-1 font-medium">Match Day</p>

            {/* Badges */}
            <div className="flex items-center gap-2 mt-3">
              {rank && (
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                  rank <= 3 ? 'bg-[#00ff88]/10 text-[#00ff88]' : 'bg-white/5 text-white/40'
                }`}>
                  Rank #{rank}
                </span>
              )}
              <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white/5 text-white/40">
                {playingHand}-handed
              </span>
            </div>

            {/* Bio */}
            <p className="text-white/50 text-[13px] text-center mt-3 leading-relaxed max-w-[320px]">
              Level {skillLevel.toFixed(1)} player · {matchesPlayed} matches played · {winRate}% win rate
            </p>

            {/* Friend Button */}
            {!isOwnProfile && currentUserId && (
              <div className="mt-4">
                {friendActionLoading ? (
                  <div className="w-8 h-8 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin mx-auto" />
                ) : friendStatus === 'friends' ? (
                  <button
                    onClick={() => handleFriendAction('remove')}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#00ff88]/10 text-[#00ff88] border border-[#00ff88]/20 min-h-[44px]"
                  >
                    Following ✓
                  </button>
                ) : friendStatus === 'sent' ? (
                  <button className="px-6 py-2.5 rounded-xl text-xs font-bold bg-white/5 text-white/40 min-h-[44px] cursor-default">
                    Requested
                  </button>
                ) : friendStatus === 'incoming' ? (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleFriendAction('accept')}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[#00ff88] text-black min-h-[44px]"
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleFriendAction('decline')}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold bg-white/5 text-white/40 min-h-[44px]"
                    >
                      Decline
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => handleFriendAction('add')}
                    className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#00ff88] text-black hover:bg-[#00ff88]/90 transition-all min-h-[44px]"
                  >
                    Follow
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Stats row — Followers / Following / Win Rate */}
          <div className="flex justify-center gap-12 mt-6">
            <div className="text-center">
              <p className="text-xl font-bold">{followers}</p>
              <p className="text-[10px] text-white/30 uppercase font-semibold tracking-wider">Followers</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold">{following}</p>
              <p className="text-[10px] text-white/30 uppercase font-semibold tracking-wider">Following</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold">{winRate}%</p>
              <p className="text-[10px] text-white/30 uppercase font-semibold tracking-wider">Win Rate</p>
            </div>
          </div>
        </div>

        {/* Level Evolution */}
        <div className="px-6 py-6 space-y-6">
          <section>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs uppercase font-bold tracking-wider text-white/40">Level Evolution</h3>
            </div>
            <div className="bg-[#111] rounded-2xl border border-white/5 p-4 overflow-hidden">
              <LevelEvolutionGraph currentLevel={skillLevel} />
            </div>
          </section>

          {/* Player Details Card */}
          <section>
            <h3 className="text-xs uppercase font-bold tracking-wider text-white/40 mb-3">Player Info</h3>
            <div className="bg-[#111] rounded-2xl border border-white/5 p-4 space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-white/40 text-sm">Skill Level</span>
                <span className="text-sm font-bold text-[#00ff88]">{skillLevel.toFixed(1)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/40 text-sm">Playing Hand</span>
                <span className="text-sm font-semibold">{playingHand}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-white/40 text-sm">Win Rate</span>
                <span className="text-sm font-semibold">{winRate}%</span>
              </div>
              {rank && (
                <div className="flex justify-between items-center">
                  <span className="text-white/40 text-sm">Ranking</span>
                  <span className={`text-sm font-bold ${rank <= 3 ? 'text-[#00ff88]' : ''}`}>#{rank}</span>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
      <BottomNav />
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast(t => ({ ...t, visible: false }))} />
    </div>
  )
}
