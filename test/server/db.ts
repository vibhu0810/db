import { PostgreSQLAdapter } from 'drizzle-orm/postgres-js';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../shared/schema';
import { Pool } from 'pg';

// Use the same DATABASE_URL from the parent application
// We'll create separate tables in the same database with a different prefix
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL 
});

// Create a client for Drizzle with PostgreSQL
export const db = drizzle(pool, { schema });

// Export for use in other parts of the application
export type DB = typeof db;