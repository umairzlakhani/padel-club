'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function ApplyPage() {
  const [formData, setFormData] = useState({
    full_name: '',
    whatsapp_number: '',
    email: '',
    skill_level: 2.5,
    playing_hand: 'Right'
  })
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    
    const { error } = await supabase.from('applications').insert([
      { 
        full_name: formData.full_name,
        whatsapp_number: formData.whatsapp_number,
        email: formData.email,
        skill_level: formData.skill_level,
        playing_hand: formData.playing_hand,
        status: 'pending' 
      }
    ])

    if (!error) {
      alert("Application Sent! Welcome to the Circuit.")
      router.push('/login')
    } else {
      console.error(error)
      alert("Error: " + error.message)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white flex items-center justify-center p-6 font-sans">
      <div className="max-w-md w-full bg-[#111111] rounded-[40px] border border-white/5 p-10 shadow-2xl">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black italic uppercase tracking-tighter">Join the Club</h2>
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

          <button type="submit" disabled={loading} className="w-full mt-4 py-5 bg-[#00ff88] text-black font-black rounded-2xl uppercase tracking-widest text-xs hover:shadow-[0_0_20px_rgba(0,255,136,0.2)] transition-all disabled:opacity-50">
            {loading ? 'PROCESSING...' : 'Submit Application'}
          </button>
        </form>
      </div>
    </div>
  )
}
