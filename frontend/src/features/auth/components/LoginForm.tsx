"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  signInWithEmail,
  type AuthActionResult,
} from "@/features/auth/actions/auth-actions";
import { AuthCard } from "./AuthCard";
import { GoogleButton } from "./GoogleButton";
import { isSupabaseConfigured } from "@/shared/lib/supabase/client";
import { useT } from "@/shared/i18n/context/locale-context";

interface LoginFormProps {
  redirectTo: string;
  initialError?: string;
}

const initialState: AuthActionResult = {};

/** Login with nickname or email and password. */
export function LoginForm({ redirectTo, initialError }: LoginFormProps) {
  const t = useT();
  const [state, formAction, pending] = useActionState(
    signInWithEmail,
    initialState
  );

  if (!isSupabaseConfigured()) {
    return (
      <AuthCard title={t("auth.loginTitle")} subtitle={t("auth.supabaseNotConfigured")}>
        <p className="text-amber-600 text-sm">
          Заполните NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_ANON_KEY в
          корневом .env
        </p>
      </AuthCard>
    );
  }

  const error = state.error ?? initialError;

  return (
    <AuthCard
      title={t("auth.loginTitle")}
      subtitle={t("auth.loginSubtitle")}
      footer={
        <span className="text-stone-500">
          {t("auth.noAccount")}{" "}
          <Link href="/auth/signup" className="text-amber-600 hover:underline">
            {t("nav.signup")}
          </Link>
        </span>
      }
    >
      <GoogleButton redirectTo={redirectTo} />
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-stone-200 dark:border-stone-700" />
        </div>
        <span className="relative flex justify-center text-xs text-stone-500 bg-[var(--card)] px-2">
          {t("auth.orGoogle")}
        </span>
      </div>
      <form action={formAction} className="flex flex-col gap-4">
        <input type="hidden" name="redirect" value={redirectTo} />
        <label className="block text-sm font-medium text-stone-600 dark:text-stone-400">
          {t("auth.nicknameOrEmail")}
        </label>
        <input
          type="text"
          name="login"
          placeholder={t("auth.loginPlaceholder")}
          required
          autoComplete="username"
          className="input-field"
        />
        <label className="block text-sm font-medium text-stone-600 dark:text-stone-400">
          {t("auth.password")}
        </label>
        <input
          type="password"
          name="password"
          placeholder={t("auth.password")}
          required
          autoComplete="current-password"
          className="input-field"
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="btn-primary w-full disabled:opacity-50"
        >
          {pending ? t("auth.pendingLogin") : t("auth.submitLogin")}
        </button>
      </form>
    </AuthCard>
  );
}
