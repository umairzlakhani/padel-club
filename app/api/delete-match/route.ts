import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // ── 1. Validate service role key exists and is actually a service_role JWT ──
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "Server config error: SUPABASE_SERVICE_ROLE_KEY env var is not set." },
      { status: 500 }
    );
  }

  if (serviceRoleKey === anonKey) {
    return NextResponse.json(
      { error: "Server config error: SUPABASE_SERVICE_ROLE_KEY is the same as the anon key. Copy the correct service_role key from Supabase Dashboard > Settings > API." },
      { status: 500 }
    );
  }

  // Decode the JWT payload to verify it's really a service_role key
  try {
    const payload = JSON.parse(
      Buffer.from(serviceRoleKey.split(".")[1], "base64").toString()
    );
    if (payload.role !== "service_role") {
      return NextResponse.json(
        { error: `Server config error: SUPABASE_SERVICE_ROLE_KEY has role "${payload.role}" — expected "service_role". You may have pasted the anon key by mistake.` },
        { status: 500 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "Server config error: SUPABASE_SERVICE_ROLE_KEY is not a valid JWT." },
      { status: 500 }
    );
  }

  // ── 2. Authenticate the caller ──
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });
  }

  // Admin client bypasses RLS entirely
  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  const { data: { user }, error: authError } = await adminClient.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  // ── 3. Verify caller is admin ──
  const { data: caller } = await adminClient
    .from("applications")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!caller || caller.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  // ── 4. Parse request body ──
  const { id } = await req.json();

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Missing match id" }, { status: 400 });
  }

  // ── 5. Verify match exists before deleting ──
  const { data: existing } = await adminClient
    .from("matches")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (!existing) {
    return NextResponse.json({ error: "Match not found in database" }, { status: 404 });
  }

  // ── 6. Delete match_players first (foreign key constraint) ──
  const { error: mpError } = await adminClient
    .from("match_players")
    .delete()
    .eq("match_id", id);

  if (mpError) {
    return NextResponse.json(
      { error: `Failed to delete match players: ${mpError.message}` },
      { status: 500 }
    );
  }

  // ── 7. Delete the match ──
  const { error: matchError } = await adminClient
    .from("matches")
    .delete()
    .eq("id", id);

  if (matchError) {
    return NextResponse.json(
      { error: `Failed to delete match: ${matchError.message}` },
      { status: 500 }
    );
  }

  // ── 8. Verify it's actually gone ──
  const { data: check } = await adminClient
    .from("matches")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (check) {
    return NextResponse.json(
      { error: "Match still exists after delete — the service_role key may be incorrect. Re-copy it from Supabase Dashboard > Settings > API > service_role (not anon)." },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
