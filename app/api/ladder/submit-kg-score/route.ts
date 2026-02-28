import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

type SetScore = { team_a: number; team_b: number }

function validateKGScores(scores: SetScore[]): string | null {
  if (!Array.isArray(scores) || scores.length < 2 || scores.length > 3) {
    return 'Must have 2 or 3 sets'
  }

  for (const set of scores) {
    if (typeof set.team_a !== 'number' || typeof set.team_b !== 'number' ||
        set.team_a < 0 || set.team_b < 0 ||
        !Number.isInteger(set.team_a) || !Number.isInteger(set.team_b)) {
      return 'Invalid set scores — must be non-negative integers'
    }
  }

  // Validate Sets 1 & 2: KG rules — winner must have 6, loser 0-5
  // Tiebreak at 5-5 → winner gets 6, loser stays 5
  for (let i = 0; i < 2; i++) {
    const s = scores[i]
    const winner = Math.max(s.team_a, s.team_b)
    const loser = Math.min(s.team_a, s.team_b)

    if (winner !== 6) {
      return `Set ${i + 1}: winner must have exactly 6 games`
    }
    if (loser < 0 || loser > 5) {
      return `Set ${i + 1}: loser must have 0-5 games (tiebreak at 5-5 → 6-5)`
    }
    if (s.team_a === s.team_b) {
      return `Set ${i + 1}: cannot be a tie`
    }
  }

  // Determine set wins
  const teamASets = scores.filter(s => s.team_a > s.team_b).length
  const teamBSets = scores.filter(s => s.team_b > s.team_a).length

  // If sets are split 1-1, must have a 3rd set (super tiebreak)
  if (scores.length === 2) {
    if (teamASets === 1 && teamBSets === 1) {
      return 'Sets are split 1-1 — a super tiebreak 3rd set is required'
    }
  }

  // Validate Set 3 (super tiebreak): first to 10, win by 2
  if (scores.length === 3) {
    // Must only have 3rd set if sets 1-2 are split
    const firstTwoA = scores.slice(0, 2).filter(s => s.team_a > s.team_b).length
    const firstTwoB = scores.slice(0, 2).filter(s => s.team_b > s.team_a).length
    if (firstTwoA !== 1 || firstTwoB !== 1) {
      return 'Set 3 is only played if sets are split 1-1'
    }

    const s3 = scores[2]
    const tbWinner = Math.max(s3.team_a, s3.team_b)
    const tbLoser = Math.min(s3.team_a, s3.team_b)

    if (tbWinner < 10) {
      return 'Super tiebreak: winner must reach at least 10 points'
    }
    if (tbWinner - tbLoser < 2) {
      return 'Super tiebreak: must win by at least 2 points'
    }
    if (s3.team_a === s3.team_b) {
      return 'Super tiebreak: cannot be a tie'
    }
  }

  // Must have an overall match winner
  const finalA = scores.filter(s => s.team_a > s.team_b).length
  const finalB = scores.filter(s => s.team_b > s.team_a).length
  if (finalA === finalB) {
    return 'Must have an overall match winner'
  }

  return null
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

    const { challenge_id, scores } = await req.json()

    if (!challenge_id || !scores) {
      return NextResponse.json({ error: 'Missing challenge_id or scores' }, { status: 400 })
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
      return NextResponse.json({ error: 'Challenge must be accepted before submitting scores' }, { status: 400 })
    }

    // Verify user is on one of the teams
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

    const isChallenger = challengerTeam && (challengerTeam.player1_id === user.id || challengerTeam.player2_id === user.id)
    const isDefender = defenderTeam && (defenderTeam.player1_id === user.id || defenderTeam.player2_id === user.id)

    if (!isChallenger && !isDefender) {
      return NextResponse.json({ error: 'You are not a participant in this challenge' }, { status: 403 })
    }

    // Validate KG scoring rules
    const validationError = validateKGScores(scores)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    // Determine result: team_a = challenger, team_b = defender
    const challengerSets = scores.filter((s: SetScore) => s.team_a > s.team_b).length
    const defenderSets = scores.filter((s: SetScore) => s.team_b > s.team_a).length
    const result = challengerSets > defenderSets ? 'challenger_won' : 'defender_won'

    // Update challenge
    const { error: updateErr } = await supabase
      .from('ladder_challenges')
      .update({
        scores,
        result,
        status: 'pending_verification',
      })
      .eq('id', challenge_id)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, result })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
