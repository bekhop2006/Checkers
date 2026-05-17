"use server";

import { createClient } from "@/shared/lib/supabase/server";
import { getSiteUrl } from "@/shared/lib/site-url";
import { isEmailLike, normalizeUsername, validateUsername } from "@/shared/lib/username";
import { resolveLoginToEmail } from "@/features/auth/lib/resolve-login";
import { redirect } from "next/navigation";

export interface AuthActionResult {
  error?: string;
  success?: string;
}

/** Signs in with nickname or email and password. */
export async function signInWithEmail(
  _prev: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  const login = String(
    formData.get("login") ?? formData.get("email") ?? ""
  ).trim();
  const password = String(formData.get("password") ?? "");
  const redirectTo = String(formData.get("redirect") ?? "/play");

  if (!login || !password) {
    return { error: "Введите никнейм (или email) и пароль" };
  }

  const resolved = await resolveLoginToEmail(login);
  if (!resolved.ok) {
    if (resolved.reason === "service_key_missing") {
      return {
        error: isEmailLike(login)
          ? "Добавьте SUPABASE_SERVICE_ROLE_KEY в .env для входа по никнейму"
          : "Вход по никнейму: нужен SUPABASE_SERVICE_ROLE_KEY в корневом .env",
      };
    }
    if (resolved.reason === "nickname_not_found") {
      return { error: "Никнейм не найден — проверьте написание или войдите по email" };
    }
    return { error: "Введите никнейм или email" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: resolved.email,
    password,
  });

  if (error) {
    return { error: "Неверный никнейм/email или пароль" };
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
      !profile?.username || profile.username.startsWith("player_");

    if (needsOnboarding) {
      redirect("/auth/onboarding");
    }
  }

  redirect(redirectTo);
}

/** Registers a new user with profile metadata. */
export async function signUpWithEmail(
  _prev: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const usernameRaw = String(formData.get("username") ?? "");
  const city = String(formData.get("city") ?? "Алматы");
  const usernameError = validateUsername(usernameRaw);

  if (!email || !password || !usernameRaw) {
    return { error: "Заполните все обязательные поля" };
  }

  if (usernameError) {
    return { error: usernameError };
  }

  if (password.length < 6) {
    return { error: "Пароль минимум 6 символов" };
  }

  const username = normalizeUsername(usernameRaw);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { username, city },
      emailRedirectTo: `${getSiteUrl()}/auth/callback?next=/play`,
    },
  });

  if (error) {
    if (error.message.includes("duplicate") || error.code === "23505") {
      return { error: "Этот никнейм уже занят" };
    }
    return { error: error.message };
  }

  if (data.user && !data.session) {
    return {
      success:
        `Аккаунт @${username} создан. Подтвердите email — письмо отправлено на ${email}. Затем войдите по никнейму.`,
    };
  }

  if (data.user && data.session) {
    await supabase
      .from("profiles")
      .update({ username, city })
      .eq("id", data.user.id);

    redirect("/play");
  }

  redirect("/play");
}

/** Starts Google OAuth flow. */
export async function signInWithGoogle(formData: FormData): Promise<void> {
  const redirectTo = String(formData.get("redirect") ?? "/play");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${getSiteUrl()}/auth/callback?next=${encodeURIComponent(redirectTo)}`,
    },
  });

  if (error) {
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}`);
  }

  if (data.url) {
    redirect(data.url);
  }
}

/** Updates profile after onboarding. */
export async function completeOnboarding(
  _prev: AuthActionResult,
  formData: FormData
): Promise<AuthActionResult> {
  const usernameRaw = String(formData.get("username") ?? "");
  const city = String(formData.get("city") ?? "Алматы");
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
    return { error: "Необходимо войти в аккаунт" };
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

  redirect("/play");
}

/** Signs out the current user. */
export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
