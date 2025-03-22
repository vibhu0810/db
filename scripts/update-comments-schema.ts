import "dotenv/config";
import { db } from "../server/db";
import { sql } from "drizzle-orm";

async function updateCommentsSchema() {
  console.log("Starting comment schema update...");
  
  try {
    // Add missing columns to order_comments table
    await db.execute(sql`
      ALTER TABLE order_comments 
      ADD COLUMN IF NOT EXISTS is_from_admin BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS read_by_user BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS read_by_admin BOOLEAN NOT NULL DEFAULT false
    `);
    
    console.log("Successfully updated order_comments table schema!");
  } catch (error) {
    console.error("Error updating schema:", error);
    process.exit(1);
  }
  
  process.exit(0);
}

updateCommentsSchema();