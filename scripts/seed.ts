import { createTestUsers } from "./seed-test-data";
import { createDemoData } from "./seed-demo-data";
import { db } from "../server/db";
import { users, orders, domains, orderComments } from "@shared/schema";

async function clearData() {
  console.log("Clearing existing data...");
  try {
    await db.delete(orderComments);
    await db.delete(orders);
    await db.delete(domains);
    await db.delete(users);
    console.log("Successfully cleared existing data");
  } catch (error) {
    console.error("Error clearing data:", error);
    throw error;
  }
}

async function seed() {
  console.log("Starting data seeding process...");

  try {
    console.log("\n1. Clearing existing data...");
    await clearData();

    console.log("\n2. Creating test users...");
    await createTestUsers();

    console.log("\n3. Creating demo data...");
    await createDemoData();

    console.log("\nSeeding completed successfully!");
  } catch (error) {
    console.error("Error during seeding:", error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

seed().catch(console.error);