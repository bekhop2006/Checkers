"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

/** AI Coach review page for a finished match. */
export default function MatchReviewPage() {
  const params = useParams();
  const matchId = params.id as string;
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<{
    headline: string;
    summary: string;
    moments: { ply: number; text: string; type: string }[];
  } | null>(null);
  const [error, setError] = useState("");

  const generate = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, moves: [] }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      setReport(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12">
      <Link href="/history" className="text-amber-600 text-sm mb-4 inline-block">
        ← История
      </Link>
      <h1 className="text-3xl font-bold mb-4">AI Coach</h1>
      <p className="text-stone-500 mb-6">Партия {matchId}</p>

      {!report && (
        <button
          type="button"
          onClick={generate}
          disabled={loading}
          className="px-6 py-3 rounded-xl bg-cyan-600 text-white font-semibold disabled:opacity-50"
        >
          {loading ? "Анализ..." : "Получить разбор"}
        </button>
      )}

      {error && <p className="text-red-500 mt-4">{error}</p>}

      {report && (
        <div className="mt-6 space-y-4">
          <h2 className="text-xl font-bold">{report.headline}</h2>
          <p className="whitespace-pre-wrap text-stone-600 dark:text-stone-400">
            {report.summary}
          </p>
          {report.moments?.map((m) => (
            <div
              key={m.ply}
              className="p-4 rounded-lg bg-stone-100 dark:bg-stone-900 border-l-4 border-cyan-500"
            >
              <span className="text-xs text-stone-500">Ход {m.ply}</span>
              <p className="mt-1">{m.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
