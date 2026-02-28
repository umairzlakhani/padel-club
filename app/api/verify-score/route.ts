import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type SetScore = { team_a: number; team_b: number }
type PlayerRating = { id: string; skill_level: number }

function computeRatingUpdates(
  teamA: PlayerRating[],
  teamB: PlayerRating[],
  scores: SetScore[]
): { playerId: string; newRating: number; won: boolean }[] {
  // Determine winner
  const teamASetWins = scores.filter(s => s.team_a > s.team_b).length
  const teamBSetWins = scores.filter(s => s.team_b > s.team_a).length
  const teamAWon = teamASetWins > teamBSetWins

  // Team average ratings
  const avgA = (teamA[0].skill_level + teamA[1].skill_level) / 2
  const avgB = (teamB[0].skill_level + teamB[1].skill_level) / 2

  // Convert to Elo scale (1.0-7.0 → 200-1400)
  const eloA = avgA * 200
  const eloB = avgB * 200

  // Expected scores
  const expectedA = 1 / (1 + Math.pow(10, (eloB - eloA) / 400))

  // K-factor: 60 in Elo units = max ±0.3 on 1.0-7.0 scale
  const K = 60

  // Actual results
  const actualA = teamAWon ? 1 : 0
  const actualB = teamAWon ? 0 : 1

  // Compute Elo deltas
  const deltaA = K * (actualA - expectedA)
  const deltaB = K * (actualB - (1 - expectedA))

  // Convert back to 1.0-7.0 scale
  const ratingChangeA = deltaA / 200
  const ratingChangeB = deltaB / 200

  // Upset bonus: lower-rated team winning gets 1.3x multiplier
  const isUpset = (teamAWon && avgA < avgB) || (!teamAWon && avgB < avgA)
  const upsetMultiplier = isUpset ? 1.3 : 1.0

  const finalChangeA = ratingChangeA * upsetMultiplier
  const finalChangeB = ratingChangeB * upsetMultiplier

  const results: { playerId: string; newRating: number; won: boolean }[] = []

  for (const player of teamA) {
    const clampedChange = Math.max(-0.3, Math.min(0.3, finalChangeA))
    const newRating = Math.max(1.0, Math.min(7.0, player.skill_level + clampedChange))
    results.push({ playerId: player.id, newRating: parseFloat(newRating.toFixed(1)), won: teamAWon })
  }
  for (const player of teamB) {
    const clampedChange = Math.max(-0.3, Math.min(0.3, finalChangeB))
    const newRating = Math.max(1.0, Math.min(7.0, player.skill_level + clampedChange))
    results.push({ playerId: player.id, newRating: parseFloat(newRating.toFixed(1)), won: !teamAWon })
  }

  return results
}

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

    const { match_id, action } = await req.json()

    if (!match_id || !action || !['confirm', 'dispute', 'auto_verify'].includes(action)) {
      return NextResponse.json({ error: 'Missing match_id or invalid action' }, { status: 400 })
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

    if (match.result_status !== 'pending_verification') {
      return NextResponse.json({ error: 'Match is not pending verification' }, { status: 400 })
    }

    // Auto-verify: check 24-hour window
    if (action === 'auto_verify') {
      const submittedAt = new Date(match.score_submitted_at).getTime()
      const now = Date.now()
      const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000
      if (now - submittedAt < TWENTY_FOUR_HOURS) {
        return NextResponse.json({ error: '24 hours have not passed yet' }, { status: 400 })
      }
    } else {
      // For confirm/dispute: validate caller is not the host and is an accepted player
      if (user.id === match.creator_id) {
        return NextResponse.json({ error: 'Host cannot verify their own score' }, { status: 403 })
      }

      const { data: playerEntry } = await supabase
        .from('match_players')
        .select('player_id, status, result_confirmed')
        .eq('match_id', match_id)
        .eq('player_id', user.id)
        .eq('status', 'accepted')
        .single()

      if (!playerEntry) {
        return NextResponse.json({ error: 'You are not a participant in this match' }, { status: 403 })
      }

      if (playerEntry.result_confirmed !== null) {
        return NextResponse.json({ error: 'You have already responded' }, { status: 400 })
      }

      // Record this player's response
      await supabase
        .from('match_players')
        .update({ result_confirmed: action === 'confirm' })
        .eq('match_id', match_id)
        .eq('player_id', user.id)
    }

    // Handle dispute
    if (action === 'dispute') {
      await supabase
        .from('matches')
        .update({ result_status: 'disputed' })
        .eq('id', match_id)

      return NextResponse.json({ success: true, result_status: 'disputed' })
    }

    // Handle confirm / auto_verify → run Elo calculation
    // Fetch all match players with their teams and ratings
    const { data: matchPlayers } = await supabase
      .from('match_players')
      .select('player_id, team')
      .eq('match_id', match_id)
      .eq('status', 'accepted')

    if (!matchPlayers || matchPlayers.length < 4) {
      return NextResponse.json({ error: 'Could not fetch all match players' }, { status: 500 })
    }

    const teamAIds = matchPlayers.filter((p: { team: string }) => p.team === 'A').map((p: { player_id: string }) => p.player_id)
    const teamBIds = matchPlayers.filter((p: { team: string }) => p.team === 'B').map((p: { player_id: string }) => p.player_id)

    if (teamAIds.length !== 2 || teamBIds.length !== 2) {
      return NextResponse.json({ error: 'Invalid team assignments' }, { status: 500 })
    }

    // Fetch player ratings
    const allIds = [...teamAIds, ...teamBIds]
    const { data: players } = await supabase
      .from('applications')
      .select('id, skill_level, matches_played, matches_won, reliability_percentage')
      .in('id', allIds)

    if (!players || players.length < 4) {
      return NextResponse.json({ error: 'Could not fetch player ratings' }, { status: 500 })
    }

    const playerMap = new Map(players.map((p: { id: string; skill_level: number; matches_played: number; matches_won: number; reliability_percentage: number }) => [p.id, p]))

    const teamA: PlayerRating[] = teamAIds.map((id: string) => ({
      id,
      skill_level: playerMap.get(id)?.skill_level || 2.5,
    }))
    const teamB: PlayerRating[] = teamBIds.map((id: string) => ({
      id,
      skill_level: playerMap.get(id)?.skill_level || 2.5,
    }))

    // Calculate rating updates
    const ratingUpdates = computeRatingUpdates(teamA, teamB, match.scores)

    // Update each player's stats
    for (const update of ratingUpdates) {
      const current = playerMap.get(update.playerId)
      if (!current) continue

      const newMatchesPlayed = (current.matches_played || 0) + 1
      const newMatchesWon = (current.matches_won || 0) + (update.won ? 1 : 0)
      const newReliability = Math.min(100, (current.reliability_percentage || 0) + 5)

      await supabase
        .from('applications')
        .update({
          skill_level: update.newRating,
          matches_played: newMatchesPlayed,
          matches_won: newMatchesWon,
          reliability_percentage: newReliability,
        })
        .eq('id', update.playerId)
    }

    // Update match as verified
    await supabase
      .from('matches')
      .update({
        result_status: 'verified',
        verified_by: action === 'auto_verify' ? null : user.id,
        status: 'completed',
      })
      .eq('id', match_id)

    return NextResponse.json({
      success: true,
      result_status: 'verified',
      ratings: ratingUpdates,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
