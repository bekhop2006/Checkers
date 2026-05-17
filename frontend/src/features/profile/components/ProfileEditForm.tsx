"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  updateProfile,
  type ProfileActionResult,
} from "@/features/profile/actions/profile-actions";
import { UsernameField } from "./UsernameField";
import { useAuth } from "@/features/auth/context/auth-context";
import type { Profile } from "@/shared/types/database";

const CITIES = ["Алматы", "Астана", "Шымкент", "Караганда", "Другой"];
const initialState: ProfileActionResult = {};

interface ProfileEditFormProps {
  profile: Profile;
}

/** Edit nickname and city in settings. */
export function ProfileEditForm({ profile }: ProfileEditFormProps) {
  const [state, formAction, pending] = useActionState(updateProfile, initialState);
  const { refresh } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (state.success) {
      void refresh();
      router.refresh();
    }
  }, [state.success, refresh, router]);

  return (
    <form action={formAction} className="space-y-4 border-t border-stone-200/80 dark:border-stone-700/80 pt-6">
      <h2 className="font-semibold text-stone-900 dark:text-stone-50">Никнейм и город</h2>
      <UsernameField defaultValue={profile.username ?? ""} />
      <div>
        <label className="block text-sm font-medium text-stone-600 dark:text-stone-400 mb-1.5">
          Город
        </label>
        <select
          name="city"
          defaultValue={profile.city ?? "Алматы"}
          className="input-field"
        >
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      {state.error ? <p className="text-red-500 text-sm">{state.error}</p> : null}
      {state.success ? (
        <p className="text-green-600 dark:text-green-400 text-sm">{state.success}</p>
      ) : null}
      <button type="submit" disabled={pending} className="btn-secondary w-full disabled:opacity-50">
        {pending ? "Сохранение..." : "Сохранить"}
      </button>
    </form>
  );
}
