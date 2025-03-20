import { storage } from "../storage";
import { getDomainRating } from "./ahrefs";

const UPDATE_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const RETRY_DELAY = 5 * 60 * 1000; // 5 minutes

export async function updateDomainMetrics() {
  try {
    console.log("Starting domain DR update...");
    const domains = await storage.getDomains();

    for (const domain of domains) {
      try {
        // Skip if last update was less than 24 hours ago
        if (domain.lastMetricsUpdate) {
          const lastUpdate = new Date(domain.lastMetricsUpdate);
          const timeSinceLastUpdate = Date.now() - lastUpdate.getTime();
          if (timeSinceLastUpdate < UPDATE_INTERVAL) {
            console.log(`Skipping ${domain.websiteUrl}, last update was ${Math.round(timeSinceLastUpdate / (1000 * 60 * 60))} hours ago`);
            continue;
          }
        }

        console.log(`Fetching DR for ${domain.websiteUrl}...`);
        const metrics = await getDomainRating(domain.websiteUrl);
        console.log(`Received DR for ${domain.websiteUrl}:`, metrics);

        // Update domain with new DR
        const updatedDomain = await storage.updateDomain(domain.id, {
          domainRating: metrics.domainRating.toString(), // Convert to string as per schema
          lastMetricsUpdate: metrics.lastUpdated
        });

        console.log(`Successfully updated DR for ${domain.websiteUrl}:`, {
          domainRating: updatedDomain.domainRating,
          lastMetricsUpdate: updatedDomain.lastMetricsUpdate
        });

        // Add delay between requests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Failed to update DR for ${domain.websiteUrl}:`, error);
        // Continue with next domain even if one fails
        continue;
      }
    }
    console.log("Domain DR update completed");
  } catch (error) {
    console.error("Error updating domain DR:", error);
    // Schedule retry
    setTimeout(updateDomainMetrics, RETRY_DELAY);
  }
}

// Start periodic updates
export function startMetricsUpdates() {
  console.log("Initializing domain DR update service...");

  // Do initial update
  updateDomainMetrics().catch(error => {
    console.error("Failed initial DR update:", error);
  });

  // Set up periodic updates
  setInterval(() => {
    updateDomainMetrics().catch(error => {
      console.error("Failed periodic DR update:", error);
    });
  }, UPDATE_INTERVAL);
}