import { storage } from "../storage";
import { getDomainMetrics } from "./ahrefs";

const UPDATE_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const RETRY_DELAY = 5 * 60 * 1000; // 5 minutes

export async function updateDomainMetrics() {
  try {
    console.log("Starting domain metrics update...");
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

        // Extract domain from URL
        const url = new URL(domain.websiteUrl);
        console.log(`Fetching metrics for ${url.hostname}...`);

        const metrics = await getDomainMetrics(url.hostname);
        console.log(`Received metrics for ${url.hostname}:`, metrics);

        // Update domain with new metrics
        const updatedDomain = await storage.updateDomain(domain.id, {
          domainRating: metrics.domainRating.toString(), // Convert to string as per schema
          websiteTraffic: metrics.traffic,
          lastMetricsUpdate: new Date(),
        });

        console.log(`Successfully updated metrics for ${domain.websiteUrl}:`, {
          domainRating: updatedDomain.domainRating,
          websiteTraffic: updatedDomain.websiteTraffic,
          lastMetricsUpdate: updatedDomain.lastMetricsUpdate
        });

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
    // Schedule retry
    setTimeout(updateDomainMetrics, RETRY_DELAY);
  }
}

// Start periodic updates
export function startMetricsUpdates() {
  console.log("Initializing domain metrics update service...");

  // Do initial update
  updateDomainMetrics().catch(error => {
    console.error("Failed initial metrics update:", error);
  });

  // Set up periodic updates
  setInterval(() => {
    updateDomainMetrics().catch(error => {
      console.error("Failed periodic metrics update:", error);
    });
  }, UPDATE_INTERVAL);
}