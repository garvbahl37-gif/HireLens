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
    // takes. Falls back to DATABASE_URL for local/dev where they're the same.
    url: process.env.DIRECT_URL || process.env.DATABASE_URL!,
  },
});
