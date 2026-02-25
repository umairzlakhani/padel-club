import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  // Extract Bearer token
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });
  }

  // Validate token and get user
  const supabaseAuth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);

  if (authError || !user) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  // Check caller's role
  const { data: caller } = await supabaseAdmin
    .from("applications")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!caller || caller.role !== "admin") {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  // Process approval
  const { id } = await req.json();

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Missing application id" }, { status: 400 });
  }

  // Confirm the user's email so they can sign in
  const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(id, {
    email_confirm: true,
  });

  if (confirmError) {
    return NextResponse.json({ error: confirmError.message }, { status: 500 });
  }

  const { data, error } = await supabaseAdmin
    .schema("public")
    .from("applications")
    .update({ status: "member" })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
