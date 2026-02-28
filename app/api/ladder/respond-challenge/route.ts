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

    const { challenge_id, action } = await req.json()

    if (!challenge_id || !action || !['accept', 'decline'].includes(action)) {
      return NextResponse.json({ error: 'Missing challenge_id or invalid action' }, { status: 400 })
    }

    // Fetch challenge
    const { data: challenge, error: chErr } = await supabase
      .from('ladder_challenges')
      .select('*')
      .eq('id', challenge_id)
      .single()

    if (chErr || !challenge) {
      return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    }

    if (challenge.status !== 'pending') {
      return NextResponse.json({ error: 'Challenge is not pending' }, { status: 400 })
    }

    // Verify user is on the defender team
    const { data: defenderTeam } = await supabase
      .from('ladder_teams')
      .select('*')
      .eq('id', challenge.defender_team_id)
      .single()

    if (!defenderTeam || (defenderTeam.player1_id !== user.id && defenderTeam.player2_id !== user.id)) {
      return NextResponse.json({ error: 'Only the defending team can respond' }, { status: 403 })
    }

    if (action === 'accept') {
      await supabase
        .from('ladder_challenges')
        .update({ status: 'accepted' })
        .eq('id', challenge_id)

      return NextResponse.json({ success: true, status: 'accepted' })
    }

    // Decline: reset both teams to active
    await supabase
      .from('ladder_challenges')
      .update({ status: 'declined' })
      .eq('id', challenge_id)

    await supabase
      .from('ladder_teams')
      .update({ status: 'active' })
      .eq('id', challenge.challenger_team_id)

    await supabase
      .from('ladder_teams')
      .update({ status: 'active' })
      .eq('id', challenge.defender_team_id)

    return NextResponse.json({ success: true, status: 'declined' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
