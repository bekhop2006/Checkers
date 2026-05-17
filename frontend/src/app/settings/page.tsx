"use client";

import { useAuth } from "@/features/auth/context/auth-context";
import Link from "next/link";
import { isSupabaseConfigured } from "@/shared/lib/supabase/client";
import { EloBadge } from "@/features/rating/components/EloBadge";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import { Crown, LogOut, User } from "lucide-react";
import { ProfileEditForm } from "@/features/profile/components/ProfileEditForm";
import { playerProfilePath } from "@/shared/lib/username";

/** User settings and profile. */
export default function SettingsPage() {
  const { user, profile, loading, signOut } = useAuth();

  if (loading) {
    return (
      <div className="page-container py-20 flex justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user && isSupabaseConfigured()) {
    return (
      <div className="page-container py-20 text-center">
        <p className="text-stone-600 dark:text-stone-400 mb-4">Войдите, чтобы видеть профиль</p>
        <Link href="/auth/login" className="btn-primary">
          Войти
        </Link>
      </div>
    );
  }

  return (
    <div className="page-container py-10 sm:py-14 max-w-md">
      <PageHeader title="Профиль" subtitle="Ваш рейтинг и статистика" />

      <div className="glass-card p-6 sm:p-8 space-y-6 animate-slide-up">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-orange-600 text-white">
            <User className="h-7 w-7" />
          </span>
          <div>
            <p className="text-xl font-bold">
              {profile?.username ? `@${profile.username}` : "Игрок"}
            </p>
            <p className="text-stone-500 text-sm">{profile?.city ?? "Город не указан"}</p>
            {profile?.username && !profile.username.startsWith("player_") ? (
              <Link
                href={playerProfilePath(profile.username)}
                className="text-sm text-brand-600 hover:underline mt-1 inline-block"
              >
                Открыть публичный профиль
              </Link>
            ) : null}
          </div>
        </div>

        {profile ? <EloBadge elo={profile.elo} className="text-base px-4 py-1.5" /> : null}

        <dl className="grid grid-cols-3 gap-3 text-center">
          <Stat label="Победы" value={profile?.wins ?? 0} />
          <Stat label="Поражения" value={profile?.losses ?? 0} />
          <Stat label="Ничьи" value={profile?.draws ?? 0} />
        </dl>

        {profile && isSupabaseConfigured() ? (
          <ProfileEditForm profile={profile} />
        ) : null}

        {profile?.is_pro ? (
          <p className="flex items-center justify-center gap-2 text-brand-600 font-semibold py-2 rounded-xl bg-brand-50 dark:bg-brand-950/50">
            <Crown className="h-4 w-4" />
            Pro аккаунт
          </p>
        ) : (
          <Link href="/pricing" className="btn-primary w-full text-center">
            Upgrade to Pro
          </Link>
        )}

        {isSupabaseConfigured() ? (
          <button
            type="button"
            onClick={() => void signOut()}
            className="w-full btn-ghost justify-center text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
          >
            <LogOut className="h-4 w-4" />
            Выйти
          </button>
        ) : null}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-stone-100/80 dark:bg-stone-800/50 py-3 px-2">
      <dt className="text-xs text-stone-500 mb-1">{label}</dt>
      <dd className="text-xl font-bold font-mono">{value}</dd>
    </div>
  );
}
