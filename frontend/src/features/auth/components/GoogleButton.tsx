"use client";

import { signInWithGoogle } from "@/features/auth/actions/auth-actions";

interface GoogleButtonProps {
  redirectTo?: string;
}

/** Triggers Google OAuth via server action. */
export function GoogleButton({ redirectTo = "/play" }: GoogleButtonProps) {
  return (
    <form action={signInWithGoogle}>
      <input type="hidden" name="redirect" value={redirectTo} />
      <button
        type="submit"
        className="w-full py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white/90 dark:bg-stone-900/90 font-medium text-sm hover:bg-stone-50 dark:hover:bg-stone-800 flex items-center justify-center gap-3 transition-colors"
      >
        <span className="flex h-6 w-6 items-center justify-center rounded-md bg-white shadow-sm text-base font-bold text-blue-600 border border-stone-200">
          G
        </span>
        Войти через Google
      </button>
    </form>
  );
}
