import { execSync } from "child_process";

console.log("Starting data seeding process...");

try {
  console.log("\n1. Creating test users...");
  execSync("tsx scripts/seed-test-data.ts", { stdio: "inherit" });

  console.log("\n2. Creating demo data...");
  execSync("tsx scripts/seed-demo-data.ts", { stdio: "inherit" });

  console.log("\nSeeding completed successfully!");
} catch (error) {
  console.error("Error during seeding:", error);
  process.exit(1);
}
