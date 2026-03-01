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

    if (!challenge_id || !action || !['rescind', 'forfeit'].includes(action)) {
      return NextResponse.json({ error: 'Missing challenge_id or invalid action (rescind/forfeit)' }, { status: 400 })
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

    if (challenge.status !== 'accepted') {
      return NextResponse.json({ error: 'Challenge is not active' }, { status: 400 })
    }

    // Fetch teams
    const { data: challengerTeam } = await supabase
      .from('ladder_teams')
      .select('*')
      .eq('id', challenge.challenger_team_id)
      .single()

    const { data: defenderTeam } = await supabase
      .from('ladder_teams')
      .select('*')
      .eq('id', challenge.defender_team_id)
      .single()

    if (!challengerTeam || !defenderTeam) {
      return NextResponse.json({ error: 'Teams not found' }, { status: 500 })
    }

    if (action === 'rescind') {
      // Only challenger can rescind
      if (challengerTeam.player1_id !== user.id && challengerTeam.player2_id !== user.id) {
        return NextResponse.json({ error: 'Only the challenging team can rescind' }, { status: 403 })
      }

      // Penalty: challenger drops 1 rank
      const currentRank = challengerTeam.rank
      const maxRank = Math.max(...(await supabase
        .from('ladder_teams')
        .select('rank')
        .then(r => (r.data || []).map((t: { rank: number }) => t.rank))), currentRank)

      if (currentRank < maxRank) {
        // Swap with team directly below
        const newRank = currentRank + 1
        await supabase
          .from('ladder_teams')
          .update({ rank: -1 })
          .eq('id', challengerTeam.id)

        await supabase
          .from('ladder_teams')
          .update({ rank: currentRank })
          .eq('rank', newRank)

        await supabase
          .from('ladder_teams')
          .update({ rank: newRank })
          .eq('id', challengerTeam.id)
      }

      // Cancel challenge, reset teams
      await supabase
        .from('ladder_challenges')
        .update({ status: 'declined' })
        .eq('id', challenge_id)

      await supabase.from('ladder_teams').update({ status: 'active' }).eq('id', challengerTeam.id)
      await supabase.from('ladder_teams').update({ status: 'active' }).eq('id', defenderTeam.id)

      return NextResponse.json({ success: true, status: 'rescinded', penalty: '-1 rank' })
    }

    // Forfeit: the forfeiting team loses (awarded 6-0 scores for unfinished sets)
    const isChallenger = challengerTeam.player1_id === user.id || challengerTeam.player2_id === user.id

    const forfeitScores = [{ team_a: isChallenger ? 0 : 6, team_b: isChallenger ? 6 : 0 }, { team_a: isChallenger ? 0 : 6, team_b: isChallenger ? 6 : 0 }]
    const result = isChallenger ? 'defender_won' : 'challenger_won'

    await supabase
      .from('ladder_challenges')
      .update({ status: 'completed', result, scores: forfeitScores, completed_at: new Date().toISOString() })
      .eq('id', challenge_id)

    // If challenger won by forfeit, do rank swap
    if (result === 'challenger_won') {
      const oldChallengerRank = challengerTeam.rank
      const oldDefenderRank = defenderTeam.rank

      await supabase.from('ladder_teams').update({ rank: -1 }).eq('id', challengerTeam.id)

      const { data: teamsToShift } = await supabase
        .from('ladder_teams')
        .select('id, rank')
        .gt('rank', oldDefenderRank)
        .lt('rank', oldChallengerRank)
        .order('rank', { ascending: false })

      if (teamsToShift) {
        for (const team of teamsToShift) {
          await supabase.from('ladder_teams').update({ rank: team.rank + 1 }).eq('id', team.id)
        }
      }

      await supabase.from('ladder_teams').update({ rank: oldDefenderRank + 1 }).eq('id', defenderTeam.id)
      await supabase.from('ladder_teams').update({ rank: oldDefenderRank }).eq('id', challengerTeam.id)

      await supabase.from('ladder_history').insert({
        challenge_id,
        challenger_team_id: challengerTeam.id,
        defender_team_id: defenderTeam.id,
        result,
        old_challenger_rank: oldChallengerRank,
        old_defender_rank: oldDefenderRank,
        new_challenger_rank: oldDefenderRank,
        new_defender_rank: oldDefenderRank + 1,
        scores: forfeitScores,
      })
    } else {
      // Defender won — no rank change, +3 points
      await supabase.from('ladder_teams').update({ points: (defenderTeam.points || 0) + 3 }).eq('id', defenderTeam.id)

      await supabase.from('ladder_history').insert({
        challenge_id,
        challenger_team_id: challengerTeam.id,
        defender_team_id: defenderTeam.id,
        result,
        old_challenger_rank: challengerTeam.rank,
        old_defender_rank: defenderTeam.rank,
        new_challenger_rank: challengerTeam.rank,
        new_defender_rank: defenderTeam.rank,
        scores: forfeitScores,
      })
    }

    // Update stats
    await supabase.from('ladder_teams').update({
      matches_played: (challengerTeam.matches_played || 0) + 1,
      matches_won: (challengerTeam.matches_won || 0) + (result === 'challenger_won' ? 1 : 0),
      status: 'active',
    }).eq('id', challengerTeam.id)

    await supabase.from('ladder_teams').update({
      matches_played: (defenderTeam.matches_played || 0) + 1,
      matches_won: (defenderTeam.matches_won || 0) + (result === 'defender_won' ? 1 : 0),
      status: 'active',
    }).eq('id', defenderTeam.id)

    return NextResponse.json({ success: true, status: 'forfeited', result })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
