'use client'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import BottomNav from '@/app/components/BottomNav'

type Club = {
  id: string
  name: string
  location: string
  courts: number
  pricePerHour: number
  image: string
}

type TimeSlot = {
  time: string
  available: boolean
  courtNumber: number
}

const CLUBS: Club[] = [
  { id: 'legends', name: 'Legends Arena', location: 'DHA Phase 6', courts: 4, pricePerHour: 5000, image: '🏟️' },
  { id: 'viva', name: 'Viva Padel', location: 'Clifton Block 5', courts: 3, pricePerHour: 4500, image: '🎾' },
  { id: 'padelverse', name: 'Padelverse', location: 'Bukhari Commercial', courts: 2, pricePerHour: 4000, image: '🏸' },
  { id: 'greenwich', name: 'Greenwich Padel', location: 'DHA Phase 8', courts: 3, pricePerHour: 5500, image: '🌿' },
]

function generateSlots(clubId: string): TimeSlot[] {
  const times = ['5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM']
  // Deterministic pseudo-random availability based on club + time
  return times.map((time, i) => ({
    time,
    available: !((clubId.charCodeAt(0) + i) % 3 === 0),
    courtNumber: (i % 3) + 1,
  }))
}

export default function BookingPage() {
  const [selectedClub, setSelectedClub] = useState<Club | null>(null)
  const [selectedDate, setSelectedDate] = useState<string>('')
  const [slots, setSlots] = useState<TimeSlot[]>([])
  const [bookedSlot, setBookedSlot] = useState<string | null>(null)
  const [confirmBooking, setConfirmBooking] = useState<TimeSlot | null>(null)

  // Generate next 5 days
  const dates = Array.from({ length: 5 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return {
      key: d.toISOString().split('T')[0],
      day: d.toLocaleDateString('en-US', { weekday: 'short' }),
      date: d.getDate(),
      month: d.toLocaleDateString('en-US', { month: 'short' }),
    }
  })

  useEffect(() => {
    if (!selectedDate && dates.length > 0) {
      setSelectedDate(dates[0].key)
    }
  }, [])

  useEffect(() => {
    if (selectedClub) {
      // Try loading from Supabase bookings table
      async function loadSlots() {
        const { data, error } = await supabase
          .from('bookings')
          .select('*')
          .eq('club_id', selectedClub!.id)
          .eq('date', selectedDate)
        if (error || !data || data.length === 0) {
          // Fall back to generated mock slots
          setSlots(generateSlots(selectedClub!.id))
        }
      }
      loadSlots()
    }
  }, [selectedClub, selectedDate])

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex justify-center">
      <div className="w-full max-w-[480px] min-h-screen relative pb-24">
        {/* Header */}
        <div className="pt-12 pb-4 px-6">
          <div className="flex items-center gap-3 mb-1">
            {selectedClub && (
              <button onClick={() => { setSelectedClub(null); setBookedSlot(null); setConfirmBooking(null) }} className="text-white/40 hover:text-white transition-colors">
                <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {selectedClub ? selectedClub.name : 'Book a Court'}
              </h1>
              <p className="text-white/30 text-sm">
                {selectedClub ? selectedClub.location : 'Choose from our partner clubs'}
              </p>
            </div>
          </div>
        </div>

        {!selectedClub ? (
          /* ─── Club Selection ─── */
          <div className="px-6 space-y-3">
            {CLUBS.map((club) => (
              <button
                key={club.id}
                onClick={() => setSelectedClub(club)}
                className="w-full bg-[#111] rounded-2xl border border-white/5 p-5 text-left hover:border-[#00ff88]/20 transition-all group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-white/5 rounded-xl flex items-center justify-center text-2xl group-hover:bg-[#00ff88]/10 transition-all">
                    {club.image}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold group-hover:text-[#00ff88] transition-colors">{club.name}</h3>
                    <p className="text-white/30 text-xs mt-0.5">{club.location}</p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className="text-[10px] text-white/20 font-medium bg-white/5 px-2 py-0.5 rounded">
                        {club.courts} courts
                      </span>
                      <span className="text-[10px] text-[#00ff88]/70 font-semibold">
                        PKR {club.pricePerHour.toLocaleString()}/hr
                      </span>
                    </div>
                  </div>
                  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="rgba(255,255,255,0.2)" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        ) : (
          /* ─── Date + Slot Selection ─── */
          <div>
            {/* Date Picker */}
            <div className="px-6 mb-5">
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                {dates.map((d) => (
                  <button
                    key={d.key}
                    onClick={() => setSelectedDate(d.key)}
                    className={`flex flex-col items-center py-3 px-4 rounded-xl border transition-all min-w-[64px] ${
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

            {/* Time Slots */}
            <div className="px-6">
              <h3 className="text-xs uppercase font-bold tracking-wider text-white/30 mb-3">Available Slots</h3>
              <div className="grid grid-cols-2 gap-2">
                {slots.map((slot) => {
                  const isBooked = bookedSlot === slot.time
                  return (
                    <button
                      key={slot.time}
                      disabled={!slot.available}
                      onClick={() => {
                        if (slot.available && !isBooked) setConfirmBooking(slot)
                      }}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        isBooked
                          ? 'bg-[#00ff88]/10 border-[#00ff88]/30'
                          : slot.available
                          ? 'bg-white/5 border-white/5 hover:border-[#00ff88]/20'
                          : 'bg-white/[0.02] border-white/[0.03] opacity-40 cursor-not-allowed'
                      }`}
                    >
                      <span className={`text-sm font-bold block ${isBooked ? 'text-[#00ff88]' : slot.available ? 'text-white' : 'text-white/30'}`}>
                        {slot.time}
                      </span>
                      <span className="text-[10px] text-white/20 font-medium">Court {slot.courtNumber}</span>
                      {isBooked && <span className="text-[9px] text-[#00ff88] font-bold block mt-1">BOOKED ✓</span>}
                      {!slot.available && !isBooked && <span className="text-[9px] text-white/20 font-medium block mt-1">Taken</span>}
                    </button>
                  )
                })}
              </div>

              {/* Club info */}
              <div className="mt-6 bg-[#111] rounded-2xl border border-white/5 p-4">
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
              </div>
            </div>

            {/* Confirmation Modal */}
            {confirmBooking && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[100] flex items-end justify-center">
                <div className="w-full max-w-[480px] bg-[#111] rounded-t-3xl border-t border-white/10 p-6 space-y-4">
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
                    <button
                      onClick={() => setConfirmBooking(null)}
                      className="flex-1 py-3 bg-white/5 text-white/50 font-bold rounded-xl text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        setBookedSlot(confirmBooking.time)
                        setConfirmBooking(null)
                      }}
                      className="flex-1 py-3 bg-[#00ff88] text-black font-bold rounded-xl text-sm"
                    >
                      Book Now
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <BottomNav />
    </div>
  )
}
