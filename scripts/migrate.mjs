// Applies supabase/migrations/*.sql to the database in SUPABASE_DB_URL, in order,
// skipping files that were already applied.
// Usage: npm run db:migrate
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const url = process.env.SUPABASE_DB_URL;
if (!url) {
  console.error("✗ SUPABASE_DB_URL is empty in .env.local (Connect → Session pooler).");
  process.exit(1);
}
if (url.includes("[YOUR-")) {
  console.error("✗ SUPABASE_DB_URL still contains the [YOUR-PASSWORD] placeholder.");
  process.exit(1);
}

const dir = path.resolve("supabase/migrations");
const files = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

try {
  await client.query(`
    create schema if not exists mirra_meta;
    create table if not exists mirra_meta.migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    );
  `);
  const { rows } = await client.query("select name from mirra_meta.migrations");
  const done = new Set(rows.map((r) => r.name));

  let applied = 0;
  for (const file of files) {
    if (done.has(file)) continue;
    const sql = await readFile(path.join(dir, file), "utf8");
    process.stdout.write(`→ ${file} ... `);
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query("insert into mirra_meta.migrations (name) values ($1)", [file]);
      await client.query("commit");
      console.log("ok");
      applied++;
    } catch (err) {
      await client.query("rollback");
      console.log("failed");
      throw err;
    }
  }
  console.log(applied ? `✓ Applied ${applied} migration(s).` : "✓ Database already up to date.");
} finally {
  await client.end();
}
