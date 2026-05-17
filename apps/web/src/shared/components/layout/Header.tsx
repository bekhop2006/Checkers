"use client";

import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { EloBadge } from "@/features/rating/components/EloBadge";
import { useUser } from "@/shared/hooks/useUser";

/** Site header with nav and Elo badge. */
export function Header() {
  const { user, profile, loading } = useUser();

  return (
    <header className="border-b border-stone-200 dark:border-stone-800 bg-white/80 dark:bg-stone-950/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="font-bold text-xl text-amber-600">
          Blitz Checkers
        </Link>
        <nav className="hidden sm:flex items-center gap-6 text-sm">
          <Link href="/play" className="hover:text-amber-600">
            Играть
          </Link>
          <Link href="/leaderboard" className="hover:text-amber-600">
            Рейтинг
          </Link>
          <Link href="/history" className="hover:text-amber-600">
            История
          </Link>
          <Link
            href="/pricing"
            className="px-3 py-1 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold hover:opacity-90"
          >
            Upgrade to Pro
          </Link>
        </nav>
        <div className="flex items-center gap-3">
          {!loading && profile && <EloBadge elo={profile.elo} />}
          {!loading && !user && (
            <Link
              href="/auth/login"
              className="text-sm font-medium text-amber-600 hover:underline"
            >
              Войти
            </Link>
          )}
          {!loading && user && (
            <Link
              href="/settings"
              className="text-sm text-stone-500 hover:text-stone-800 dark:hover:text-stone-200"
            >
              {profile?.username ?? "Профиль"}
            </Link>
          )}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
