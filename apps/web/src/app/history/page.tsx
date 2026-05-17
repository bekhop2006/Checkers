import Link from "next/link";
import { createClient } from "@/shared/lib/supabase/server";

/** Match history for logged-in user. */
export default async function HistoryPage() {
  let matches: {
    id: string;
    created_at: string;
    white_elo_delta: number | null;
    black_elo_delta: number | null;
    winner_id: string | null;
    status: string;
  }[] = [];

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("matches")
        .select(
          "id, created_at, white_elo_delta, black_elo_delta, winner_id, status, white_id, black_id"
        )
        .or(`white_id.eq.${user.id},black_id.eq.${user.id}`)
        .eq("status", "finished")
        .order("created_at", { ascending: false })
        .limit(20);
      matches = data ?? [];
    }
  } catch {
    /* demo empty */
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-6">История партий</h1>
      {matches.length === 0 ? (
        <p className="text-stone-500">Пока нет завершённых партий.</p>
      ) : (
        <ul className="space-y-3">
          {matches.map((m) => (
            <li
              key={m.id}
              className="p-4 rounded-xl border border-stone-200 dark:border-stone-800 flex justify-between items-center"
            >
              <div>
                <p className="text-sm text-stone-500">
                  {new Date(m.created_at).toLocaleString("ru")}
                </p>
                <p className="font-mono text-sm">
                  Δ{" "}
                  {m.white_elo_delta != null
                    ? `W:${m.white_elo_delta} B:${m.black_elo_delta}`
                    : "—"}
                </p>
              </div>
              <Link
                href={`/match/${m.id}/review`}
                className="text-amber-600 text-sm font-medium"
              >
                AI Coach →
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
