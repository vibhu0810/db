import { db } from "../server/db";
import { domains, orders, users } from "@shared/schema";
import { testUsers } from "./seed-test-data";
import type { InsertOrder } from "@shared/schema";

const demoDomains = [
  {
    websiteName: "TechCrunch",
    websiteUrl: "techcrunch.com",
    domainAuthority: "93",
    domainRating: "89",
    websiteTraffic: 15000000,
    niche: "Technology",
    type: "both",
    guestPostPrice: "1500",
    nicheEditPrice: "1200",
    guidelines: "High-quality content only"
  },
  {
    websiteName: "Forbes",
    websiteUrl: "forbes.com",
    domainAuthority: "95",
    domainRating: "92",
    websiteTraffic: 25000000,
    niche: "Business",
    type: "both",
    guestPostPrice: "2000",
    nicheEditPrice: "1500",
    guidelines: "Business focused content"
  },
  {
    websiteName: "Entrepreneur",
    websiteUrl: "entrepreneur.com",
    domainAuthority: "91",
    domainRating: "88",
    websiteTraffic: 12000000,
    niche: "Business",
    type: "both",
    guestPostPrice: "1200",
    nicheEditPrice: "900",
    guidelines: "Entrepreneurship content"
  },
  {
    websiteName: "Mashable",
    websiteUrl: "mashable.com",
    domainAuthority: "90",
    domainRating: "87",
    websiteTraffic: 10000000,
    niche: "Technology",
    type: "both",
    guestPostPrice: "1000",
    nicheEditPrice: "800",
    guidelines: "Tech-focused content"
  },
  {
    websiteName: "ReadWrite",
    websiteUrl: "readwrite.com",
    domainAuthority: "85",
    domainRating: "82",
    websiteTraffic: 5000000,
    niche: "Technology",
    type: "both",
    guestPostPrice: "800",
    nicheEditPrice: "600",
    guidelines: "Technology and digital content"
  }
];

const orderStatuses = ["Sent", "In Progress", "Completed", "Revision"];
const anchorTexts = [
  "click here",
  "read more",
  "learn more",
  "find out more",
  "discover",
  "explore",
  "get started",
  "view details"
];

async function createDemoData() {
  console.log("Creating demo data...");

  // First, create domains
  console.log("\n1. Creating domains...");
  for (const domainData of demoDomains) {
    try {
      await db.insert(domains).values(domainData);
      console.log(`Created domain: ${domainData.websiteName}`);
    } catch (error) {
      console.error(`Error creating domain ${domainData.websiteName}:`, error);
    }
  }

  // Then create orders for each user
  console.log("\n2. Creating orders for users...");
  const allDomains = await db.select().from(domains);
  const allUsers = await db.select().from(users);

  for (const user of allUsers) {
    try {
      console.log(`\nProcessing orders for user: ${user.username}`);

      // Create 3-5 orders for each user
      const numOrders = Math.floor(Math.random() * 3) + 3;

      for (let i = 0; i < numOrders; i++) {
        const domain = allDomains[Math.floor(Math.random() * allDomains.length)];
        const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
        const anchorText = anchorTexts[Math.floor(Math.random() * anchorTexts.length)];
        const orderDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);

        const order: InsertOrder = {
          userId: user.id,
          sourceUrl: `https://${user.companyName.toLowerCase().replace(/\s+/g, '-')}.com/blog/post-${i + 1}`,
          targetUrl: `https://${domain.websiteUrl}/${user.username}/article-${i + 1}`,
          anchorText,
          textEdit: null,
          notes: `Order for ${domain.websiteName} guest post placement - ${user.companyName} content`,
          domainAuthority: domain.domainAuthority,
          domainRating: domain.domainRating,
          websiteTraffic: domain.websiteTraffic,
          pageTraffic: null,
          price: domain.type === "guest_post" ? domain.guestPostPrice : domain.nicheEditPrice,
          status,
          dateOrdered: orderDate,
          dateCompleted: status === "Completed" ? new Date(orderDate.getTime() + 24 * 60 * 60 * 1000) : null,
          title: `Guest Post on ${domain.websiteName}`,
          linkUrl: null
        };

        await db.insert(orders).values(order);
        console.log(`Created order for ${user.username} on ${domain.websiteName}`);
      }
    } catch (error) {
      console.error(`Failed to create orders for ${user.username}:`, error);
    }
  }

  console.log("\nDemo data creation completed!");
}

export { createDemoData };