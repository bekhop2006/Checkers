import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/shared/lib/supabase/server";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import { EloBadge } from "@/features/rating/components/EloBadge";
import { InviteToBlitzButton } from "@/features/social/components/InviteToBlitzButton";
import { CopyProfileLink } from "@/features/social/components/CopyProfileLink";
import { normalizeUsername } from "@/shared/lib/username";
import { User } from "lucide-react";

interface PlayerPageProps {
  params: Promise<{ username: string }>;
}

/** Public player profile by nickname. */
export default async function PlayerPage({ params }: PlayerPageProps) {
  const { username: raw } = await params;
  const username = normalizeUsername(decodeURIComponent(raw));

  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, username, city, elo, wins, losses, draws")
    .eq("username", username)
    .maybeSingle();

  const profile = data;

  if (
    !profile?.username ||
    profile.username.startsWith("player_")
  ) {
    notFound();
  }

  return (
    <div className="page-container py-10 sm:py-14 max-w-md">
      <PageHeader
        title={`@${profile.username}`}
        subtitle={profile.city ?? "Игрок Blitz Checkers"}
      />

      <article className="glass-card p-6 sm:p-8 space-y-6 animate-slide-up">
        <div className="flex items-center gap-4">
          <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-orange-600 text-white">
            <User className="h-7 w-7" />
          </span>
          <div>
            <EloBadge elo={profile.elo} className="text-base px-4 py-1.5" />
          </div>
        </div>

        <dl className="grid grid-cols-3 gap-3 text-center">
          <Stat label="Победы" value={profile.wins} />
          <Stat label="Поражения" value={profile.losses} />
          <Stat label="Ничьи" value={profile.draws} />
        </dl>

        <InviteToBlitzButton />
        <CopyProfileLink username={profile.username} />

        <Link href="/players" className="btn-ghost w-full justify-center">
          ← Поиск игроков
        </Link>
      </article>
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
