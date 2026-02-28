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

    const { match_id, scores, teams } = await req.json()

    if (!match_id || !scores || !teams) {
      return NextResponse.json({ error: 'Missing match_id, scores, or teams' }, { status: 400 })
    }

    // Fetch match
    const { data: match, error: matchErr } = await supabase
      .from('matches')
      .select('*')
      .eq('id', match_id)
      .single()

    if (matchErr || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 })
    }

    // Validate host
    if (match.creator_id !== user.id) {
      return NextResponse.json({ error: 'Only the host can submit scores' }, { status: 403 })
    }

    // Validate match state
    if (match.status !== 'full') {
      return NextResponse.json({ error: 'Match must be full to submit scores' }, { status: 400 })
    }
    if (match.result_status) {
      return NextResponse.json({ error: 'Score already submitted' }, { status: 400 })
    }

    // Validate scores: 2-3 sets, non-negative integers
    if (!Array.isArray(scores) || scores.length < 2 || scores.length > 3) {
      return NextResponse.json({ error: 'Must have 2 or 3 sets' }, { status: 400 })
    }
    for (const set of scores) {
      if (typeof set.team_a !== 'number' || typeof set.team_b !== 'number' ||
          set.team_a < 0 || set.team_b < 0 ||
          !Number.isInteger(set.team_a) || !Number.isInteger(set.team_b)) {
        return NextResponse.json({ error: 'Invalid set scores' }, { status: 400 })
      }
    }

    // Validate a winner exists (one team wins majority of sets)
    const teamAWins = scores.filter((s: { team_a: number; team_b: number }) => s.team_a > s.team_b).length
    const teamBWins = scores.filter((s: { team_a: number; team_b: number }) => s.team_b > s.team_a).length
    if (teamAWins === teamBWins) {
      return NextResponse.json({ error: 'Must have a match winner' }, { status: 400 })
    }

    // Validate teams: each has exactly 2 players, all unique
    if (!teams.A || !teams.B || teams.A.length !== 2 || teams.B.length !== 2) {
      return NextResponse.json({ error: 'Each team must have exactly 2 players' }, { status: 400 })
    }
    const allPlayerIds = [...teams.A, ...teams.B]
    if (new Set(allPlayerIds).size !== 4) {
      return NextResponse.json({ error: 'All 4 players must be unique' }, { status: 400 })
    }

    // Validate all players are accepted in this match
    const { data: matchPlayers } = await supabase
      .from('match_players')
      .select('player_id, status')
      .eq('match_id', match_id)
      .eq('status', 'accepted')

    const acceptedIds = new Set((matchPlayers || []).map((p: { player_id: string }) => p.player_id))
    for (const pid of allPlayerIds) {
      if (!acceptedIds.has(pid)) {
        return NextResponse.json({ error: `Player ${pid} is not an accepted player` }, { status: 400 })
      }
    }

    // Update match_players team assignments
    for (const pid of teams.A) {
      await supabase.from('match_players').update({ team: 'A' }).eq('match_id', match_id).eq('player_id', pid)
    }
    for (const pid of teams.B) {
      await supabase.from('match_players').update({ team: 'B' }).eq('match_id', match_id).eq('player_id', pid)
    }

    // Update match with scores and result_status
    const { error: updateErr } = await supabase
      .from('matches')
      .update({
        result_status: 'pending_verification',
        scores,
        score_submitted_at: new Date().toISOString(),
      })
      .eq('id', match_id)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
