"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Zap } from "lucide-react";
import { nanoid } from "nanoid";
import { createClient, isSupabaseConfigured } from "@/shared/lib/supabase/client";
import { useAuth } from "@/features/auth/context/auth-context";

/** Creates a blitz room to invite a friend. */
export function InviteToBlitzButton() {
  const router = useRouter();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const invite = async () => {
    if (!user) {
      router.push("/auth/login?redirect=/play");
      return;
    }

    if (!isSupabaseConfigured()) {
      router.push(`/play/${nanoid(10)}`);
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const roomId = nanoid(10);
    const { data, error } = await supabase
      .from("matches")
      .insert({
        room_id: roomId,
        white_id: user.id,
        rated: true,
        mode: "blitz",
        status: "waiting",
      })
      .select("id")
      .single();

    setLoading(false);
    const suffix = data?.id ? `?matchId=${data.id}` : "";
    router.push(`/play/${roomId}${suffix}`);
  };

  return (
    <button
      type="button"
      onClick={() => void invite()}
      disabled={loading}
      className="btn-primary w-full disabled:opacity-50"
    >
      <Zap className="h-5 w-5" />
      {loading ? "Создание..." : "Пригласить в Blitz"}
    </button>
  );
}
