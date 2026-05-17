"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Search, User } from "lucide-react";
import { createClient, isSupabaseConfigured } from "@/shared/lib/supabase/client";
import { normalizeUsername, playerProfilePath } from "@/shared/lib/username";
import { EloBadge } from "@/features/rating/components/EloBadge";
import { useT } from "@/shared/i18n/context/locale-context";

interface PlayerRow {
  id: string;
  username: string;
  city: string | null;
  elo: number;
}

/** Search players by nickname substring. */
export function PlayerSearch() {
  const t = useT();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = useCallback(async (raw: string) => {
    const q = normalizeUsername(raw);
    if (q.length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }

    if (!isSupabaseConfigured()) {
      setResults([]);
      setSearched(true);
      return;
    }

    setLoading(true);
    setSearched(true);
    const supabase = createClient();
    const { data, error } = await supabase
      .from("profiles")
      .select("id, username, city, elo")
      .ilike("username", `%${q}%`)
      .not("username", "is", null)
      .not("username", "like", "player_%")
      .order("elo", { ascending: false })
      .limit(20);

    setLoading(false);
    if (error) {
      console.error(error);
      setResults([]);
      return;
    }

    setResults(
      (data ?? []).filter((r): r is PlayerRow => Boolean(r.username)) as PlayerRow[]
    );
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      void search(query);
    }, 300);
    return () => clearTimeout(t);
  }, [query, search]);

  return (
    <section className="space-y-6">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("players.searchPlaceholder")}
          className="input-field pl-12"
          autoComplete="off"
        />
      </div>
      <p className="text-sm text-stone-500">{t("players.searchHint")}</p>

      {loading ? (
        <p className="text-center text-stone-500 py-8">{t("players.searching")}</p>
      ) : null}

      {!loading && searched && results.length === 0 ? (
        <p className="text-center text-stone-500 py-8 glass-card">
          {t("players.notFound")}
        </p>
      ) : null}

      <ul className="space-y-2">
        {results.map((player) => (
          <li key={player.id}>
            <Link
              href={playerProfilePath(player.username)}
              className="glass-card p-4 flex items-center gap-4 hover:border-brand-500/30 transition-colors"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-100 dark:bg-brand-950/50 text-brand-700 dark:text-brand-300">
                <User className="h-5 w-5" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="font-semibold block truncate">@{player.username}</span>
                <span className="text-sm text-stone-500">{player.city ?? "—"}</span>
              </span>
              <EloBadge elo={player.elo} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
