import { db } from '../server/db';
import { domains, InsertDomain } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function addSaketDomains() {
  try {
    console.log('Starting to add domains for Saket...');
    
    const userId = 135; // Saket's user ID
    
    // Domain data from the CSV
    const domainsData = [
      {
        websiteName: 'Survey Sparrow',
        websiteUrl: 'surveysparrow.com',
        domainRating: '80',
        websiteTraffic: 170000,
        type: 'niche_edit',
        nicheEditPrice: '350',
        guidelines: 'Niche edit in listicle articles is not allowed',
        nicheEditTurnaround: '4 - 5 Working Days',
        niche: 'CRM / Software',
        userId: userId
      },
      {
        websiteName: 'EngageBay',
        websiteUrl: 'engagebay.com',
        domainRating: '78',
        websiteTraffic: 55000,
        type: 'niche_edit',
        nicheEditPrice: '350',
        guidelines: 'Branded anchor texts are is not allowed',
        nicheEditTurnaround: '2 - 3 Working Days',
        niche: 'CRM / Software',
        userId: userId
      },
      {
        websiteName: 'Lead Gen App',
        websiteUrl: 'leadgenapp.io',
        domainRating: '68',
        websiteTraffic: 3200,
        type: 'guest_post',
        guestPostPrice: '280',
        guestPostTurnaround: '1 - 3 Working Days',
        niche: 'CRM / Software',
        userId: userId
      },
      {
        websiteName: 'Bookafy',
        websiteUrl: 'bookafy.com',
        domainRating: '76',
        websiteTraffic: 4900,
        type: 'both',
        guestPostPrice: '340',
        nicheEditPrice: '290',
        guestPostTurnaround: '1 - 3 Working Days',
        nicheEditTurnaround: '1 - 3 Working Days',
        niche: 'CRM / Software',
        userId: userId
      },
      {
        websiteName: 'Outright CRM',
        websiteUrl: 'outrightcrm.com',
        domainRating: '53',
        websiteTraffic: 13200,
        type: 'both',
        guestPostPrice: '190',
        nicheEditPrice: '140',
        guestPostTurnaround: '4 - 5 Working Days',
        nicheEditTurnaround: '1 - 3 Working Days',
        niche: 'CRM / Software',
        userId: userId
      }
    ];

    for (const domainData of domainsData) {
      // Check if the domain already exists
      const existingDomain = await db
        .select()
        .from(domains)
        .where(eq(domains.websiteUrl, domainData.websiteUrl))
        .limit(1);
      
      if (existingDomain.length > 0) {
        console.log(`Domain ${domainData.websiteUrl} already exists, skipping...`);
        continue;
      }

      // Insert the domain
      const insertedDomain = await db.insert(domains).values(domainData).returning();
      console.log(`Added domain: ${domainData.websiteUrl} with ID: ${insertedDomain[0].id}`);
    }

    console.log('Finished adding domains for Saket.');
  } catch (error) {
    console.error('Error adding domains:', error);
  } finally {
    process.exit(0);
  }
}

addSaketDomains();