import { NextResponse } from "next/server";
import { createClient } from "@/shared/lib/supabase/server";
import type { FinishMatchResponse } from "@checkers/shared-types";
interface FinishBody {
  winnerId: string | null;
  reason: string;
}

/** Finishes a rated match and updates Elo via Supabase RPC. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await request.json()) as FinishBody;

  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase.rpc("finish_rated_match", {
      p_match_id: id,
      p_winner_id: body.winnerId,
      p_ended_reason: body.reason ?? "checkmate",
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: match } = await supabase
      .from("matches")
      .select(
        "white_id, black_id, white_elo_before, black_elo_before, white_elo_delta, black_elo_delta"
      )
      .eq("id", id)
      .single();

    if (!match) {
      return NextResponse.json(data as FinishMatchResponse);
    }

    const response: FinishMatchResponse = {
      ...(typeof data === "object" && data !== null ? (data as object) : {}),
      white: {
        userId: match.white_id!,
        before: match.white_elo_before ?? 0,
        after: (match.white_elo_before ?? 0) + (match.white_elo_delta ?? 0),
        delta: match.white_elo_delta ?? 0,
      },
      black: {
        userId: match.black_id!,
        before: match.black_elo_before ?? 0,
        after: (match.black_elo_before ?? 0) + (match.black_elo_delta ?? 0),
        delta: match.black_elo_delta ?? 0,
      },
    };

    return NextResponse.json(response);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Server error" },
      { status: 500 }
    );
  }
}
