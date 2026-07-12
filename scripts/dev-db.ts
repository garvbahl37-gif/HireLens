/**
 * Boots a real PostgreSQL server locally (binaries ship with the
 * `embedded-postgres` dev dependency) so the app can be developed and
 * tested without Docker or a system Postgres install.
 *
 * Production uses a hosted Postgres (Neon) via DATABASE_URL instead.
 *
 *   npm run db:dev
 */
import EmbeddedPostgres from "embedded-postgres";
import { existsSync } from "node:fs";
import { join } from "node:path";

const PORT = 55432;
const DB = "hirelens";
const DATA_DIR = "./.pgdata";

async function main() {
  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: "postgres",
    password: "postgres",
    port: PORT,
    persistent: true,
  });

  if (!existsSync(join(DATA_DIR, "PG_VERSION"))) {
    await pg.initialise();
  }

  await pg.start();

  try {
    await pg.createDatabase(DB);
  } catch {
    // database already exists from a previous run
  }

  console.log(
    `\n[dev-db] PostgreSQL running at postgresql://postgres:postgres@localhost:${PORT}/${DB}\n[dev-db] Press Ctrl+C to stop.`
  );

  const stop = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
}

main().catch((err) => {
  console.error("[dev-db] failed:", err);
  process.exit(1);
});
