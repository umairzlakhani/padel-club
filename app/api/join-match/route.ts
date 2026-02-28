import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const { match_id, player_id } = await req.json()

    if (!match_id || !player_id) {
      return NextResponse.json({ error: 'Missing match_id or player_id' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Verify match exists and is open
    const { data: match, error: matchErr } = await supabase
      .from('matches')
      .select('id, status, current_players, max_players, skill_min, skill_max')
      .eq('id', match_id)
      .single()

    if (matchErr || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    if (match.status !== 'open') {
      return NextResponse.json({ error: 'Match is not open' }, { status: 400 })
    }

    // Check player skill bracket
    const { data: player } = await supabase
      .from('applications')
      .select('skill_level')
      .eq('id', player_id)
      .single()

    if (player && match.skill_min != null && match.skill_max != null) {
      const skill = player.skill_level || 0
      if (skill < match.skill_min || skill > match.skill_max) {
        return NextResponse.json(
          { error: `Your skill level (${skill.toFixed(1)}) is outside this match's bracket (${match.skill_min}–${match.skill_max})` },
          { status: 403 }
        )
      }
    }

    // Check if player already has a request
    const { data: existing } = await supabase
      .from('match_players')
      .select('id, status')
      .eq('match_id', match_id)
      .eq('player_id', player_id)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Already requested', status: existing.status }, { status: 409 })
    }

    // Insert join request
    const { error: insertErr } = await supabase
      .from('match_players')
      .insert({ match_id, player_id, status: 'pending' })

    if (insertErr) {
      console.error('Join match insert error:', insertErr)
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    // Verify it was inserted
    const { data: verify } = await supabase
      .from('match_players')
      .select('id')
      .eq('match_id', match_id)
      .eq('player_id', player_id)
      .single()

    if (!verify) {
      return NextResponse.json({ error: 'Insert failed - row not found after insert' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('Join match error:', err)
    return NextResponse.json({ error: err.message || 'Unknown error' }, { status: 500 })
  }
}
