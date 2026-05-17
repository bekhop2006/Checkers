import Link from "next/link";
import { createClient } from "@/shared/lib/supabase/server";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import { Medal } from "lucide-react";
import { cn } from "@/shared/lib/utils";

/** Global and city leaderboard. */
export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const { city } = await searchParams;
  let rows: {
    id: string;
    username: string | null;
    city: string | null;
    elo: number;
    wins: number;
    losses: number;
  }[] = [];

  try {
    const supabase = await createClient();
    let query = supabase
      .from("profiles")
      .select("id, username, city, elo, wins, losses")
      .order("elo", { ascending: false })
      .limit(50);

    if (city) query = query.eq("city", city);
    const { data } = await query;
    rows = data ?? [];
  } catch {
    rows = [
      {
        id: "1",
        username: "demo_champion",
        city: "Алматы",
        elo: 1240,
        wins: 42,
        losses: 10,
      },
      {
        id: "2",
        username: "blitz_master",
        city: "Астана",
        elo: 1180,
        wins: 30,
        losses: 15,
      },
    ];
  }

  const cities = ["Алматы", "Астана", "Шымкент", "Караганда"];
  const top3 = rows.slice(0, 3);
  const rest = rows.slice(3);

  return (
    <div className="page-container py-10 sm:py-14 max-w-3xl">
      <PageHeader
        title="Лидерборд"
        subtitle={city ? `Рейтинг города: ${city}` : "Топ игроков по Elo"}
      />

      <div className="flex gap-2 mb-8 flex-wrap">
        <FilterChip href="/leaderboard" active={!city} label="Global" />
        {cities.map((c) => (
          <FilterChip
            key={c}
            href={`/leaderboard?city=${encodeURIComponent(c)}`}
            active={city === c}
            label={c}
          />
        ))}
      </div>

      {top3.length > 0 ? (
        <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-8">
          {top3.map((r, i) => (
            <PodiumCard key={r.id} rank={i + 1} row={r} />
          ))}
        </div>
      ) : null}

      <div className="glass-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-stone-200/80 dark:border-stone-700/80 text-stone-500">
              <th className="py-3 px-4 font-medium">#</th>
              <th className="py-3 px-4 font-medium">Игрок</th>
              <th className="py-3 px-4 font-medium hidden sm:table-cell">Город</th>
              <th className="py-3 px-4 font-medium">Elo</th>
              <th className="py-3 px-4 font-medium hidden sm:table-cell">W/L</th>
            </tr>
          </thead>
          <tbody>
            {(top3.length ? rest : rows).map((r, i) => (
              <tr
                key={r.id}
                className="border-b border-stone-100/80 dark:border-stone-800/80 last:border-0 hover:bg-brand-50/50 dark:hover:bg-brand-950/20 transition-colors"
              >
                <td className="py-3.5 px-4 text-stone-500">
                  {top3.length ? i + 4 : i + 1}
                </td>
                <td className="py-3.5 px-4 font-medium">{r.username ?? "—"}</td>
                <td className="py-3.5 px-4 text-stone-500 hidden sm:table-cell">
                  {r.city ?? "—"}
                </td>
                <td className="py-3.5 px-4 font-mono font-semibold text-brand-600 dark:text-brand-400">
                  {r.elo}
                </td>
                <td className="py-3.5 px-4 text-stone-500 hidden sm:table-cell">
                  {r.wins}/{r.losses}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="p-8 text-center text-stone-500">Пока нет игроков в рейтинге.</p>
        ) : null}
      </div>
    </div>
  );
}

function FilterChip({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "px-4 py-2 rounded-full text-sm font-medium transition-colors",
        active
          ? "bg-brand-600 text-white shadow-md shadow-brand-500/20"
          : "glass-card !rounded-full hover:border-brand-500/30"
      )}
    >
      {label}
    </Link>
  );
}

function PodiumCard({
  rank,
  row,
}: {
  rank: number;
  row: { username: string | null; elo: number; city: string | null };
}) {
  const heights = ["order-2 sm:mt-4", "order-1 sm:-mt-2", "order-3 sm:mt-6"];
  const medals = [
    "text-amber-500",
    "text-stone-400",
    "text-orange-700 dark:text-orange-500",
  ];

  return (
    <div
      className={cn(
        "glass-card p-4 text-center",
        heights[rank - 1],
        rank === 1 && "ring-2 ring-brand-500/30 shadow-glow"
      )}
    >
      <Medal className={cn("h-6 w-6 mx-auto mb-2", medals[rank - 1])} />
      <p className="font-bold text-lg truncate">{row.username ?? "—"}</p>
      <p className="text-2xl font-mono font-bold text-brand-600 dark:text-brand-400 my-1">
        {row.elo}
      </p>
      <p className="text-xs text-stone-500 truncate">{row.city ?? ""}</p>
    </div>
  );
}
