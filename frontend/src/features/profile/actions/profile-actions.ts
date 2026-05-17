"use server";

import { createClient } from "@/shared/lib/supabase/server";
import { normalizeUsername, validateUsername } from "@/shared/lib/username";
import { revalidatePath } from "next/cache";

export interface ProfileActionResult {
  error?: string;
  success?: string;
}

/** Updates the current user's nickname and city. */
export async function updateProfile(
  _prev: ProfileActionResult,
  formData: FormData
): Promise<ProfileActionResult> {
  const usernameRaw = String(formData.get("username") ?? "");
  const city = String(formData.get("city") ?? "").trim() || null;
  const usernameError = validateUsername(usernameRaw);

  if (usernameError) {
    return { error: usernameError };
  }

  const username = normalizeUsername(usernameRaw);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "Войдите в аккаунт" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({ username, city })
    .eq("id", user.id);

  if (error) {
    if (error.code === "23505") {
      return { error: "Этот никнейм уже занят" };
    }
    return { error: error.message };
  }

  revalidatePath("/settings");
  revalidatePath(`/player/${username}`);
  revalidatePath("/players");

  return { success: "Профиль сохранён" };
}
