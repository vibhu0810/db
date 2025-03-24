import { storage } from '../server/storage';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';

async function importDomains() {
  try {
    console.log('Starting domains import from CSV...');
    
    // Read CSV file
    const filePath = path.join(process.cwd(), 'attached_assets', 'Domains.csv');
    const csvContent = fs.readFileSync(filePath, 'utf8');
    
    // Parse CSV data
    const records = parse(csvContent, {
      columns: true,
      skipEmptyLines: true,
      trim: true
    });
    
    console.log(`Found ${records.length} domains in CSV`);
    
    // First, let's check which domains already exist
    const existingDomains = await storage.getDomains();
    const existingDomainUrls = new Set(existingDomains.map(d => d.websiteUrl));
    
    console.log(`There are ${existingDomains.length} domains already in the database`);
    
    // Process each domain
    for (const record of records) {
      const websiteUrl = record.Website;
      
      // Skip if domain already exists
      if (existingDomainUrls.has(websiteUrl)) {
        console.log(`Skipping ${websiteUrl} - already exists`);
        continue;
      }
      
      const domainRating = record.DR || '0';
      const websiteTraffic = parseInt(record.Traffic || '0', 10);
      const type = record.Type?.toLowerCase() || 'both';
      
      // Handle guest post and niche edit prices
      let guestPostPrice = null;
      let nicheEditPrice = null;
      
      if (record['Guest Post Price'] && record['Guest Post Price'] !== '--') {
        guestPostPrice = parseFloat(record['Guest Post Price']);
      }
      
      if (record['Niche Edit Price'] && record['Niche Edit Price'] !== '--') {
        nicheEditPrice = parseFloat(record['Niche Edit Price']);
      }
      
      // Extract domain name from URL to use as website name
      let websiteName = websiteUrl;
      try {
        const url = new URL(websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl}`);
        websiteName = url.hostname.replace(/^www\./i, '');
      } catch (e) {
        console.warn(`Could not parse URL for ${websiteUrl}, using as is`);
      }
      
      // Create new domain
      try {
        await storage.createDomain({
          websiteName,
          websiteUrl,
          domainRating: domainRating.toString(),
          websiteTraffic,
          type,
          guestPostPrice: guestPostPrice?.toString() || null,
          nicheEditPrice: nicheEditPrice?.toString() || null,
          guidelines: record.Guidelines || ''
        });
        console.log(`Created domain: ${websiteUrl}`);
      } catch (error) {
        console.error(`Error creating domain ${websiteUrl}:`, error);
      }
    }
    
    console.log('Domain import completed');
  } catch (error) {
    console.error('Error importing domains:', error);
  }
}

// Run the import
importDomains().then(() => {
  console.log('Script execution completed');
  process.exit(0);
}).catch(err => {
  console.error('Script execution failed:', err);
  process.exit(1);
});