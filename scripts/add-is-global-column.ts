import { db } from "../server/db";
import { sql } from "drizzle-orm";

/**
 * This script adds the isGlobal column to the domains table
 * and sets existing domains to have isGlobal = true
 */
async function addIsGlobalColumn() {
  try {
    console.log("Starting to add isGlobal column to domains table...");
    
    // Check if column exists
    try {
      await db.execute(sql`SELECT is_global FROM domains LIMIT 1`);
      console.log("Column 'is_global' already exists. No action needed.");
      return;
    } catch (error) {
      console.log("Column 'is_global' doesn't exist. Adding it now...");
    }
    
    // Add the isGlobal column with default true
    await db.execute(sql`
      ALTER TABLE domains 
      ADD COLUMN is_global BOOLEAN DEFAULT TRUE NOT NULL
    `);
    
    console.log("Successfully added 'is_global' column to domains table");
    
    // Add the userId column
    try {
      await db.execute(sql`SELECT user_id FROM domains LIMIT 1`);
      console.log("Column 'user_id' already exists. No action needed.");
    } catch (error) {
      console.log("Column 'user_id' doesn't exist. Adding it now...");
      
      await db.execute(sql`
        ALTER TABLE domains 
        ADD COLUMN user_id INTEGER REFERENCES users(id) ON DELETE CASCADE
      `);
      
      console.log("Successfully added 'user_id' column to domains table");
    }
    
    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Error migrating domains:", error);
  }
}

// Run the migration
addIsGlobalColumn().catch(console.error);