import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const { id } = await req.json();

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Missing application id" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .schema("public")
    .from("applications")
    .update({ status: "member" })
    .eq("id", id)
    .select()
    .single();

  console.log("Update result:", { data, error });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
