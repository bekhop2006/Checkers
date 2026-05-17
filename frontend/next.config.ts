import type { NextConfig } from "next";
import path from "path";
import { loadEnvConfig } from "@next/env";

const monorepoRoot = path.join(__dirname, "..");

/** Load .env from monorepo root and frontend/ */
loadEnvConfig(monorepoRoot);
loadEnvConfig(__dirname);

const publicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  NEXT_PUBLIC_SUPABASE_ANON_KEY:
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  NEXT_PUBLIC_PARTYKIT_HOST:
    process.env.NEXT_PUBLIC_PARTYKIT_HOST ?? "localhost:1999",
};

const nextConfig: NextConfig = {
  transpilePackages: ["@checkers/engine", "@checkers/shared-types"],
  /** Inline public env into client bundle (monorepo root .env) */
  env: publicEnv,
};

export default nextConfig;
