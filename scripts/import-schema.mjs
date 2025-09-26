// scripts/import-schema.mjs
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Client } from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read DATABASE_URL from env
const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ Missing DATABASE_URL environment variable.");
  process.exit(1);
}

const schemaPath = path.join(__dirname, ".", "", "schema.sql");

async function main() {
  // Load schema file
  if (!fs.existsSync(schemaPath)) {
    console.error(`❌ Schema file not found at ${schemaPath}`);
    process.exit(1);
  }
  const sql = fs.readFileSync(schemaPath, "utf-8").trim();
  if (!sql) {
    console.error("❌ schema.sql is empty.");
    process.exit(1);
  }

  const client = new Client({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

  console.log("⛓️  Connecting to database…");
  await client.connect();

  try {
    console.log("🚀 Running schema inside a transaction…");
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
    console.log("✅ Schema imported successfully!");
  } catch (err) {
    console.error("❌ Error applying schema. Rolling back…");
    await client.query("ROLLBACK");
    console.error(err);
    process.exitCode = 1;
  } finally {
    await client.end();
  }
}

main();
