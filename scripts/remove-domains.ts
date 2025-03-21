import { db } from '../server/db';
import { domains } from '../shared/schema';
import { eq, lt } from 'drizzle-orm';

async function removeDomainsExceptSakets() {
  try {
    console.log('Starting to remove domains except Saket\'s...');
    
    // IDs 21-25 are the general domains, while 26-30 are Saket's domains
    // Remove domains with IDs 21-25
    const result = await db.delete(domains).where(lt(domains.id, 26)).returning();
    
    console.log(`Removed ${result.length} domains. Remaining are only Saket's domains (IDs 26-30).`);
    console.log('Removed domains:', result.map(d => `${d.id}: ${d.websiteName}`).join(', '));
  } catch (error) {
    console.error('Error removing domains:', error);
  } finally {
    process.exit(0);
  }
}

removeDomainsExceptSakets();