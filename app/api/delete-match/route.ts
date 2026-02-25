import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // ── 1. Validate service role key ──
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY env var is not set on the server." },
      { status: 500 }
    );
  }

  if (serviceRoleKey === anonKey) {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY equals the anon key. Paste the service_role key from Supabase > Settings > API." },
      { status: 500 }
    );
  }

  let keyRole = "unknown";
  try {
    const payload = JSON.parse(
      Buffer.from(serviceRoleKey.split(".")[1], "base64").toString()
    );
    keyRole = payload.role || "missing";
    if (payload.role !== "service_role") {
      return NextResponse.json(
        { error: `SUPABASE_SERVICE_ROLE_KEY has role="${payload.role}" instead of "service_role". Wrong key.` },
        { status: 500 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "SUPABASE_SERVICE_ROLE_KEY is not a valid JWT." },
      { status: 500 }
    );
  }

  // ── 2. Authenticate the caller ──
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });
  }

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

  // ── 4. Parse body ──
  const { id } = await req.json();
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Missing match id" }, { status: 400 });
  }

  // ── 5. Use raw fetch to PostgREST to bypass any JS client issues ──
  const restHeaders = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };

  // 5a. Check match exists
  const checkRes = await fetch(
    `${supabaseUrl}/rest/v1/matches?id=eq.${id}&select=id`,
    { method: "GET", headers: restHeaders }
  );
  const checkData = await checkRes.json();

  if (!checkRes.ok) {
    return NextResponse.json(
      { error: `Pre-check failed (${checkRes.status}): ${JSON.stringify(checkData)}` },
      { status: 500 }
    );
  }

  if (!Array.isArray(checkData) || checkData.length === 0) {
    return NextResponse.json({ error: "Match not found in database" }, { status: 404 });
  }

  // 5b. Delete match_players
  const mpRes = await fetch(
    `${supabaseUrl}/rest/v1/match_players?match_id=eq.${id}`,
    { method: "DELETE", headers: restHeaders }
  );

  if (!mpRes.ok) {
    const mpErr = await mpRes.text();
    return NextResponse.json(
      { error: `Failed to delete match_players (${mpRes.status}): ${mpErr}` },
      { status: 500 }
    );
  }

  // 5c. Delete the match
  const delRes = await fetch(
    `${supabaseUrl}/rest/v1/matches?id=eq.${id}`,
    { method: "DELETE", headers: restHeaders }
  );
  const delData = await delRes.text();

  if (!delRes.ok) {
    return NextResponse.json(
      { error: `Failed to delete match (${delRes.status}): ${delData}` },
      { status: 500 }
    );
  }

  // 5d. Verify it's gone
  const verifyRes = await fetch(
    `${supabaseUrl}/rest/v1/matches?id=eq.${id}&select=id`,
    { method: "GET", headers: restHeaders }
  );
  const verifyData = await verifyRes.json();

  if (Array.isArray(verifyData) && verifyData.length > 0) {
    return NextResponse.json(
      { error: `Match STILL EXISTS after delete. Key role: ${keyRole}. DELETE response: ${delData}. This means the service_role key is not working. Re-copy it from Supabase Dashboard.` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
