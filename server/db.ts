import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  console.error("Database connection error:");
  console.error("- DATABASE_URL environment variable is missing");
  console.error("- Please add DATABASE_URL in deployment secrets");
  console.error("- Format: postgresql://user:password@host:port/database");
  process.exit(1);
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });
