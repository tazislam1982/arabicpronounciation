import { neon, neonConfig } from "@neondatabase/serverless";

neonConfig.fetchConnectionCache = true;

export const sql = neon(process.env.DATABASE_URL!);
