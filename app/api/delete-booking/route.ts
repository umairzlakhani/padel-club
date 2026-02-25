import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    return NextResponse.json({ error: "Server config: SUPABASE_SERVICE_ROLE_KEY not set" }, { status: 500 });
  }

  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!token) {
    return NextResponse.json({ error: "Missing authorization token" }, { status: 401 });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey);

  // Verify the caller
  const { data: { user }, error: authError } = await adminClient.auth.getUser(token);
  if (authError || !user) {
    return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Missing booking id" }, { status: 400 });
  }

  // Verify this booking belongs to the user
  const { data: booking } = await adminClient
    .from("court_bookings")
    .select("id, user_id")
    .eq("id", id)
    .maybeSingle();

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  if (booking.user_id !== user.id) {
    return NextResponse.json({ error: "You can only cancel your own bookings" }, { status: 403 });
  }

  // Delete using admin client (bypasses RLS)
  const { error: delError } = await adminClient
    .from("court_bookings")
    .delete()
    .eq("id", id);

  if (delError) {
    return NextResponse.json({ error: `Failed to cancel booking: ${delError.message}` }, { status: 500 });
  }

  // Verify
  const { data: check } = await adminClient
    .from("court_bookings")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (check) {
    return NextResponse.json({ error: "Booking still exists after delete" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
