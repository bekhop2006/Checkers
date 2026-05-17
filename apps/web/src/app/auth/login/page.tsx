"use client";

import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/shared/lib/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

/** Email/password login page. */
export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/play";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured()) {
      setError("Supabase не настроен. См. .env.example");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: err } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (err) setError(err.message);
    else router.push(redirect);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold mb-6">Вход</h1>
      <form onSubmit={login} className="flex flex-col gap-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="px-4 py-3 rounded-lg border dark:bg-stone-900"
          required
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="px-4 py-3 rounded-lg border dark:bg-stone-900"
          required
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="py-3 rounded-lg bg-amber-600 text-white font-semibold"
        >
          {loading ? "..." : "Войти"}
        </button>
      </form>
      <p className="mt-4 text-sm text-stone-500">
        Нет аккаунта?{" "}
        <Link href="/auth/signup" className="text-amber-600">
          Регистрация
        </Link>
      </p>
    </div>
  );
}
