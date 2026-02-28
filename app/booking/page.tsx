'use client'
import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { hapticLight, hapticMedium, hapticSuccess, hapticSelectionChanged } from '@/lib/haptics'
import Image from 'next/image'
import Link from 'next/link'
import BottomNav from '@/app/components/BottomNav'
import Toast from '@/app/components/Toast'
import { CLUBS, type Club } from '@/lib/clubs'

type TimeSlot = {
  time: string
  available: boolean
  courtNumber: number
}

const ALL_TIMES = ['5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM']

function SlotSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="p-3 rounded-xl border border-white/5 bg-white/5 animate-pulse">
          <div className="h-4 w-16 bg-white/10 rounded mb-2" />
          <div className="h-3 w-12 bg-white/5 rounded" />
        </div>
      ))}
    </div>
  )
}

type BookingMode = 'court' | 'coach'

const COACHES_PREVIEW = [
  { id: 'nameer', name: 'Nameer Shamsi', specialization: 'Advanced Tactics & Strategy', level: 'Elite', rate: 8000, initial: 'NS' },
  { id: 'azhar', name: 'Azhar Katchi', specialization: 'Beginner & Intermediate Development', level: 'Pro', rate: 6000, initial: 'AK' },
  { id: 'farhan', name: 'Farhan Mustafa', specialization: 'Fitness & Power Game', level: 'Pro', rate: 7000, initial: 'FM' },
]

export default function BookingPage() {
  const [bookingMode, setBookingMode] = useState<BookingMode>('court')
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedClub, setSelectedClub] = useState<Club | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(false)
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set())
  const [confirmBooking, setConfirmBooking] = useState<TimeSlot | null>(null)
  const [confirming, setConfirming] = useState(false)
  const [toast, setToast] = useState({ visible: false, message: '', type: 'success' as 'success' | 'error' })

  const [dates, setDates] = useState<{ key: string; day: string; date: number; month: string }[]>([])

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ visible: true, message, type })
  }, [])

  useEffect(() => {
    const generated = Array.from({ length: 5 }).map((_, i) => {
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

    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setUserId(user.id)
    }
    init()
  }, [])

  const loadSlots = useCallback(async (club: Club, date: string) => {
    setSlotsLoading(true)
    const { data: bookings } = await supabase
      .from('court_bookings')
      .select('time_slot, court_number')
      .eq('club_id', club.id)
      .eq('date', date)
      .eq('status', 'confirmed')

    const bookedSet = new Set((bookings || []).map((b: any) => `${b.time_slot}-${b.court_number}`))

    const generated: TimeSlot[] = ALL_TIMES.map((time, i) => {
      const courtNumber = (i % club.courts) + 1
      const key = `${time}-${courtNumber}`
      return { time, courtNumber, available: !bookedSet.has(key) }
    })

    setSlots(generated)

    if (userId) {
      const { data: myBookings } = await supabase
        .from('court_bookings')
        .select('time_slot')
        .eq('club_id', club.id)
        .eq('date', date)
        .eq('user_id', userId)
        .eq('status', 'confirmed')

      if (myBookings) {
        setBookedSlots(new Set(myBookings.map((b: any) => b.time_slot)))
      }
    }
    setSlotsLoading(false)
  }, [userId])

  useEffect(() => {
    if (selectedClub && selectedDate) {
      loadSlots(selectedClub, selectedDate)
    }
  }, [selectedClub, selectedDate, loadSlots])

  // Real-time subscription for court bookings
  useEffect(() => {
    if (!selectedClub) return

    const channel = supabase
      .channel('bookings-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'court_bookings' }, () => {
        if (selectedClub && selectedDate) {
          loadSlots(selectedClub, selectedDate)
        }
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selectedClub, selectedDate, loadSlots])

  async function handleConfirmBooking() {
    if (!userId || !confirmBooking || !selectedClub) {
      showToast('Please sign in to book', 'error')
      return
    }
    setConfirming(true)
    hapticMedium()

    const { error } = await supabase
      .from('court_bookings')
      .insert({
        user_id: userId,
        club_id: selectedClub.id,
        club_name: selectedClub.name,
        date: selectedDate,
        time_slot: confirmBooking.time,
        court_number: confirmBooking.courtNumber,
        price: selectedClub.pricePerHour,
        status: 'confirmed',
      })

    if (error) {
      if (error.code === '23505') {
        showToast('This slot is already booked', 'error')
      } else {
        showToast('Failed to book court', 'error')
      }
    } else {
      // Post to activity feed
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: profile } = await supabase.from('applications').select('full_name').eq('id', user.id).single()
        const name = profile?.full_name || 'A player'
        await supabase.from('activity_feed').insert({
          user_id: user.id,
          type: 'booking',
          title: `${name} booked Court ${confirmBooking.courtNumber}`,
          description: `${selectedClub.name} · ${selectedDate} · ${confirmBooking.time}`,
          metadata: { club_id: selectedClub.id, venue: selectedClub.name, court: confirmBooking.courtNumber },
        }).then(() => {})
      }

      setBookedSlots(new Set([...bookedSlots, confirmBooking.time]))
      hapticSuccess()
      showToast(`Court booked at ${selectedClub.name}!`)
      await loadSlots(selectedClub, selectedDate)
    }

    setConfirmBooking(null)
    setConfirming(false)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex justify-center overflow-y-auto">
      <Toast message={toast.message} type={toast.type} visible={toast.visible} onClose={() => setToast((t) => ({ ...t, visible: false }))} />
      <div className="w-full max-w-[480px] min-h-screen relative pb-24">
        {/* Header */}
        <motion.div className="pt-[max(3rem,env(safe-area-inset-top))] pb-4 px-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: 'spring' as const, stiffness: 300, damping: 30 }}>
          <div className="flex items-center gap-3 mb-1">
            {selectedClub && (
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => { setSelectedClub(null); setBookedSlots(new Set()); setConfirmBooking(null); hapticLight() }}
                className="text-white/40 hover:text-white transition-colors"
              >
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </motion.button>
            )}
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {selectedClub ? selectedClub.name : 'Book'}
              </h1>
              <p className="text-white/30 text-sm">
                {selectedClub ? selectedClub.location : 'Courts & coaching sessions'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Mode Toggle — Court / Coach */}
        {!selectedClub && (
          <div className="px-6 mb-5">
            <div className="flex bg-white/5 rounded-xl p-1 gap-1">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => { setBookingMode('court'); hapticLight() }}
                className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                  bookingMode === 'court' ? 'bg-[#00ff88] text-black' : 'text-white/40'
                }`}
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Courts
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => { setBookingMode('coach'); hapticLight() }}
                className={`flex-1 py-2.5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-colors flex items-center justify-center gap-1.5 ${
                  bookingMode === 'coach' ? 'bg-[#00ff88] text-black' : 'text-white/40'
                }`}
              >
                <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Coach
              </motion.button>
            </div>
          </div>
        )}

        <AnimatePresence mode="wait">
          {/* Coach Mode */}
          {!selectedClub && bookingMode === 'coach' ? (
            <motion.div
              key="coaches"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="px-6 space-y-3"
            >
              <p className="text-xs text-white/30 mb-1">Train with Karachi&apos;s top padel coaches</p>
              {COACHES_PREVIEW.map((coach, i) => (
                <motion.div
                  key={coach.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 30 }}
                >
                  <Link href="/coaching">
                    <motion.div
                      whileTap={{ scale: 0.97 }}
                      className="bg-[#111] rounded-2xl border border-white/5 p-5 hover:border-[#00ff88]/20 transition-colors group"
                    >
                      <div className="flex gap-4">
                        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#1a1a2e] to-[#16213e] border border-white/10 flex items-center justify-center shrink-0 group-hover:border-[#00ff88]/30 transition-colors">
                          <span className="text-sm font-bold text-white/50">{coach.initial}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div>
                              <h3 className="text-sm font-bold group-hover:text-[#00ff88] transition-colors">{coach.name}</h3>
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
                    </motion.div>
                  </Link>
                </motion.div>
              ))}

              <Link href="/coaching">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  className="w-full mt-2 py-3 bg-white/5 border border-white/5 text-white/40 font-bold rounded-xl text-xs uppercase tracking-wider hover:border-white/10 transition-colors"
                >
                  View All Coaches & Schedules
                </motion.button>
              </Link>
            </motion.div>
          ) : !selectedClub ? (
            <motion.div
              key="clubs"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="px-6 space-y-3"
            >
              {CLUBS.map((club, i) => (
                <motion.button
                  key={club.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, type: 'spring', stiffness: 300, damping: 30 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { setSelectedClub(club); hapticLight() }}
                  className="w-full bg-[#111] rounded-2xl border border-white/5 p-5 text-left hover:border-[#00ff88]/20 transition-colors group"
                >
                  {/* Venue Image */}
                  <div className="relative w-full aspect-[2.2/1] rounded-xl overflow-hidden mb-3">
                    <Image
                      src={club.imageUrl}
                      alt={club.name}
                      fill
                      sizes="(max-width: 480px) 100vw, 480px"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="text-sm font-bold group-hover:text-[#00ff88] transition-colors">{club.name}</h3>
                      <p className="text-white/50 text-xs mt-0.5">{club.location}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-white/20 font-medium bg-white/5 px-2 py-0.5 rounded">
                        {club.courts} courts
                      </span>
                      <span className="text-[10px] text-[#00ff88]/70 font-semibold">
                        PKR {club.pricePerHour.toLocaleString()}/hr
                      </span>
                    </div>
                    <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.2)" strokeWidth="2">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          ) : (
            <motion.div
              key="slots"
              initial={{ opacity: 0, x: 40 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            >
              {/* Date Picker */}
              <div className="px-6 mb-5">
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                  {dates.map((d) => (
                    <motion.button
                      key={d.key}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => { setSelectedDate(d.key); hapticLight() }}
                      className={`flex flex-col items-center py-3 px-4 rounded-xl border transition-colors min-w-[64px] ${
                        selectedDate === d.key
                          ? 'bg-[#00ff88] text-black border-[#00ff88]'
                          : 'bg-white/5 border-white/5 text-white/50 hover:border-white/10'
                      }`}
                    >
                      <span className="text-[10px] font-semibold uppercase">{d.day}</span>
                      <span className="text-lg font-bold">{d.date}</span>
                      <span className="text-[10px] font-medium">{d.month}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Time Slots — smooth expand */}
              <div className="px-6">
                <h3 className="text-xs uppercase font-bold tracking-wider text-white/30 mb-3">Available Slots</h3>
                <AnimatePresence mode="wait">
                  {slotsLoading ? (
                    <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      <SlotSkeleton />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="slots-grid"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      className="grid grid-cols-2 gap-2 overflow-hidden"
                    >
                      {slots.map((slot, i) => {
                        const isMyBooking = bookedSlots.has(slot.time)
                        return (
                          <motion.button
                            key={slot.time}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: i * 0.04, type: 'spring', stiffness: 300, damping: 25 }}
                            whileTap={{ scale: 0.95 }}
                            disabled={!slot.available && !isMyBooking}
                            onClick={() => {
                              if (slot.available && !isMyBooking) {
                                setConfirmBooking(slot)
                                hapticSelectionChanged()
                              }
                            }}
                            className={`p-3 rounded-xl border text-left transition-colors ${
                              isMyBooking
                                ? 'bg-[#00ff88]/10 border-[#00ff88]/30'
                                : slot.available
                                ? 'bg-white/5 border-white/5 hover:border-[#00ff88]/20'
                                : 'bg-white/[0.02] border-white/[0.03] opacity-40 cursor-not-allowed'
                            }`}
                          >
                            <span className={`text-sm font-bold block ${isMyBooking ? 'text-[#00ff88]' : slot.available ? 'text-white' : 'text-white/30'}`}>
                              {slot.time}
                            </span>
                            <span className="text-[10px] text-white/20 font-medium">Court {slot.courtNumber}</span>
                            {isMyBooking && <span className="text-[9px] text-[#00ff88] font-bold block mt-1">BOOKED ✓</span>}
                            {!slot.available && !isMyBooking && <span className="text-[9px] text-white/20 font-medium block mt-1">Taken</span>}
                          </motion.button>
                        )
                      })}
                    </motion.div>
                  )}
                </AnimatePresence>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2, type: 'spring', stiffness: 300, damping: 30 }}
                  className="mt-6 bg-[#111] rounded-2xl border border-white/5 p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold">{selectedClub.name}</p>
                      <p className="text-[10px] text-white/30 mt-0.5">{selectedClub.courts} courts available</p>
                    </div>
                    <span className="text-sm font-bold text-[#00ff88]">
                      PKR {selectedClub.pricePerHour.toLocaleString()}
                      <span className="text-white/30 text-[10px] font-normal">/hr</span>
                    </span>
                  </div>
                </motion.div>
              </div>

              {/* Confirmation Modal */}
              <AnimatePresence>
                {confirmBooking && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-end justify-center"
                  >
                    <motion.div
                      initial={{ y: '100%' }}
                      animate={{ y: 0 }}
                      exit={{ y: '100%' }}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                      className="w-full max-w-[480px] bg-[#111] rounded-t-3xl border-t border-white/10 p-6 space-y-4"
                    >
                      <div className="w-10 h-1 bg-white/10 rounded-full mx-auto mb-2" />
                      <h3 className="text-lg font-bold">Confirm Booking</h3>
                      <div className="bg-white/5 rounded-xl p-4 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-white/40 text-sm">Venue</span>
                          <span className="text-sm font-semibold">{selectedClub.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/40 text-sm">Date</span>
                          <span className="text-sm font-semibold">{selectedDate}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/40 text-sm">Time</span>
                          <span className="text-sm font-semibold">{confirmBooking.time}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-white/40 text-sm">Court</span>
                          <span className="text-sm font-semibold">Court {confirmBooking.courtNumber}</span>
                        </div>
                        <div className="flex justify-between border-t border-white/5 pt-2">
                          <span className="text-white/40 text-sm">Total</span>
                          <span className="text-sm font-bold text-[#00ff88]">PKR {selectedClub.pricePerHour.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => { setConfirmBooking(null); hapticLight() }}
                          disabled={confirming}
                          className="flex-1 py-3 bg-white/5 text-white/50 font-bold rounded-xl text-sm"
                        >
                          Cancel
                        </motion.button>
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={handleConfirmBooking}
                          disabled={confirming}
                          className="flex-1 py-3 bg-[#00ff88] text-black font-bold rounded-xl text-sm disabled:opacity-50"
                        >
                          {confirming ? 'Booking...' : 'Book Now'}
                        </motion.button>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <BottomNav />
    </div>
  )
}
