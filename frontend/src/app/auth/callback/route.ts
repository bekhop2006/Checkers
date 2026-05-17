import { createClient } from "@/shared/lib/supabase/server";
import { NextResponse } from "next/server";

/** Handles OAuth and email confirmation callbacks from Supabase. */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/play";
  const error = searchParams.get("error_description");

  if (error) {
    return NextResponse.redirect(
      `${origin}/auth/login?error=${encodeURIComponent(error)}`
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } =
      await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      return NextResponse.redirect(
        `${origin}/auth/login?error=${encodeURIComponent(exchangeError.message)}`
      );
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .single();

      const needsOnboarding =
        profile?.username?.startsWith("player_") ||
        !profile?.username;

      if (needsOnboarding) {
        return NextResponse.redirect(`${origin}/auth/onboarding`);
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
