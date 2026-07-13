import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // Migrations need a DIRECT (non-pooled) connection: Neon/Supabase
    // PgBouncer poolers don't support the advisory locks `migrate deploy`
    // takes.
    //
    // Vercel's Neon integration injects the unpooled URL under its own names,
    // so pick those up automatically — otherwise `vercel-build` would run
    // migrations through the pooler and fail. Falls back to DATABASE_URL for
    // local dev, where pooled and direct are the same connection.
    url:
      process.env.DIRECT_URL ||
      process.env.DATABASE_URL_UNPOOLED ||
      process.env.POSTGRES_URL_NON_POOLING ||
      process.env.DATABASE_URL!,
  },
});
