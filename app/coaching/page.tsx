'use client'
import { useState } from 'react'
import BottomNav from '@/app/components/BottomNav'

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

const COACHES: Coach[] = [
  {
    id: 'nameer',
    name: 'Nameer Shamsi',
    specialization: 'Advanced Tactics & Strategy',
    bio: 'Former national-level player with 10+ years of coaching experience. Specializes in advanced shot placement, wall play, and competitive match strategy.',
    level: 'Elite',
    rate: 8000,
    initial: 'NS',
    availability: [
      { day: 'Mon', slots: ['5:00 PM', '6:00 PM', '7:00 PM'] },
      { day: 'Wed', slots: ['5:00 PM', '6:00 PM'] },
      { day: 'Fri', slots: ['4:00 PM', '5:00 PM', '6:00 PM'] },
      { day: 'Sat', slots: ['10:00 AM', '11:00 AM', '4:00 PM'] },
    ],
  },
  {
    id: 'azhar',
    name: 'Azhar Katchi',
    specialization: 'Beginner & Intermediate Development',
    bio: 'Certified padel instructor focused on building strong fundamentals. Perfect for new players looking to develop proper technique and court awareness.',
    level: 'Pro',
    rate: 6000,
    initial: 'AK',
    availability: [
      { day: 'Tue', slots: ['6:00 PM', '7:00 PM', '8:00 PM'] },
      { day: 'Thu', slots: ['5:00 PM', '6:00 PM', '7:00 PM'] },
      { day: 'Sat', slots: ['9:00 AM', '10:00 AM', '11:00 AM'] },
    ],
  },
  {
    id: 'farhan',
    name: 'Farhan Mustafa',
    specialization: 'Fitness & Power Game',
    bio: 'Combines physical conditioning with padel training. Specializes in building explosive power, endurance, and an aggressive playing style.',
    level: 'Pro',
    rate: 7000,
    initial: 'FM',
    availability: [
      { day: 'Mon', slots: ['7:00 PM', '8:00 PM'] },
      { day: 'Wed', slots: ['6:00 PM', '7:00 PM', '8:00 PM'] },
      { day: 'Fri', slots: ['5:00 PM', '6:00 PM'] },
      { day: 'Sun', slots: ['10:00 AM', '11:00 AM', '12:00 PM'] },
    ],
  },
]

function CoachCard({ coach, onSelect }: { coach: Coach; onSelect: () => void }) {
  return (
    <div className="bg-[#111] rounded-2xl border border-white/5 overflow-hidden hover:border-white/10 transition-all">
      <div className="p-5">
        <div className="flex gap-4">
          {/* Avatar */}
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

        {/* Next available slots preview */}
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

function ScheduleView({ coach, onBack, onBook }: { coach: Coach; onBack: () => void; onBook: (day: string, slot: string) => void }) {
  const [selectedDay, setSelectedDay] = useState(coach.availability[0]?.day || '')
  const daySlots = coach.availability.find((a) => a.day === selectedDay)?.slots || []

  return (
    <div>
      {/* Coach header */}
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

      {/* Day tabs */}
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

      {/* Time slots */}
      <div className="px-6">
        <h3 className="text-xs uppercase font-bold tracking-wider text-white/30 mb-3">
          {selectedDay} — Available Sessions
        </h3>
        <div className="space-y-2">
          {daySlots.map((slot) => (
            <div key={slot} className="flex items-center justify-between bg-[#111] rounded-xl border border-white/5 p-4 hover:border-white/10 transition-all">
              <div>
                <span className="text-sm font-bold">{slot}</span>
                <span className="text-[10px] text-white/20 font-medium ml-2">60 min session</span>
              </div>
              <button
                onClick={() => onBook(selectedDay, slot)}
                className="px-4 py-2 bg-[#00ff88] text-black font-bold rounded-lg text-[11px] uppercase tracking-wider hover:bg-[#00ff88]/90 transition-all"
              >
                Book
              </button>
            </div>
          ))}
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
  const [selectedCoach, setSelectedCoach] = useState<Coach | null>(null)
  const [bookingConfirm, setBookingConfirm] = useState<{ coach: Coach; day: string; slot: string } | null>(null)
  const [bookedSessions, setBookedSessions] = useState<string[]>([])

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex justify-center">
      <div className="w-full max-w-[480px] min-h-screen relative pb-24">
        {/* Header */}
        <div className="pt-12 pb-4 px-6">
          <div className="flex items-center gap-3 mb-1">
            {selectedCoach && (
              <button onClick={() => setSelectedCoach(null)} className="text-white/40 hover:text-white transition-colors">
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
          /* ─── Coach Cards ─── */
          <div className="px-6 space-y-3">
            {COACHES.map((coach) => (
              <CoachCard key={coach.id} coach={coach} onSelect={() => setSelectedCoach(coach)} />
            ))}
          </div>
        ) : (
          /* ─── Schedule View ─── */
          <ScheduleView
            coach={selectedCoach}
            onBack={() => setSelectedCoach(null)}
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
                  className="flex-1 py-3 bg-white/5 text-white/50 font-bold rounded-xl text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const key = `${bookingConfirm.coach.id}-${bookingConfirm.day}-${bookingConfirm.slot}`
                    setBookedSessions([...bookedSessions, key])
                    setBookingConfirm(null)
                  }}
                  className="flex-1 py-3 bg-[#00ff88] text-black font-bold rounded-xl text-sm"
                >
                  Confirm Booking
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
