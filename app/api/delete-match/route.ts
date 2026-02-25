import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });
  }

  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  // Check caller is admin
  const { data: caller } = await supabaseAdmin
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

  // Use service role client for deletion (bypasses RLS)
  // Delete match_players first (foreign key)
  const { error: mpError } = await supabaseAdmin
    .from("match_players")
    .delete()
    .eq("match_id", id);

  if (mpError) {
    console.error("Delete match_players error:", mpError);
    // Try with user's authenticated client as fallback
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    await userClient.from("match_players").delete().eq("match_id", id);
  }

  // Delete the match
  const { error: deleteError } = await supabaseAdmin
    .from("matches")
    .delete()
    .eq("id", id);

  if (deleteError) {
    console.error("Delete match error (admin):", deleteError);
    // Fallback: try with user's authenticated client
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );
    const { error: userDeleteError } = await userClient
      .from("matches")
      .delete()
      .eq("id", id);

    if (userDeleteError) {
      return NextResponse.json({ error: userDeleteError.message }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
