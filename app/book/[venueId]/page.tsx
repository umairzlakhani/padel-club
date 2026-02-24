'use client'
import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/app/components/BottomNav'
import Toast from '@/app/components/Toast'
import { CLUBS } from '@/lib/clubs'

const DURATIONS = [30, 60, 90, 120]

const TIME_SLOTS = [
  '5:00 PM', '5:30 PM', '6:00 PM', '6:30 PM', '7:00 PM',
  '7:30 PM', '8:00 PM', '8:30 PM', '9:00 PM', '9:30 PM',
]

const BOOKED_SLOTS = new Set(['6:30 PM', '8:00 PM'])

export default function VenueBookingPage({ params }: { params: Promise<{ venueId: string }> }) {
  const { venueId } = use(params)
  const router = useRouter()

  const venue = CLUBS.find((c) => c.id === venueId)

  const [dates, setDates] = useState<{ key: string; day: string; date: number; month: string }[]>([])
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [selectedDuration, setSelectedDuration] = useState(60)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null)
  const [selectedCourts, setSelectedCourts] = useState<Set<number>>(new Set())
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type })
  }, [])

  useEffect(() => {
    const generated = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date()
      d.setDate(d.getDate() + i)
      return {
        key: d.toISOString().split('T')[0],
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
        date: d.getDate(),
        month: d.toLocaleDateString('en-US', { month: 'short' }),
      }
    })
    setDates(generated)
    setSelectedDate(generated[0].key)
  }, [])

  if (!venue) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center gap-4">
        <p className="text-white/40 text-sm">Venue not found</p>
        <button onClick={() => router.back()} className="text-[#00ff88] text-sm font-semibold">
          Go Back
        </button>
      </div>
    )
  }

  const toggleCourt = (court: number) => {
    setSelectedCourts((prev) => {
      const next = new Set(prev)
      if (next.has(court)) {
        next.delete(court)
      } else {
        next.add(court)
      }
      return next
    })
  }

  const totalAmount = (selectedDuration / 60) * venue.pricePerHour * selectedCourts.size
  const canBook = selectedTimeSlot !== null && selectedCourts.size > 0

  const handleBookNow = async () => {
    if (!canBook) return
    const courtList = Array.from(selectedCourts).sort().map((c) => `Court ${c}`).join(', ')

    // Post to activity feed
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('applications').select('full_name').eq('id', user.id).single()
      const name = profile?.full_name || 'A player'
      await supabase.from('activity_feed').insert({
        user_id: user.id,
        type: 'booking',
        title: `${name} booked ${courtList}`,
        description: `${venue.name} · ${selectedDate} · ${selectedTimeSlot} · ${selectedDuration} min`,
        metadata: { venue_id: venue.id, venue: venue.name, courts: Array.from(selectedCourts) },
      }).then(() => {})
    }

    showToast(`Booked ${courtList} at ${venue.name} — ${selectedTimeSlot}, ${selectedDuration}min`)
    setSelectedTimeSlot(null)
    setSelectedCourts(new Set())
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex justify-center overflow-y-auto">
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast((t) => ({ ...t, visible: false }))} />

      <div className="w-full max-w-[480px] min-h-screen relative pb-48 page-transition">
        {/* Hero Image */}
        <div className="relative w-full aspect-[2.5/1] overflow-hidden">
          <Image
            src={venue.imageUrl}
            alt={venue.name}
            fill
            unoptimized
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/40 to-transparent" />
          <button
            onClick={() => router.back()}
            className="absolute top-4 left-4 min-w-[44px] min-h-[44px] bg-black/40 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/10"
            aria-label="Go back"
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="absolute bottom-4 left-6 right-6">
            <h1 className="text-2xl font-bold tracking-tight">{venue.name}</h1>
            <p className="text-white/50 text-sm">{venue.location}</p>
          </div>
        </div>

        {/* Horizontal Date Picker */}
        <div className="px-6 mb-6">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {dates.map((d) => (
              <button
                key={d.key}
                onClick={() => setSelectedDate(d.key)}
                className={`flex flex-col items-center py-3 px-4 rounded-xl border transition-all min-w-[64px] shrink-0 ${
                  selectedDate === d.key
                    ? 'bg-[#00ff88] text-black border-[#00ff88]'
                    : 'bg-white/5 border-white/5 text-white/50 hover:border-white/10'
                }`}
              >
                <span className="text-[10px] font-semibold uppercase">{d.day}</span>
                <span className="text-lg font-bold">{d.date}</span>
                <span className="text-[10px] font-medium">{d.month}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Duration Selector */}
        <div className="px-6 mb-6">
          <h3 className="text-xs uppercase font-bold tracking-wider text-white/30 mb-3">Duration</h3>
          <div className="flex gap-2">
            {DURATIONS.map((dur) => (
              <button
                key={dur}
                onClick={() => setSelectedDuration(dur)}
                className={`flex-1 py-2.5 rounded-xl border text-sm font-bold transition-all ${
                  selectedDuration === dur
                    ? 'bg-[#00ff88] text-black border-[#00ff88]'
                    : 'bg-white/5 border-white/5 text-white/50 hover:border-white/10'
                }`}
              >
                {dur} min
              </button>
            ))}
          </div>
        </div>

        {/* Time Slot Grid */}
        <div className="px-6 mb-6">
          <h3 className="text-xs uppercase font-bold tracking-wider text-white/30 mb-3">Time Slot</h3>
          <div className="grid grid-cols-2 gap-2">
            {TIME_SLOTS.map((slot) => {
              const isBooked = BOOKED_SLOTS.has(slot)
              const isSelected = selectedTimeSlot === slot
              return (
                <button
                  key={slot}
                  disabled={isBooked}
                  onClick={() => setSelectedTimeSlot(isSelected ? null : slot)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-[#00ff88]/10 border-[#00ff88]/40'
                      : isBooked
                      ? 'bg-white/[0.02] border-white/[0.03] opacity-40 cursor-not-allowed'
                      : 'bg-white/5 border-white/5 hover:border-[#00ff88]/20'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-bold ${isSelected ? 'text-[#00ff88]' : isBooked ? 'text-white/30' : 'text-white'}`}>
                      {slot}
                    </span>
                    {!isBooked && (
                      <span className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88]" />
                        <span className="text-[10px] text-white/30 font-medium">Available</span>
                      </span>
                    )}
                  </div>
                  {isBooked && <span className="text-[9px] text-white/20 font-medium block mt-1">Booked</span>}
                </button>
              )
            })}
          </div>
        </div>

        {/* Court Selector */}
        <div className="px-6 mb-6">
          <h3 className="text-xs uppercase font-bold tracking-wider text-white/30 mb-3">Select Courts</h3>
          <div className="grid grid-cols-2 gap-2">
            {Array.from({ length: venue.courts }).map((_, i) => {
              const courtNum = i + 1
              const isSelected = selectedCourts.has(courtNum)
              return (
                <button
                  key={courtNum}
                  onClick={() => toggleCourt(courtNum)}
                  className={`p-4 rounded-xl border text-center transition-all ${
                    isSelected
                      ? 'bg-[#00ff88]/10 border-[#00ff88]/40'
                      : 'bg-white/5 border-white/5 hover:border-[#00ff88]/20'
                  }`}
                >
                  <span className={`text-sm font-bold block ${isSelected ? 'text-[#00ff88]' : 'text-white'}`}>
                    Court {courtNum}
                  </span>
                  <span className="text-[10px] text-white/30 font-medium mt-0.5 block">Double</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Sticky Footer */}
      <div className="fixed bottom-[72px] left-1/2 -translate-x-1/2 w-full max-w-[480px] z-40">
        <div className="bg-[#111]/80 backdrop-blur-xl border-t border-white/5 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-white/30 uppercase font-bold tracking-wider">Total</p>
              <p className="text-xl font-bold text-white">
                PKR {totalAmount.toLocaleString()}
              </p>
            </div>
            <button
              onClick={handleBookNow}
              disabled={!canBook}
              className={`px-8 py-3 rounded-xl font-bold text-sm transition-all ${
                canBook
                  ? 'bg-[#00ff88] text-black hover:bg-[#00e676] active:scale-95'
                  : 'bg-white/5 text-white/20 cursor-not-allowed'
              }`}
            >
              Book Now
            </button>
          </div>
        </div>
      </div>

      <BottomNav />
    </div>
  )
}
