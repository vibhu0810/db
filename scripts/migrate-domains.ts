import { eq, isNull } from "drizzle-orm";
import { db } from "../server/db";
import { domains } from "../shared/schema";

/**
 * This script migrates existing domains to have the isGlobal flag set to true
 * for backward compatibility, ensuring existing domains will be visible to all users.
 */
async function migrateDomains() {
  try {
    console.log("Starting domains migration...");
    
    // First check how many domains need updating
    const domainsToUpdate = await db.select().from(domains).where(eq(domains.isGlobal, false));
    const domainsWithoutFlag = await db.select().from(domains).where(isNull(domains.isGlobal));
    
    console.log(`Found ${domainsToUpdate.length} domains with isGlobal=false`);
    console.log(`Found ${domainsWithoutFlag.length} domains with isGlobal=null`);
    
    // Update domains where isGlobal is false
    if (domainsToUpdate.length > 0) {
      const updateResult = await db.update(domains)
        .set({ isGlobal: true })
        .where(eq(domains.isGlobal, false))
        .returning();
      
      console.log(`Successfully updated ${updateResult.length} domains from isGlobal=false to isGlobal=true`);
    }
    
    // Update domains where isGlobal is null
    if (domainsWithoutFlag.length > 0) {
      const updateNullResult = await db.update(domains)
        .set({ isGlobal: true })
        .where(isNull(domains.isGlobal))
        .returning();
      
      console.log(`Successfully updated ${updateNullResult.length} domains from isGlobal=null to isGlobal=true`);
    }
    
    console.log("Domain migration completed successfully!");
  } catch (error) {
    console.error("Error migrating domains:", error);
  }
}

// Run the migration
migrateDomains().catch(console.error);