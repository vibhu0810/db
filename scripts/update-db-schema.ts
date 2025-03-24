import { drizzle } from 'drizzle-orm/neon-serverless';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';
import * as schema from '../shared/schema';
import { migrate } from 'drizzle-orm/neon-serverless/migrator';
import { sql } from 'drizzle-orm';

// Setup Neon DB connection
neonConfig.webSocketConstructor = ws;

async function updateSchema() {
  if (!process.env.DATABASE_URL) {
    console.error("Missing DATABASE_URL environment variable");
    process.exit(1);
  }

  console.log("Connecting to database...");
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });

  console.log("Verifying database connection...");
  try {
    const result = await db.execute(sql`SELECT 1`);
    console.log("Database connection successful");
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }

  // Create a separate function to handle direct SQL commands that may need to
  // be applied if the schema update needs specific handling
  async function executeSql(query: string) {
    try {
      await pool.query(query);
      console.log(`Successfully executed: ${query.substring(0, 50)}...`);
    } catch (error) {
      console.error(`Error executing SQL: ${query.substring(0, 50)}...`, error);
    }
  }

  // Handle specific cases not covered by simple schema updates
  try {
    // Add any specific SQL commands needed for handling issues the automatic migration might miss
    
    // Make sure all fields in the users table exist
    console.log("Checking users table for missing columns...");
    // Add any missing fields that might cause conflicts
    await executeSql(`
      DO $$ 
      BEGIN 
        ALTER TABLE users ADD COLUMN IF NOT EXISTS linkedin_url text;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram_profile text;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS date_of_birth text;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_number text;
        ALTER TABLE users ADD COLUMN IF NOT EXISTS company_logo text;
      EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'Error adding missing columns to users: %', SQLERRM; 
      END $$;
    `);

    // Fix any order_comments issues
    console.log("Checking order_comments table...");
    await executeSql(`
      DO $$ 
      BEGIN 
        ALTER TABLE order_comments ADD COLUMN IF NOT EXISTS attachment_url text;
        ALTER TABLE order_comments ADD COLUMN IF NOT EXISTS attachment_type text;
        ALTER TABLE order_comments ADD COLUMN IF NOT EXISTS is_system_message boolean DEFAULT false;
      EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'Error adding missing columns to order_comments: %', SQLERRM; 
      END $$;
    `);

    // Fix any messages table issues
    console.log("Checking messages table...");
    await executeSql(`
      DO $$ 
      BEGIN 
        ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_url text;
        ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_type text;
      EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'Error adding missing columns to messages: %', SQLERRM; 
      END $$;
    `);

    // Make sure notifications table has ticket_id field
    console.log("Checking notifications table...");
    await executeSql(`
      DO $$ 
      BEGIN 
        ALTER TABLE notifications ADD COLUMN IF NOT EXISTS ticket_id integer;
      EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'Error adding missing columns to notifications: %', SQLERRM; 
      END $$;
    `);

    // Make sure invoices table has all needed fields
    console.log("Checking invoices table...");
    await executeSql(`
      DO $$ 
      BEGIN 
        ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_email text;
        ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_method text;
        ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_fee integer DEFAULT 0;
      EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'Error adding missing columns to invoices: %', SQLERRM; 
      END $$;
    `);

    console.log("Schema update preparation completed.");
  } catch (error) {
    console.error("Error in schema update preparation:", error);
  }

  // Close the pool
  await pool.end();
  console.log("Database update completed.");
}

// Run the update function
updateSchema().catch(console.error);