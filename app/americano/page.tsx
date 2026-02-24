'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { CLUBS } from '@/lib/clubs'
import { hapticLight, hapticMedium } from '@/lib/haptics'
import BottomNav from '@/app/components/BottomNav'
import Toast from '@/app/components/Toast'

type AmericanoEvent = {
  id: string
  name: string
  date: string
  display_date: string
  venue: string
  format: string
  entry_fee: number
  max_teams: number
  registered_teams: number
  status: string
  description: string
}

export default function AmericanoPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [events, setEvents] = useState<AmericanoEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })

  // Create form state
  const [formName, setFormName] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formVenue, setFormVenue] = useState(CLUBS[0]?.name || '')
  const [formMaxPlayers, setFormMaxPlayers] = useState('8')
  const [formEntryFee, setFormEntryFee] = useState('')

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type })
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)

      const { data, error } = await supabase
        .from('tournaments')
        .select('*')
        .ilike('format', '%americano%')
        .order('date', { ascending: true })

      if (!error && data) {
        setEvents(data.map((t: any) => ({
          id: t.id,
          name: t.name,
          date: t.date,
          display_date: t.display_date || '',
          venue: t.venue,
          format: t.format,
          entry_fee: t.entry_fee || 0,
          max_teams: t.max_teams || 0,
          registered_teams: t.registered_teams || 0,
          status: t.status || 'upcoming',
          description: t.description || '',
        })))
      }
      setLoading(false)
    }
    init()
  }, [])

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel('americano-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, (payload) => {
        const row = (payload.eventType === 'DELETE' ? payload.old : payload.new) as any
        // Only handle americano events
        if (payload.eventType !== 'DELETE' && !row.format?.toLowerCase().includes('americano')) return

        if (payload.eventType === 'INSERT' && row.format?.toLowerCase().includes('americano')) {
          setEvents((prev) => [...prev, {
            id: row.id, name: row.name, date: row.date, display_date: row.display_date || '',
            venue: row.venue || '', format: row.format, entry_fee: row.entry_fee || 0,
            max_teams: row.max_teams || 0, registered_teams: row.registered_teams || 0,
            status: row.status || 'upcoming', description: row.description || '',
          }])
        } else if (payload.eventType === 'UPDATE') {
          setEvents((prev) => prev.map((e) =>
            e.id === row.id
              ? { ...e, name: row.name ?? e.name, status: row.status ?? e.status, registered_teams: row.registered_teams ?? e.registered_teams }
              : e
          ))
        } else if (payload.eventType === 'DELETE') {
          setEvents((prev) => prev.filter((e) => e.id !== row.id))
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  async function handleCreate() {
    if (!formName.trim() || !formDate) {
      showToast('Please fill in name and date', 'error')
      return
    }
    setCreating(true)
    hapticMedium()

    const { error } = await supabase.from('tournaments').insert({
      name: formName.trim(),
      date: formDate,
      venue: formVenue,
      format: 'Americano',
      max_teams: Number(formMaxPlayers) || 8,
      entry_fee: Number(formEntryFee) || 0,
      registered_teams: 0,
      status: 'open',
      organizer: 'Match Day',
      organizer_logo: 'MD',
    })

    if (error) {
      showToast(error.message, 'error')
    } else {
      showToast('Americano event created!')
      setShowCreate(false)
      setFormName('')
      setFormDate('')
      setFormVenue(CLUBS[0]?.name || '')
      setFormMaxPlayers('8')
      setFormEntryFee('')
    }
    setCreating(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
          <span className="text-white/40 text-sm font-medium">Loading Americano...</span>
        </div>
      </div>
    )
  }

  const upcoming = events.filter((e) => e.status === 'upcoming' || e.status === 'open')
  const completed = events.filter((e) => e.status === 'completed')
  const full = events.filter((e) => e.status === 'full')

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex justify-center overflow-y-auto">
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast((t) => ({ ...t, visible: false }))} />
      <div className="w-full max-w-[480px] min-h-screen relative pb-24">
        {/* Header */}
        <div className="pt-12 pb-4 px-6">
          <h1 className="text-2xl font-bold tracking-tight mb-1">Americano</h1>
          <p className="text-white/30 text-sm">Partners rotate each round — meet everyone on the court!</p>
        </div>

        {/* Event List */}
        <div className="px-6 space-y-3">
          {events.length === 0 && (
            <div className="text-center py-16">
              <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="text-white/15">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </div>
              <p className="text-white/20 text-sm font-medium">No Americano events yet</p>
              <p className="text-white/10 text-xs mt-1">Be the first to create one!</p>
            </div>
          )}

          {/* Upcoming / Open */}
          {upcoming.length > 0 && (
            <>
              <h3 className="text-xs uppercase font-bold tracking-wider text-white/40 pt-2">Open Events</h3>
              {upcoming.map((evt) => {
                const spotsLeft = evt.max_teams - evt.registered_teams
                return (
                  <div key={evt.id} className="bg-[#111] rounded-2xl border border-white/5 p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-sm font-bold">{evt.name}</h4>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#00ff88]/10 text-[#00ff88]">
                        {evt.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-white/30 text-[11px] mb-2">
                      <span>{evt.display_date || new Date(evt.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                      <span>·</span>
                      <span>{evt.venue}</span>
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-white/20">{evt.registered_teams}/{evt.max_teams} players{spotsLeft > 0 && spotsLeft <= 3 ? ` · ${spotsLeft} left!` : ''}</span>
                      {evt.entry_fee > 0 && (
                        <span className="font-bold text-[#00ff88]">PKR {evt.entry_fee.toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                )
              })}
            </>
          )}

          {/* Full */}
          {full.length > 0 && (
            <>
              <h3 className="text-xs uppercase font-bold tracking-wider text-white/40 pt-4">Full</h3>
              {full.map((evt) => (
                <div key={evt.id} className="bg-[#111] rounded-2xl border border-white/5 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold">{evt.name}</h4>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400">Full</span>
                  </div>
                  <div className="flex items-center gap-3 text-white/30 text-[11px]">
                    <span>{evt.display_date || new Date(evt.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                    <span>·</span>
                    <span>{evt.venue}</span>
                    <span>·</span>
                    <span>{evt.max_teams} players</span>
                  </div>
                </div>
              ))}
            </>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <>
              <h3 className="text-xs uppercase font-bold tracking-wider text-white/40 pt-4">Completed</h3>
              {completed.map((evt) => (
                <div key={evt.id} className="bg-[#111] rounded-2xl border border-white/5 p-4 opacity-60">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold">{evt.name}</h4>
                    <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-white/5 text-white/30">Completed</span>
                  </div>
                  <div className="flex items-center gap-3 text-white/30 text-[11px]">
                    <span>{evt.display_date || new Date(evt.date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                    <span>·</span>
                    <span>{evt.venue}</span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* FAB */}
        <button
          onClick={() => { setShowCreate(true); hapticLight() }}
          className="fixed bottom-24 right-6 w-14 h-14 bg-[#00ff88] rounded-full shadow-lg shadow-[#00ff88]/30 flex items-center justify-center z-40 active:scale-90 transition-transform"
          aria-label="Create Americano event"
        >
          <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="black" strokeWidth="2.5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>

        {/* Create Modal (Bottom Sheet) */}
        {showCreate && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
            <div className="relative w-full max-w-[480px] bg-[#111] border-t border-white/10 rounded-t-3xl p-6 pb-10 animate-[slideUp_0.3s_ease-out]">
              <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-6" />
              <h2 className="text-lg font-bold mb-5">Create Americano Event</h2>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-gray-500 font-bold ml-1">Event Name</label>
                  <input
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Sunday Americano"
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 outline-none focus:border-[#00ff88] transition-all text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-gray-500 font-bold ml-1">Date</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 outline-none focus:border-[#00ff88] transition-all text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] uppercase text-gray-500 font-bold ml-1">Venue</label>
                  <select
                    value={formVenue}
                    onChange={(e) => setFormVenue(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 outline-none focus:border-[#00ff88] transition-all text-sm appearance-none"
                  >
                    {CLUBS.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-gray-500 font-bold ml-1">Max Players</label>
                    <input
                      type="number"
                      value={formMaxPlayers}
                      onChange={(e) => setFormMaxPlayers(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 outline-none focus:border-[#00ff88] transition-all text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase text-gray-500 font-bold ml-1">Entry Fee (PKR)</label>
                    <input
                      type="number"
                      value={formEntryFee}
                      onChange={(e) => setFormEntryFee(e.target.value)}
                      placeholder="0"
                      className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 outline-none focus:border-[#00ff88] transition-all text-sm"
                    />
                  </div>
                </div>

                <button
                  onClick={handleCreate}
                  disabled={creating}
                  className="w-full py-4 bg-[#00ff88] text-black font-black rounded-2xl uppercase tracking-widest text-xs hover:shadow-[0_0_20px_rgba(0,255,136,0.2)] transition-all disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
