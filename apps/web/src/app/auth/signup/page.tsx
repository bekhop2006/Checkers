"use client";

import Link from "next/link";
import { createClient, isSupabaseConfigured } from "@/shared/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useState } from "react";

const CITIES = ["Алматы", "Астана", "Шымкент", "Караганда", "Другой"];

/** Registration page — profile created with elo=1000 via DB trigger. */
export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [city, setCity] = useState("Алматы");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const signup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupabaseConfigured()) {
      setError("Supabase не настроен");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data, error: err } = await supabase.auth.signUp({ email, password });
    if (err) {
      setLoading(false);
      setError(err.message);
      return;
    }
    if (data.user) {
      await supabase
        .from("profiles")
        .update({ username, city })
        .eq("id", data.user.id);
    }
    setLoading(false);
    router.push("/play");
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <h1 className="text-2xl font-bold mb-2">Регистрация</h1>
      <p className="text-stone-500 text-sm mb-6">Стартовый рейтинг: 1000 Elo</p>
      <form onSubmit={signup} className="flex flex-col gap-4">
        <input
          type="text"
          placeholder="Имя игрока"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="px-4 py-3 rounded-lg border dark:bg-stone-900"
          required
        />
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="px-4 py-3 rounded-lg border dark:bg-stone-900"
        >
          {CITIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
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
          placeholder="Пароль (мин. 6)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="px-4 py-3 rounded-lg border dark:bg-stone-900"
          minLength={6}
          required
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="py-3 rounded-lg bg-amber-600 text-white font-semibold"
        >
          {loading ? "..." : "Создать аккаунт"}
        </button>
      </form>
      <p className="mt-4 text-sm text-stone-500">
        Уже есть аккаунт?{" "}
        <Link href="/auth/login" className="text-amber-600">
          Войти
        </Link>
      </p>
    </div>
  );
}
