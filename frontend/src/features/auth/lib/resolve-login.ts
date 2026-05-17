import { createClient } from "@/shared/lib/supabase/server";
import { createServiceClient } from "@/shared/lib/supabase/server";
import { isEmailLike, normalizeUsername } from "@/shared/lib/username";

export type ResolveLoginResult =
  | { ok: true; email: string }
  | { ok: false; reason: "empty" | "nickname_not_found" | "service_key_missing" };

/** Resolves nickname or email to auth email for Supabase sign-in. */
export async function resolveLoginToEmail(
  login: string
): Promise<ResolveLoginResult> {
  const trimmed = login.trim();
  if (!trimmed) {
    return { ok: false, reason: "empty" };
  }

  if (isEmailLike(trimmed)) {
    return { ok: true, email: trimmed.toLowerCase() };
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { ok: false, reason: "service_key_missing" };
  }

  const username = normalizeUsername(trimmed);
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (!profile?.id) {
    return { ok: false, reason: "nickname_not_found" };
  }

  const admin = createServiceClient();
  const { data, error } = await admin.auth.admin.getUserById(profile.id);

  if (error || !data.user?.email) {
    return { ok: false, reason: "nickname_not_found" };
  }

  return { ok: true, email: data.user.email };
}
