import { apiRequest } from "../client/src/lib/queryClient";
import { testUsers } from "./seed-test-data";
import nodeFetch from "node-fetch";
import fetchCookie from "fetch-cookie";

const API_BASE_URL = "http://localhost:5000";

const domains = [
  {
    name: "TechCrunch",
    domainAuthority: "93",
    domainRating: "89",
    websiteTraffic: 15000000,
    price: 1500,
    category: "Technology"
  },
  {
    name: "Forbes",
    domainAuthority: "95",
    domainRating: "92",
    websiteTraffic: 25000000,
    price: 2000,
    category: "Business"
  },
  {
    name: "Entrepreneur",
    domainAuthority: "91",
    domainRating: "88",
    websiteTraffic: 12000000,
    price: 1200,
    category: "Business"
  },
  {
    name: "Mashable",
    domainAuthority: "90",
    domainRating: "87",
    websiteTraffic: 10000000,
    price: 1000,
    category: "Technology"
  },
  {
    name: "ReadWrite",
    domainAuthority: "85",
    domainRating: "82",
    websiteTraffic: 5000000,
    price: 800,
    category: "Technology"
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

  // Login as each user and create orders
  for (const user of testUsers) {
    // Create a new fetch instance for each user to maintain separate sessions
    const userFetch = fetchCookie(nodeFetch);

    try {
      console.log(`\nProcessing user: ${user.username}`);

      // Login with user credentials
      const loginRes = await userFetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: user.username,
          password: user.password
        })
      });

      if (!loginRes.ok) {
        throw new Error(`Login failed for ${user.username}: ${loginRes.status} ${loginRes.statusText}`);
      }

      console.log(`Logged in as ${user.username}`);

      // Create 3-5 orders for each user
      const numOrders = Math.floor(Math.random() * 3) + 3;

      for (let i = 0; i < numOrders; i++) {
        const domain = domains[Math.floor(Math.random() * domains.length)];
        const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
        const anchorText = anchorTexts[Math.floor(Math.random() * anchorTexts.length)];

        // Generate a unique order for each user
        const order = {
          title: `Guest Post on ${domain.name}`,
          status,
          domainAuthority: domain.domainAuthority,
          domainRating: domain.domainRating,
          websiteTraffic: domain.websiteTraffic,
          sourceUrl: `https://${user.companyName.toLowerCase().replace(/\s+/g, '-')}.com/blog/post-${i + 1}`,
          targetUrl: `https://${domain.name.toLowerCase()}.com/${user.username}/article-${i + 1}`,
          anchorText,
          price: domain.price,
          category: domain.category,
          orderNotes: `Order for ${domain.name} guest post placement - ${user.companyName} content`,
          dateOrdered: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
        };

        const orderRes = await userFetch(`${API_BASE_URL}/api/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(order)
        });

        if (!orderRes.ok) {
          const errorText = await orderRes.text();
          throw new Error(`Failed to create order for ${user.username}: ${orderRes.status} ${errorText}`);
        }

        console.log(`Created order for ${user.username} on ${domain.name}`);
      }

      // Logout after creating orders
      await userFetch(`${API_BASE_URL}/api/logout`, {
        method: 'POST'
      });

      console.log(`Completed orders for ${user.username}`);

    } catch (error) {
      console.error(`Failed to create demo data for ${user.username}:`, error);
    }
  }

  console.log("\nDemo data creation completed!");
}

createDemoData().catch(console.error);