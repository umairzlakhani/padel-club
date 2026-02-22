'use client'

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const SLOTS = [
  '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM',
  '5:00 PM', '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM',
]

export type AvailabilityEntry = { day: string; slots: string[] }

interface AvailabilityPickerProps {
  value: AvailabilityEntry[]
  onChange: (value: AvailabilityEntry[]) => void
}

export default function AvailabilityPicker({ value, onChange }: AvailabilityPickerProps) {
  const activeDays = new Set(value.map((v) => v.day))

  function toggleDay(day: string) {
    if (activeDays.has(day)) {
      onChange(value.filter((v) => v.day !== day))
    } else {
      onChange([...value, { day, slots: [] }])
    }
  }

  function toggleSlot(day: string, slot: string) {
    onChange(
      value.map((v) => {
        if (v.day !== day) return v
        const has = v.slots.includes(slot)
        return {
          ...v,
          slots: has ? v.slots.filter((s) => s !== slot) : [...v.slots, slot],
        }
      })
    )
  }

  // Sort value by DAYS order for display
  const sorted = [...value].sort((a, b) => DAYS.indexOf(a.day) - DAYS.indexOf(b.day))

  return (
    <div className="space-y-3">
      {/* Day toggles */}
      <div className="flex flex-wrap gap-2">
        {DAYS.map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => toggleDay(day)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider border transition-all ${
              activeDays.has(day)
                ? 'bg-[#00ff88] text-black border-[#00ff88]'
                : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      {/* Slot grids per active day */}
      {sorted.map((entry) => (
        <div key={entry.day} className="bg-black/20 rounded-xl border border-white/5 p-3">
          <p className="text-[10px] uppercase font-bold text-[#00ff88] tracking-wider mb-2">{entry.day}</p>
          <div className="flex flex-wrap gap-1.5">
            {SLOTS.map((slot) => {
              const active = entry.slots.includes(slot)
              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => toggleSlot(entry.day, slot)}
                  className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border transition-all ${
                    active
                      ? 'bg-[#00ff88]/15 border-[#00ff88]/30 text-[#00ff88]'
                      : 'bg-white/5 border-white/5 text-white/30 hover:border-white/10'
                  }`}
                >
                  {slot}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
