"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient, isSupabaseConfigured } from "@/shared/lib/supabase/client";
import { useUser } from "@/shared/hooks/useUser";
import { nanoid } from "nanoid";

/** Creates a rated blitz room and redirects to play URL. */
export function CreateBlitzRoom() {
  const router = useRouter();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);

  const create = async () => {
    if (!isSupabaseConfigured()) {
      const roomId = nanoid(10);
      router.push(`/play/${roomId}`);
      return;
    }

    if (!user) {
      router.push("/auth/login?redirect=/play");
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
    if (error) {
      console.error(error);
      router.push(`/play/${roomId}`);
      return;
    }
    router.push(`/play/${roomId}?matchId=${data.id}`);
  };

  return (
    <button
      type="button"
      onClick={create}
      disabled={loading}
      className="w-full py-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-lg disabled:opacity-50"
    >
      {loading ? "Создание..." : "⚡ Blitz по ссылке (рейтинг)"}
    </button>
  );
}
