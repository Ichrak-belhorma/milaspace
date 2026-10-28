import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

const TYPES: EmailOtpType[] = ["signup", "magiclink", "email", "recovery", "invite", "email_change"];

/** For email templates that link with a token hash (`/auth/confirm?token_hash=…&type=…`). */
export async function GET(request: NextRequest) {
  const url = request.nextUrl;
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const home = new URL("/", url.origin);
  const supabase = await createSupabaseServer();
  if (!supabase || !tokenHash || !type || !TYPES.includes(type)) {
    home.searchParams.set("auth", "error");
    return NextResponse.redirect(home);
  }
  const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
  home.searchParams.set("auth", error ? "error" : "signed-in");
  return NextResponse.redirect(home);
}
