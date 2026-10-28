import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

/** Email confirmation and magic links land here (PKCE): swap the code for a session, then go home. */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const code = url.searchParams.get("code");
  const home = new URL("/", url.origin);
  const supabase = await createSupabaseServer();
  if (!supabase || !code) {
    home.searchParams.set("auth", "error");
    return NextResponse.redirect(home);
  }
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  home.searchParams.set("auth", error ? "error" : "signed-in");
  return NextResponse.redirect(home);
}
