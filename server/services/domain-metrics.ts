import { storage } from "../storage";
import { getDomainMetrics } from "./ahrefs";

const UPDATE_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export async function updateDomainMetrics() {
  try {
    console.log("Starting domain metrics update...");
    const domains = await storage.getDomains();

    for (const domain of domains) {
      try {
        // Extract domain from URL
        const url = new URL(domain.websiteUrl);
        const metrics = await getDomainMetrics(url.hostname);

        // Update domain with new metrics
        await storage.updateDomain(domain.id, {
          ...domain,
          domainRating: metrics.domainRating,
          websiteTraffic: metrics.traffic,
          lastMetricsUpdate: new Date(),
        });

        console.log(`Updated metrics for ${domain.websiteUrl}`);
        
        // Add delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to update metrics for ${domain.websiteUrl}:`, error);
        // Continue with next domain even if one fails
        continue;
      }
    }
    console.log("Domain metrics update completed");
  } catch (error) {
    console.error("Error updating domain metrics:", error);
  }
}

// Start periodic updates
export function startMetricsUpdates() {
  // Do initial update
  updateDomainMetrics();

  // Set up periodic updates
  setInterval(updateDomainMetrics, UPDATE_INTERVAL);
}
