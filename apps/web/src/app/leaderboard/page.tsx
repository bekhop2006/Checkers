import { createClient } from "@/shared/lib/supabase/server";

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

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">Лидерборд</h1>
      <div className="flex gap-2 mb-6 flex-wrap">
        <a
          href="/leaderboard"
          className={`px-3 py-1 rounded-lg text-sm ${!city ? "bg-amber-600 text-white" : "bg-stone-200 dark:bg-stone-800"}`}
        >
          Global
        </a>
        {cities.map((c) => (
          <a
            key={c}
            href={`/leaderboard?city=${encodeURIComponent(c)}`}
            className={`px-3 py-1 rounded-lg text-sm ${city === c ? "bg-amber-600 text-white" : "bg-stone-200 dark:bg-stone-800"}`}
          >
            {c}
          </a>
        ))}
      </div>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-stone-300 dark:border-stone-700">
            <th className="py-2">#</th>
            <th className="py-2">Игрок</th>
            <th className="py-2">Город</th>
            <th className="py-2">Elo</th>
            <th className="py-2">W/L</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={r.id}
              className="border-b border-stone-100 dark:border-stone-800"
            >
              <td className="py-3">{i + 1}</td>
              <td className="py-3 font-medium">{r.username ?? "—"}</td>
              <td className="py-3 text-stone-500">{r.city ?? "—"}</td>
              <td className="py-3 font-mono text-amber-600">{r.elo}</td>
              <td className="py-3 text-sm text-stone-500">
                {r.wins}/{r.losses}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
