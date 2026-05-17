"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  signUpWithEmail,
  type AuthActionResult,
} from "@/features/auth/actions/auth-actions";
import { AuthCard } from "./AuthCard";
import { GoogleButton } from "./GoogleButton";
import { UsernameField } from "@/features/profile/components/UsernameField";
import { isSupabaseConfigured } from "@/shared/lib/supabase/client";
import { useT } from "@/shared/i18n/context/locale-context";

const CITIES = ["Алматы", "Астана", "Шымкент", "Караганда", "Другой"];

const initialState: AuthActionResult = {};

/** Registration form with profile fields. */
export function SignupForm() {
  const t = useT();
  const [state, formAction, pending] = useActionState(
    signUpWithEmail,
    initialState
  );

  if (!isSupabaseConfigured()) {
    return (
      <AuthCard title={t("auth.signupTitle")} subtitle={t("auth.supabaseNotConfigured")}>
        <p className="text-amber-600 text-sm">Настройте .env в корне проекта.</p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title={t("auth.signupTitle")}
      subtitle={t("auth.signupSubtitle")}
      footer={
        <span className="text-stone-500">
          {t("auth.hasAccount")}{" "}
          <Link href="/auth/login" className="text-amber-600 hover:underline">
            {t("nav.login")}
          </Link>
        </span>
      }
    >
      <GoogleButton redirectTo="/play" />
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-stone-200 dark:border-stone-700" />
        </div>
        <span className="relative flex justify-center text-xs text-stone-500 bg-[var(--card)] px-2">
          {t("auth.orGoogle")}
        </span>
      </div>
      <form action={formAction} className="flex flex-col gap-4">
        <UsernameField />
        <select
          name="city"
          defaultValue="Алматы"
          className="input-field"
        >
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <input
          type="email"
          name="email"
          placeholder="Email"
          required
          className="input-field"
        />
        <input
          type="password"
          name="password"
          placeholder={t("auth.password")}
          required
          minLength={6}
          className="input-field"
        />
        {state.error && <p className="text-red-500 text-sm">{state.error}</p>}
        {state.success && (
          <p className="text-green-600 text-sm">{state.success}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="btn-primary w-full disabled:opacity-50"
        >
          {pending ? t("auth.pendingSignup") : t("auth.submitSignup")}
        </button>
      </form>
    </AuthCard>
  );
}
