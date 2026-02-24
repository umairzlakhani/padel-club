'use client'
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/app/components/BottomNav'
import Toast from '@/app/components/Toast'

type Coach = {
  id: string
  name: string
  specialization: string
  bio: string
  level: string
  rate: number
  initial: string
  availability: { day: string; slots: string[] }[]
}

// Fallback data removed — coaches load from Supabase only

function CoachCard({ coach, onSelect }: { coach: Coach; onSelect: () => void }) {
  return (
    <div className="bg-[#111] rounded-2xl border border-white/5 overflow-hidden hover:border-white/10 transition-all">
      <div className="p-5">
        <div className="flex gap-4">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-white/10 flex items-center justify-center shrink-0">
            <span className="text-lg font-bold text-white/50">{coach.initial}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-sm font-bold">{coach.name}</h3>
                <span className="text-[10px] font-semibold text-[#00ff88] bg-[#00ff88]/10 px-2 py-0.5 rounded inline-block mt-1">
                  {coach.level}
                </span>
              </div>
              <span className="text-sm font-bold text-[#00ff88]">
                PKR {coach.rate.toLocaleString()}
                <span className="text-white/20 text-[10px] font-normal">/hr</span>
              </span>
            </div>
            <p className="text-white/30 text-xs mt-1.5 font-medium">{coach.specialization}</p>
          </div>
        </div>
        <p className="text-white/25 text-[12px] leading-relaxed mt-3">{coach.bio}</p>

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {coach.availability.slice(0, 3).map((a) => (
            <span key={a.day} className="text-[10px] font-medium text-white/20 bg-white/5 px-2 py-1 rounded-md">
              {a.day} · {a.slots.length} slots
            </span>
          ))}
        </div>

        <button
          onClick={onSelect}
          className="w-full mt-4 py-2.5 bg-[#00ff88] text-black font-bold rounded-xl text-xs uppercase tracking-wider hover:bg-[#00ff88]/90 transition-all"
        >
          View Schedule & Book
        </button>
      </div>
    </div>
  )
}

function ScheduleView({
  coach,
  bookedKeys,
  bookingSlot,
  onBook,
}: {
  coach: Coach
  bookedKeys: Set<string>
  bookingSlot: string | null
  onBook: (day: string, slot: string) => void
}) {
  const [selectedDay, setSelectedDay] = useState(coach.availability[0]?.day || '')
  const daySlots = coach.availability.find((a) => a.day === selectedDay)?.slots || []

  return (
    <div>
      <div className="px-6 mb-5">
        <div className="flex items-center gap-4 bg-[#111] rounded-2xl border border-white/5 p-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-white/10 flex items-center justify-center shrink-0">
            <span className="text-sm font-bold text-white/50">{coach.initial}</span>
          </div>
          <div>
            <h3 className="text-sm font-bold">{coach.name}</h3>
            <p className="text-white/30 text-xs">{coach.specialization}</p>
          </div>
        </div>
      </div>

      <div className="px-6 mb-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {coach.availability.map((a) => (
            <button
              key={a.day}
              onClick={() => setSelectedDay(a.day)}
              className={`px-5 py-2.5 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${
                selectedDay === a.day
                  ? 'bg-[#00ff88] text-black border-[#00ff88]'
                  : 'bg-white/5 border-white/5 text-white/40 hover:border-white/10'
              }`}
            >
              {a.day}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6">
        <h3 className="text-xs uppercase font-bold tracking-wider text-white/30 mb-3">
          {selectedDay} — Available Sessions
        </h3>
        <div className="space-y-2">
          {daySlots.map((slot) => {
            const key = `${coach.id}-${selectedDay}-${slot}`
            const isBooked = bookedKeys.has(key)
            const isBooking = bookingSlot === key

            return (
              <div key={slot} className="flex items-center justify-between bg-[#111] rounded-xl border border-white/5 p-4 hover:border-white/10 transition-all">
                <div>
                  <span className="text-sm font-bold">{slot}</span>
                  <span className="text-[10px] text-white/20 font-medium ml-2">60 min session</span>
                </div>
                {isBooked ? (
                  <span className="px-4 py-2 bg-[#00ff88]/10 text-[#00ff88] font-bold rounded-lg text-[11px] uppercase tracking-wider border border-[#00ff88]/20">
                    Booked ✓
                  </span>
                ) : (
                  <button
                    onClick={() => onBook(selectedDay, slot)}
                    disabled={isBooking}
                    className="px-4 py-2 bg-[#00ff88] text-black font-bold rounded-lg text-[11px] uppercase tracking-wider hover:bg-[#00ff88]/90 transition-all disabled:opacity-50"
                  >
                    {isBooking ? '...' : 'Book'}
                  </button>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-4 bg-white/[0.02] rounded-xl border border-white/5 p-4">
          <div className="flex justify-between items-center">
            <span className="text-white/30 text-xs font-medium">Session rate</span>
            <span className="text-sm font-bold text-[#00ff88]">PKR {coach.rate.toLocaleString()}/hr</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function CoachingPage() {
  const [userId, setUserId] = useState<string | null>(null)
  const [coaches, setCoaches] = useState<Coach[]>([])
  const [coachesLoading, setCoachesLoading] = useState(true)
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null)
  const [bookingConfirm, setBookingConfirm] = useState<{ coach: Coach; day: string; slot: string } | null>(null)
  const [bookedKeys, setBookedKeys] = useState<Set<string>>(new Set())
  const [bookingSlot, setBookingSlot] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type })
  }, [])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)

        // Load user's existing coaching bookings
        const { data: bookings } = await supabase
          .from('coaching_bookings')
          .select('coach_id, day, time_slot')
          .eq('user_id', user.id)
          .eq('status', 'confirmed')

        if (bookings) {
          const keys = new Set(bookings.map((b: any) => `${b.coach_id}-${b.day}-${b.time_slot}`))
          setBookedKeys(keys)
        }
      }

      // Load coaches from Supabase
      const { data: dbCoaches } = await supabase
        .from('coaches')
        .select('*')
      if (dbCoaches && dbCoaches.length > 0) {
        setCoaches(
          dbCoaches.map((c: any) => ({
            id: c.id,
            name: c.name,
            specialization: c.specialization,
            bio: c.bio || '',
            level: c.level,
            rate: c.rate,
            initial: c.initial,
            availability: typeof c.availability === 'string' ? JSON.parse(c.availability) : c.availability,
          }))
        )
      }
      setCoachesLoading(false)
    }
    init()
  }, [])

  async function handleConfirmBooking() {
    if (!userId || !bookingConfirm) return
    setConfirming(true)

    const { coach, day, slot } = bookingConfirm

    const { error } = await supabase
      .from('coaching_bookings')
      .insert({
        user_id: userId,
        coach_id: coach.id,
        day: day,
        time_slot: slot,
        price: coach.rate,
        status: 'confirmed',
      })

    if (error) {
      showToast(error.code === '23505' ? 'You already booked this slot' : 'Failed to book session', 'error')
    } else {
      const key = `${coach.id}-${day}-${slot}`
      setBookedKeys(new Set([...bookedKeys, key]))
      showToast(`Session booked with ${coach.name}!`)
    }

    setBookingConfirm(null)
    setConfirming(false)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex justify-center overflow-y-auto">
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast((t) => ({ ...t, visible: false }))} />
      <div className="w-full max-w-[480px] min-h-screen relative pb-24 page-transition">
        {/* Header */}
        <div className="pt-12 pb-4 px-6">
          <div className="flex items-center gap-3 mb-1">
            {selectedCoach && (
              <button onClick={() => setSelectedCoach(null)} className="text-white/40 hover:text-white transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center" aria-label="Go back">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {selectedCoach ? 'Book a Session' : 'Coaching'}
              </h1>
              <p className="text-white/30 text-sm">
                {selectedCoach ? `Schedule with ${selectedCoach.name}` : 'Train with Karachi\'s top padel coaches'}
              </p>
            </div>
          </div>
        </div>

        {!selectedCoach ? (
          <div className="px-6 space-y-3">
            {coachesLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-2 border-[#00ff88] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : coaches.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5" className="text-white/15">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <p className="text-white/20 text-sm font-medium">No coaches available</p>
                <p className="text-white/10 text-xs mt-1">Check back later for coaching sessions</p>
              </div>
            ) : (
              coaches.map((coach) => (
                <CoachCard key={coach.id} coach={coach} onSelect={() => setSelectedCoach(coach)} />
              ))
            )}
          </div>
        ) : (
          <ScheduleView
            coach={selectedCoach}
            bookedKeys={bookedKeys}
            bookingSlot={bookingSlot}
            onBook={(day, slot) => setBookingConfirm({ coach: selectedCoach, day, slot })}
          />
        )}

        {/* Booking Confirmation Modal */}
        {bookingConfirm && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-end justify-center">
            <div className="w-full max-w-[480px] bg-[#111] rounded-t-3xl border-t border-white/10 p-6 space-y-4">
              <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-2" />
              <h3 className="text-lg font-bold">Confirm Session</h3>
              <div className="bg-white/5 rounded-xl p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-white/40 text-sm">Coach</span>
                  <span className="text-sm font-semibold">{bookingConfirm.coach.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40 text-sm">Day</span>
                  <span className="text-sm font-semibold">{bookingConfirm.day}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40 text-sm">Time</span>
                  <span className="text-sm font-semibold">{bookingConfirm.slot}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40 text-sm">Duration</span>
                  <span className="text-sm font-semibold">60 minutes</span>
                </div>
                <div className="flex justify-between border-t border-white/5 pt-2">
                  <span className="text-white/40 text-sm">Total</span>
                  <span className="text-sm font-bold text-[#00ff88]">PKR {bookingConfirm.coach.rate.toLocaleString()}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setBookingConfirm(null)}
                  disabled={confirming}
                  className="flex-1 py-3 bg-white/5 text-white/50 font-bold rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmBooking}
                  disabled={confirming}
                  className="flex-1 py-3 bg-[#00ff88] text-black font-bold rounded-xl text-sm disabled:opacity-50"
                >
                  {confirming ? 'Booking...' : 'Confirm Booking'}
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
