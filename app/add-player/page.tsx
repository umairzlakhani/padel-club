'use client'
import { useState } from 'react'
import Link from 'next/link'
import BottomNav from '@/app/components/BottomNav'

const CONTACTS = [
  { name: 'Ahmed Khan', phone: '+92 300 1234567', initials: 'AK' },
  { name: 'Bilal Shaikh', phone: '+92 321 9876543', initials: 'BS' },
  { name: 'Danish Raza', phone: '+92 333 4567890', initials: 'DR' },
  { name: 'Faizan Ali', phone: '+92 312 3456789', initials: 'FA' },
  { name: 'Hassan Malik', phone: '+92 345 6789012', initials: 'HM' },
  { name: 'Kamran Javed', phone: '+92 301 2345678', initials: 'KJ' },
  { name: 'Omar Farooq', phone: '+92 322 8765432', initials: 'OF' },
  { name: 'Saad Hussain', phone: '+92 311 5678901', initials: 'SH' },
  { name: 'Tariq Mehmood', phone: '+92 334 7890123', initials: 'TM' },
  { name: 'Zain Ul Abidin', phone: '+92 303 6543210', initials: 'ZA' },
]

export default function AddPlayerPage() {
  const [search, setSearch] = useState('')
  const [invited, setInvited] = useState<Set<string>>(new Set())

  const filtered = CONTACTS.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  )

  function handleInvite(name: string) {
    setInvited((prev) => new Set(prev).add(name))
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans flex justify-center">
      <div className="w-full max-w-[480px] min-h-screen relative pb-24">
        {/* Header */}
        <div className="pt-12 pb-4 px-6">
          <div className="flex items-center gap-3 mb-1">
            <Link href="/dashboard" className="text-white/40 hover:text-white transition-colors">
              <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Add Player</h1>
              <p className="text-white/30 text-sm">Invite friends to Match Day</p>
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="px-6 mb-4">
          <div className="relative">
            <svg
              className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30"
              width="18"
              height="18"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name or number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white/5 border border-white/5 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#00ff88]/30 transition-colors"
            />
          </div>
        </div>

        {/* Contact List */}
        <div className="px-6">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <div className="text-white/10 text-5xl mb-4">?</div>
              <p className="text-white/30 text-sm">No contacts found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((contact) => {
                const isInvited = invited.has(contact.name)
                return (
                  <div
                    key={contact.name}
                    className="flex items-center gap-3 p-3 rounded-xl bg-[#111] border border-white/5"
                  >
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-xs font-bold text-white/50 shrink-0">
                      {contact.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{contact.name}</p>
                      <p className="text-[11px] text-white/30">{contact.phone}</p>
                    </div>
                    <button
                      onClick={() => handleInvite(contact.name)}
                      disabled={isInvited}
                      className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                        isInvited
                          ? 'bg-[#00ff88]/10 text-[#00ff88] cursor-default'
                          : 'bg-[#00ff88] text-black hover:bg-[#00ff88]/90'
                      }`}
                    >
                      {isInvited ? 'Invited' : 'Invite'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  )
}
