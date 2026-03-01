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

    if (!challenge_id || !action || !['confirm', 'dispute'].includes(action)) {
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

    if (challenge.status !== 'pending_verification') {
      return NextResponse.json({ error: 'Challenge is not pending verification' }, { status: 400 })
    }

    // Fetch both teams
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

    // Verify user is a participant (but not the score submitter ideally — for now, any participant)
    const isParticipant =
      challengerTeam.player1_id === user.id || challengerTeam.player2_id === user.id ||
      defenderTeam.player1_id === user.id || defenderTeam.player2_id === user.id

    if (!isParticipant) {
      return NextResponse.json({ error: 'You are not a participant in this challenge' }, { status: 403 })
    }

    // Handle dispute
    if (action === 'dispute') {
      await supabase
        .from('ladder_challenges')
        .update({ status: 'disputed' })
        .eq('id', challenge_id)

      // Reset teams to active
      await supabase
        .from('ladder_teams')
        .update({ status: 'active' })
        .eq('id', challenge.challenger_team_id)

      await supabase
        .from('ladder_teams')
        .update({ status: 'active' })
        .eq('id', challenge.defender_team_id)

      return NextResponse.json({ success: true, status: 'disputed' })
    }

    // Handle confirm — execute rank swap
    const oldChallengerRank = challengerTeam.rank
    const oldDefenderRank = defenderTeam.rank

    let newChallengerRank: number
    let newDefenderRank: number

    if (challenge.result === 'challenger_won') {
      // Rank swap algorithm:
      // 1. Set challenger rank to -1 (temp, avoids unique constraint)
      await supabase
        .from('ladder_teams')
        .update({ rank: -1 })
        .eq('id', challengerTeam.id)

      // 2. Shift all teams ranked between defender and challenger down by 1 (bottom-up)
      // These are teams with rank > defenderRank AND rank < challengerRank
      const { data: teamsToShift } = await supabase
        .from('ladder_teams')
        .select('id, rank')
        .eq('club_id', challengerTeam.club_id)
        .eq('tier', challengerTeam.tier)
        .gt('rank', oldDefenderRank)
        .lt('rank', oldChallengerRank)
        .order('rank', { ascending: false })

      if (teamsToShift) {
        for (const team of teamsToShift) {
          await supabase
            .from('ladder_teams')
            .update({ rank: team.rank + 1 })
            .eq('id', team.id)
        }
      }

      // 3. Shift defender down by 1
      await supabase
        .from('ladder_teams')
        .update({ rank: oldDefenderRank + 1 })
        .eq('id', defenderTeam.id)

      // 4. Set challenger to defender's old rank
      await supabase
        .from('ladder_teams')
        .update({ rank: oldDefenderRank })
        .eq('id', challengerTeam.id)

      newChallengerRank = oldDefenderRank
      newDefenderRank = oldDefenderRank + 1

      // Points: +5 to challenger for winning
      await supabase
        .from('ladder_teams')
        .update({ points: (challengerTeam.points || 0) + 5 })
        .eq('id', challengerTeam.id)
    } else {
      // Defender wins: no rank change, +3 points to defender
      newChallengerRank = oldChallengerRank
      newDefenderRank = oldDefenderRank

      await supabase
        .from('ladder_teams')
        .update({ points: (defenderTeam.points || 0) + 3 })
        .eq('id', defenderTeam.id)
    }

    // Update match stats for both teams
    await supabase
      .from('ladder_teams')
      .update({
        matches_played: (challengerTeam.matches_played || 0) + 1,
        matches_won: (challengerTeam.matches_won || 0) + (challenge.result === 'challenger_won' ? 1 : 0),
      })
      .eq('id', challengerTeam.id)

    await supabase
      .from('ladder_teams')
      .update({
        matches_played: (defenderTeam.matches_played || 0) + 1,
        matches_won: (defenderTeam.matches_won || 0) + (challenge.result === 'defender_won' ? 1 : 0),
      })
      .eq('id', defenderTeam.id)

    // Mark challenge as completed
    await supabase
      .from('ladder_challenges')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', challenge_id)

    // Reset teams to active
    await supabase
      .from('ladder_teams')
      .update({ status: 'active' })
      .eq('id', challengerTeam.id)

    await supabase
      .from('ladder_teams')
      .update({ status: 'active' })
      .eq('id', defenderTeam.id)

    // Insert history record
    await supabase
      .from('ladder_history')
      .insert({
        challenge_id: challenge_id,
        challenger_team_id: challengerTeam.id,
        defender_team_id: defenderTeam.id,
        result: challenge.result,
        old_challenger_rank: oldChallengerRank,
        old_defender_rank: oldDefenderRank,
        new_challenger_rank: newChallengerRank,
        new_defender_rank: newDefenderRank,
        scores: challenge.scores,
        club_id: challengerTeam.club_id,
        tier: challengerTeam.tier,
      })

    return NextResponse.json({
      success: true,
      status: 'completed',
      result: challenge.result,
      new_ranks: {
        challenger: newChallengerRank,
        defender: newDefenderRank,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
