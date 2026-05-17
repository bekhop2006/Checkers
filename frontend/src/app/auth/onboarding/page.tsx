import { redirect } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { OnboardingForm } from "@/features/auth/components/OnboardingForm";

/** Profile setup after OAuth or first login. */
export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  const needsOnboarding =
    !profile?.username || profile.username.startsWith("player_");

  if (!needsOnboarding) {
    redirect("/play");
  }

  return <OnboardingForm />;
}
