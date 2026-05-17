"use client";

import { useActionState } from "react";
import {
  completeOnboarding,
  type AuthActionResult,
} from "@/features/auth/actions/auth-actions";
import { AuthCard } from "./AuthCard";
import { UsernameField } from "@/features/profile/components/UsernameField";

const CITIES = ["Алматы", "Астана", "Шымкент", "Караганда", "Другой"];
const initialState: AuthActionResult = {};

/** Collects username and city after OAuth signup. */
export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(
    completeOnboarding,
    initialState
  );

  return (
    <AuthCard
      title="Добро пожаловать!"
      subtitle="Придумайте никнейм — по нему вас найдут друзья"
    >
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
        {state.error && <p className="text-red-500 text-sm">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="btn-primary w-full disabled:opacity-50"
        >
          {pending ? "Сохранение..." : "Начать играть"}
        </button>
      </form>
    </AuthCard>
  );
}
