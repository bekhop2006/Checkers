import Link from "next/link";
import { createClient } from "@/shared/lib/supabase/server";
import { PageHeader } from "@/shared/components/ui/PageHeader";
import { History, Sparkles } from "lucide-react";

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
    <div className="page-container py-10 sm:py-14 max-w-2xl">
      <PageHeader title="История партий" subtitle="Завершённые матчи и разбор AI Coach" />

      {matches.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <History className="h-12 w-12 mx-auto text-stone-400 mb-4" />
          <p className="text-stone-600 dark:text-stone-400 mb-6">
            Пока нет завершённых партий. Сыграйте blitz!
          </p>
          <Link href="/play" className="btn-primary">
            Играть
          </Link>
        </div>
      ) : (
        <ul className="space-y-3 animate-slide-up">
          {matches.map((m) => (
            <li
              key={m.id}
              className="glass-card p-4 sm:p-5 flex justify-between items-center gap-4"
            >
              <div>
                <p className="text-sm text-stone-500">
                  {new Date(m.created_at).toLocaleString("ru")}
                </p>
                <p className="font-mono text-sm mt-1 text-brand-700 dark:text-brand-300">
                  {m.white_elo_delta != null
                    ? `Δ W:${m.white_elo_delta} · B:${m.black_elo_delta}`
                    : "—"}
                </p>
              </div>
              <Link
                href={`/match/${m.id}/review`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-500 shrink-0"
              >
                <Sparkles className="h-4 w-4" />
                AI Coach
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
