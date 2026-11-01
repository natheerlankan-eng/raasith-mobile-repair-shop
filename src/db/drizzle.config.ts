import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

const databaseUrl = (process.env.DATABASE_URL || "").trim();

let dbCredentials: any;
if (databaseUrl) {
  dbCredentials = { url: databaseUrl };
} else {
  const sqlHost = process.env.SQL_HOST;
  const sqlDbName = process.env.SQL_DB_NAME;
  const user = process.env.SQL_ADMIN_USER;
  const password = process.env.SQL_ADMIN_PASSWORD;
  if (!sqlHost || !sqlDbName || !user || !password) {
    throw new Error("Set DATABASE_URL, or set SQL_HOST, SQL_DB_NAME, SQL_ADMIN_USER and SQL_ADMIN_PASSWORD.");
  }
  dbCredentials = { host: sqlHost, user, password, database: sqlDbName, ssl: false };
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  schemaFilter: ["public"],
  dbCredentials,
  verbose: true,
});
