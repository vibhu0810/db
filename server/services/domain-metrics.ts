import { storage } from "../storage";

const UPDATE_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const RETRY_DELAY = 5 * 60 * 1000; // 5 minutes

export async function updateDomainMetrics() {
  try {
    console.log("Domain metrics update service started - updates currently disabled");
    // Functionality disabled - no API calls will be made
  } catch (error) {
    console.error("Error in domain metrics update:", error);
    setTimeout(updateDomainMetrics, RETRY_DELAY);
  }
}

// Start periodic updates
export function startMetricsUpdates() {
  console.log("Domain metrics update service initialized - updates currently disabled");
  // Service disabled - no updates will be scheduled
}