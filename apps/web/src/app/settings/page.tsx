"use client";

import { useUser } from "@/shared/hooks/useUser";
import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/shared/lib/supabase/client";
import { EloBadge } from "@/features/rating/components/EloBadge";

/** User settings and profile. */
export default function SettingsPage() {
  const { user, profile, loading } = useUser();

  const logout = async () => {
    if (!isSupabaseConfigured()) return;
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (loading) return <p className="p-8 text-center">Загрузка...</p>;

  if (!user && isSupabaseConfigured()) {
    return (
      <p className="p-8 text-center">
        <Link href="/auth/login" className="text-amber-600">
          Войдите
        </Link>
      </p>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-2xl font-bold mb-6">Профиль</h1>
      {profile && <EloBadge elo={profile.elo} className="mb-4" />}
      <dl className="space-y-3 mb-8">
        <div>
          <dt className="text-stone-500 text-sm">Имя</dt>
          <dd className="font-medium">{profile?.username}</dd>
        </div>
        <div>
          <dt className="text-stone-500 text-sm">Город</dt>
          <dd>{profile?.city ?? "—"}</dd>
        </div>
        <div>
          <dt className="text-stone-500 text-sm">Статистика</dt>
          <dd>
            {profile?.wins}W / {profile?.losses}L / {profile?.draws}D
          </dd>
        </div>
      </dl>
      {profile?.is_pro && (
        <p className="text-amber-600 font-semibold mb-4">★ Pro</p>
      )}
      <Link
        href="/pricing"
        className="block text-center py-3 rounded-xl bg-amber-600 text-white font-semibold mb-4"
      >
        Upgrade to Pro
      </Link>
      {isSupabaseConfigured() && (
        <button
          type="button"
          onClick={logout}
          className="w-full py-2 text-stone-500 hover:text-red-500"
        >
          Выйти
        </button>
      )}
    </div>
  );
}
