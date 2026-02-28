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

    const { partner_id } = await req.json()

    if (!partner_id) {
      return NextResponse.json({ error: 'Missing partner_id' }, { status: 400 })
    }

    if (partner_id === user.id) {
      return NextResponse.json({ error: 'Cannot partner with yourself' }, { status: 400 })
    }

    // Validate both users are approved members
    const { data: members, error: membersErr } = await supabase
      .from('applications')
      .select('id, full_name, status')
      .in('id', [user.id, partner_id])

    if (membersErr || !members || members.length !== 2) {
      return NextResponse.json({ error: 'Both users must be approved members' }, { status: 400 })
    }

    const bothApproved = members.every((m: { status: string }) => m.status === 'approved')
    if (!bothApproved) {
      return NextResponse.json({ error: 'Both users must be approved members' }, { status: 400 })
    }

    // Check neither player is already on a ladder team
    const { data: existingTeams } = await supabase
      .from('ladder_teams')
      .select('id, player1_id, player2_id')
      .or(`player1_id.eq.${user.id},player2_id.eq.${user.id},player1_id.eq.${partner_id},player2_id.eq.${partner_id}`)

    if (existingTeams && existingTeams.length > 0) {
      return NextResponse.json({ error: 'One or both players are already on a ladder team' }, { status: 409 })
    }

    // Get next rank
    const { data: maxRankRow } = await supabase
      .from('ladder_teams')
      .select('rank')
      .order('rank', { ascending: false })
      .limit(1)
      .maybeSingle()

    const nextRank = (maxRankRow?.rank || 0) + 1

    // Build team name
    const player1 = members.find((m: { id: string }) => m.id === user.id)
    const player2 = members.find((m: { id: string }) => m.id === partner_id)
    const teamName = `${player1?.full_name?.split(' ')[0] || 'Player 1'} & ${player2?.full_name?.split(' ')[0] || 'Player 2'}`

    // Insert team
    const { data: team, error: insertErr } = await supabase
      .from('ladder_teams')
      .insert({
        rank: nextRank,
        player1_id: user.id,
        player2_id: partner_id,
        team_name: teamName,
      })
      .select()
      .single()

    if (insertErr) {
      console.error('Register team insert error:', insertErr)
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, team })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
