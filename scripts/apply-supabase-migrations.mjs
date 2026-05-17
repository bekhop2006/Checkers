/**
 * Applies SQL migrations from backend/supabase/migrations/ in order.
 * Requires DATABASE_URL or SUPABASE_DB_PASSWORD in root .env
 */
import { readFileSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const migrationsDir = join(root, "backend/supabase/migrations");

/** Loads KEY=value pairs from root .env into process.env */
function loadEnv() {
  try {
    const content = readFileSync(join(root, ".env"), "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const value = trimmed.slice(eq + 1).trim();
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    /* no .env */
  }
}

/** Extracts project ref from Supabase URL */
function getProjectRef() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1] ?? null;
}

/** Candidate connection strings (pooler IPv4 + direct IPv6) */
function getConnectionCandidates() {
  if (process.env.DATABASE_URL) {
    return [process.env.DATABASE_URL];
  }

  const password = process.env.SUPABASE_DB_PASSWORD;
  const ref = getProjectRef();
  if (!password || !ref) return [];

  const enc = encodeURIComponent(password);
  const host = process.env.SUPABASE_DB_HOST;
  const port = process.env.SUPABASE_DB_PORT ?? "5432";

  const urls = [];

  if (host) {
    urls.push(
      `postgresql://postgres.${ref}:${enc}@${host}:${port}/postgres`,
      `postgresql://postgres:${enc}@${host}:${port}/postgres`
    );
  }

  const regions = (process.env.SUPABASE_DB_REGION ?? "")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);

  const defaultRegions = [
    "eu-central-1",
    "eu-west-1",
    "eu-west-2",
    "eu-west-3",
    "eu-north-1",
    "us-east-1",
    "us-east-2",
    "us-west-1",
    "us-west-2",
    "ap-southeast-1",
    "ap-southeast-2",
    "ap-northeast-1",
    "ap-northeast-2",
    "ap-south-1",
    "ca-central-1",
    "sa-east-1",
  ];

  for (const region of [...new Set([...regions, ...defaultRegions])]) {
    for (const prefix of ["aws-0", "aws-1"]) {
      const pooler = `${prefix}-${region}.pooler.supabase.com`;
      urls.push(
        `postgresql://postgres.${ref}:${enc}@${pooler}:5432/postgres`,
        `postgresql://postgres.${ref}:${enc}@${pooler}:6543/postgres`
      );
    }
  }

  urls.push(
    `postgresql://postgres:${enc}@db.${ref}.supabase.co:5432/postgres`
  );

  return [...new Set(urls)];
}

/** Connects using first working candidate URL */
async function connectPg() {
  const candidates = getConnectionCandidates();
  if (candidates.length === 0) return null;

  let lastError;
  for (const connectionString of candidates) {
    const client = new pg.Client({
      connectionString,
      ssl: { rejectUnauthorized: false },
      connectionTimeoutMillis: 8000,
    });
    try {
      await client.connect();
      await client.query("select 1");
      return client;
    } catch (err) {
      lastError = err;
      await client.end().catch(() => {});
    }
  }

  throw lastError ?? new Error("Could not connect to database");
}

/** Runs migration files sequentially */
async function main() {
  loadEnv();

  if (getConnectionCandidates().length === 0) {
    console.error(`
Missing database credentials.

Add to .env ONE of:

  DATABASE_URL=...   (copy from Supabase → Settings → Database → Connection string → Session)

  SUPABASE_DB_PASSWORD=...

Optional: SUPABASE_DB_HOST / SUPABASE_DB_REGION=eu-central-1
`);
    process.exit(1);
  }

  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  console.log("Connecting to Supabase Postgres...");
  const client = await connectPg();
  console.log(`Connected. Applying ${files.length} migrations...\n`);

  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    process.stdout.write(`→ ${file} ... `);
    try {
      await client.query(sql);
      console.log("OK");
    } catch (err) {
      console.log("FAILED");
      console.error(err.message);
      await client.end();
      process.exit(1);
    }
  }

  await client.end();
  console.log("\nAll migrations applied.");
}

main().catch((err) => {
  console.error(err.message ?? err);
  process.exit(1);
});
