"use client";

import { createClient, isSupabaseConfigured } from "@/shared/lib/supabase/client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

export interface Profile {
  id: string;
  username: string | null;
  city: string | null;
  elo: number;
  is_pro: boolean;
  wins: number;
  losses: number;
  draws: number;
}

const DEMO_PROFILE: Profile = {
  id: "demo",
  username: "demo_player",
  city: "Алматы",
  elo: 1000,
  is_pro: false,
  wins: 0,
  losses: 0,
  draws: 0,
};

/** Loads current user and profile from Supabase. */
export function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(
    isSupabaseConfigured() ? null : DEMO_PROFILE
  );
  const [loading, setLoading] = useState(isSupabaseConfigured());

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    const supabase = createClient();

    const load = async () => {
      const {
        data: { user: u },
      } = await supabase.auth.getUser();
      setUser(u);
      if (u) {
        const { data } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", u.id)
          .single();
        setProfile(data as Profile | null);
      } else {
        setProfile(null);
      }
      setLoading(false);
    };

    load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => load());

    return () => subscription.unsubscribe();
  }, []);

  return { user, profile, loading };
}
