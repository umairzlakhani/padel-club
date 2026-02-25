import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });
  }

  // Use the caller's authenticated session (RLS policies will apply)
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  // Check caller is admin
  const { data: caller } = await supabase
    .from("applications")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!caller || caller.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { id } = await req.json();

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Missing match id" }, { status: 400 });
  }

  // Delete match_players first (foreign key)
  const { error: mpError } = await supabase
    .from("match_players")
    .delete()
    .eq("match_id", id);

  if (mpError) {
    return NextResponse.json({ error: `Failed to delete match players: ${mpError.message}` }, { status: 500 });
  }

  // Delete the match
  const { error: matchError } = await supabase
    .from("matches")
    .delete()
    .eq("id", id);

  if (matchError) {
    return NextResponse.json({ error: `Failed to delete match: ${matchError.message}` }, { status: 500 });
  }

  // Verify it's gone
  const { data: check } = await supabase
    .from("matches")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (check) {
    return NextResponse.json({ error: "Match still exists after delete — RLS policy may be missing. Run the admin delete policy SQL in Supabase." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
