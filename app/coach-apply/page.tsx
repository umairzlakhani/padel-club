'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import AvailabilityPicker, { type AvailabilityEntry } from '@/app/components/AvailabilityPicker'

export default function CoachApplyPage() {
  const [formData, setFormData] = useState({
    full_name: '',
    whatsapp_number: '',
    email: '',
    password: '',
    confirmPassword: '',
    specialization: '',
    rate: '',
    level: 'Pro',
  })
  const [availability, setAvailability] = useState<AvailabilityEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (!formData.rate || isNaN(Number(formData.rate))) {
      setError('Please enter a valid hourly rate')
      return
    }

    setLoading(true)

    // 1. Create auth account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    })

    if (authError || !authData.user) {
      setError(authError?.message || 'Failed to create account')
      setLoading(false)
      return
    }

    // 2. Insert application with role: 'coach'
    const { error: insertError } = await supabase.from('applications').insert([
      {
        id: authData.user.id,
        full_name: formData.full_name,
        whatsapp_number: formData.whatsapp_number,
        email: formData.email,
        skill_level: 0,
        playing_hand: 'Right',
        status: 'pending',
        role: 'coach',
      }
    ])

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    // 3. Insert coach record
    const nameParts = formData.full_name.trim().split(/\s+/)
    const initial = nameParts.map((p) => p[0]?.toUpperCase() || '').join('')

    const { error: coachError } = await supabase.from('coaches').insert([
      {
        user_id: authData.user.id,
        name: formData.full_name,
        specialization: formData.specialization,
        rate: Number(formData.rate),
        level: formData.level,
        availability: availability,
        initial,
        bio: '',
      }
    ])

    if (coachError) {
      setError(coachError.message)
      setLoading(false)
      return
    }

    // Sign out so they start fresh on login
    await supabase.auth.signOut()

    alert('Coach application sent! Your account has been created. You can log in once approved.')
    router.push('/login')
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6 font-sans overflow-y-auto">
      <div className="max-w-md w-full bg-[#111111] rounded-[40px] border border-white/5 p-10 shadow-2xl my-8">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black italic uppercase tracking-tighter">Become a Coach</h2>
          <p className="text-[#00ff88] text-[10px] font-bold tracking-[0.3em] uppercase mt-2">Match Day — Karachi</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[10px] uppercase text-gray-500 font-bold ml-1">Full Name</label>
            <input required value={formData.full_name} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 outline-none focus:border-[#00ff88] transition-all"
              onChange={e => setFormData({...formData, full_name: e.target.value})} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase text-gray-500 font-bold ml-1">WhatsApp Number</label>
            <input required value={formData.whatsapp_number} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 outline-none focus:border-[#00ff88] transition-all"
              onChange={e => setFormData({...formData, whatsapp_number: e.target.value})} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase text-gray-500 font-bold ml-1">Email</label>
            <input type="email" required value={formData.email} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 outline-none focus:border-[#00ff88] transition-all"
              onChange={e => setFormData({...formData, email: e.target.value})} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase text-gray-500 font-bold ml-1">Password</label>
            <input type="password" required value={formData.password} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 outline-none focus:border-[#00ff88] transition-all"
              placeholder="Min 6 characters"
              onChange={e => setFormData({...formData, password: e.target.value})} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase text-gray-500 font-bold ml-1">Confirm Password</label>
            <input type="password" required value={formData.confirmPassword} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 outline-none focus:border-[#00ff88] transition-all"
              placeholder="Re-enter password"
              onChange={e => setFormData({...formData, confirmPassword: e.target.value})} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase text-gray-500 font-bold ml-1">Specialization</label>
            <input required value={formData.specialization} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 outline-none focus:border-[#00ff88] transition-all"
              placeholder="e.g. Advanced Tactics & Strategy"
              onChange={e => setFormData({...formData, specialization: e.target.value})} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase text-gray-500 font-bold ml-1">Hourly Rate (PKR)</label>
            <input type="number" required value={formData.rate} className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 outline-none focus:border-[#00ff88] transition-all"
              placeholder="e.g. 6000"
              onChange={e => setFormData({...formData, rate: e.target.value})} />
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase text-gray-500 font-bold ml-1">Level</label>
            <select
              value={formData.level}
              onChange={e => setFormData({...formData, level: e.target.value})}
              className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 outline-none focus:border-[#00ff88] transition-all appearance-none"
            >
              <option value="Elite">Elite</option>
              <option value="Pro">Pro</option>
              <option value="Intermediate">Intermediate</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] uppercase text-gray-500 font-bold ml-1">Availability</label>
            <AvailabilityPicker value={availability} onChange={setAvailability} />
          </div>

          {error && <p className="text-red-400 text-xs italic px-1">{error}</p>}

          <button type="submit" disabled={loading} className="w-full mt-4 py-5 bg-[#00ff88] text-black font-black rounded-2xl uppercase tracking-widest text-xs hover:shadow-[0_0_20px_rgba(0,255,136,0.2)] transition-all disabled:opacity-50">
            {loading ? 'PROCESSING...' : 'Submit Coach Application'}
          </button>
        </form>
      </div>
    </div>
  )
}
