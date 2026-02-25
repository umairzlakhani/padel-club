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

  // Check if service role key is actually set (not falling back to anon)
  const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Try deleting with admin client first
  await supabaseAdmin.from("match_players").delete().eq("match_id", id);
  const { error: adminDeleteError } = await supabaseAdmin.from("matches").delete().eq("id", id);

  // Verify the match is actually gone
  const { data: stillExists } = await supabaseAdmin
    .from("matches")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (stillExists) {
    // Admin client didn't work, try with user's authenticated session
    const userClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    await userClient.from("match_players").delete().eq("match_id", id);
    await userClient.from("matches").delete().eq("id", id);

    // Check again
    const { data: stillExists2 } = await supabaseAdmin
      .from("matches")
      .select("id")
      .eq("id", id)
      .maybeSingle();

    if (stillExists2) {
      return NextResponse.json({
        error: `Match still exists after delete attempts. Service role key set: ${hasServiceRole}. Admin error: ${adminDeleteError?.message || 'none'}`,
      }, { status: 500 });
    }
  }

  return NextResponse.json({ success: true });
}
