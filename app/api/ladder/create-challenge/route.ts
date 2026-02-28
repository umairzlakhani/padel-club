import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const supabase = createClient(supabaseUrl, serviceRoleKey)

    // Auth
    const authHeader = req.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')
    if (!token) {
      return NextResponse.json({ error: 'Missing authorization token' }, { status: 401 })
    }

    const supabaseAuth = createClient(
      supabaseUrl,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token)
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 })
    }

    const { defender_team_id, scheduled_date, scheduled_time, venue } = await req.json()

    if (!defender_team_id) {
      return NextResponse.json({ error: 'Missing defender_team_id' }, { status: 400 })
    }

    // Find challenger's team
    const { data: challengerTeam, error: ctErr } = await supabase
      .from('ladder_teams')
      .select('*')
      .or(`player1_id.eq.${user.id},player2_id.eq.${user.id}`)
      .single()

    if (ctErr || !challengerTeam) {
      return NextResponse.json({ error: 'You are not on a ladder team' }, { status: 404 })
    }

    if (challengerTeam.status !== 'active') {
      return NextResponse.json({ error: 'Your team is already in a challenge' }, { status: 400 })
    }

    // Fetch defender team
    const { data: defenderTeam, error: dtErr } = await supabase
      .from('ladder_teams')
      .select('*')
      .eq('id', defender_team_id)
      .single()

    if (dtErr || !defenderTeam) {
      return NextResponse.json({ error: 'Defender team not found' }, { status: 404 })
    }

    if (defenderTeam.status !== 'active') {
      return NextResponse.json({ error: 'Defender team is already in a challenge' }, { status: 400 })
    }

    // Validate rank: challenger must be 1-3 ranks below defender (higher rank number = lower position)
    const rankDiff = challengerTeam.rank - defenderTeam.rank
    if (rankDiff < 1 || rankDiff > 3) {
      return NextResponse.json({ error: 'You can only challenge teams ranked 1-3 spots above you' }, { status: 400 })
    }

    // Create challenge
    const { data: challenge, error: insertErr } = await supabase
      .from('ladder_challenges')
      .insert({
        challenger_team_id: challengerTeam.id,
        defender_team_id: defenderTeam.id,
        challenger_rank: challengerTeam.rank,
        defender_rank: defenderTeam.rank,
        scheduled_date: scheduled_date || null,
        scheduled_time: scheduled_time || null,
        venue: venue || null,
      })
      .select()
      .single()

    if (insertErr) {
      console.error('Create challenge insert error:', insertErr)
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    // Update team statuses
    await supabase
      .from('ladder_teams')
      .update({ status: 'challenging' })
      .eq('id', challengerTeam.id)

    await supabase
      .from('ladder_teams')
      .update({ status: 'defending' })
      .eq('id', defenderTeam.id)

    return NextResponse.json({ success: true, challenge })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
