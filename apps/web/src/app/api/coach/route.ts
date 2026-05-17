import { NextResponse } from "next/server";
import { createClient } from "@/shared/lib/supabase/server";
import { detectCriticalMoments } from "@/features/coach/lib/detectCriticalMoments";
import { createInitialState } from "@checkers/engine";
import type { Move } from "@checkers/engine";

/** Generates AI Coach report for a match (OpenAI or mock). */
export async function POST(request: Request) {
  const { matchId, moves } = (await request.json()) as {
    matchId: string;
    moves: Move[];
  };

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_pro, coach_uses_today, coach_reset_date")
      .eq("id", user.id)
      .single();

    const today = new Date().toISOString().slice(0, 10);
    let uses = profile?.coach_uses_today ?? 0;
    if (profile?.coach_reset_date !== today) uses = 0;

    if (!profile?.is_pro && uses >= 1) {
      return NextResponse.json(
        { error: "Daily coach limit reached. Upgrade to Pro." },
        { status: 403 }
      );
    }

    const moments = detectCriticalMoments(createInitialState(), moves);
    let headline = "Хорошая партия! Серьёзных ошибок не найдено.";
    let summary = "Продолжайте тренировать blitz и следить за взятиями.";

    if (moments.length > 0) {
      headline = moments[0].text;
      summary = moments.map((m) => `• ${m.text}`).join("\n");
    }

    if (process.env.OPENAI_API_KEY) {
      try {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  "Ты тренер по русским шашкам. Отвечай на русском, кратко, JSON: {headline, summary}",
              },
              {
                role: "user",
                content: `Критические моменты: ${JSON.stringify(moments)}`,
              },
            ],
            response_format: { type: "json_object" },
          }),
        });
        const json = await res.json();
        const content = json.choices?.[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          headline = parsed.headline ?? headline;
          summary = parsed.summary ?? summary;
        }
      } catch {
        /* fallback to heuristic */
      }
    }

    await supabase.from("coach_reports").insert({
      match_id: matchId,
      user_id: user.id,
      summary_ru: summary,
      headline,
      moments_json: moments,
    });

    if (!profile?.is_pro) {
      await supabase
        .from("profiles")
        .update({
          coach_uses_today: uses + 1,
          coach_reset_date: today,
        })
        .eq("id", user.id);
    }

    return NextResponse.json({ headline, summary, moments });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error" },
      { status: 500 }
    );
  }
}
