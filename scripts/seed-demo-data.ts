import { apiRequest } from "../client/src/lib/queryClient";
import { testUsers } from "./seed-test-data";
import nodeFetch from "node-fetch";
import fetchCookie from "fetch-cookie";

const API_BASE_URL = "http://localhost:5000";
const fetch = fetchCookie(nodeFetch);

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

async function createDemoData() {
  console.log("Creating demo data...");

  // Login as each user and create orders
  for (const user of testUsers) {
    try {
      // Login
      const loginRes = await fetch(`${API_BASE_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          username: user.username,
          password: user.password
        }),
        credentials: 'include'
      });

      if (!loginRes.ok) {
        throw new Error(`Login failed for ${user.username}`);
      }

      // Create 3-5 orders for each user
      const numOrders = Math.floor(Math.random() * 3) + 3;

      for (let i = 0; i < numOrders; i++) {
        const domain = domains[Math.floor(Math.random() * domains.length)];
        const status = orderStatuses[Math.floor(Math.random() * orderStatuses.length)];
        const order = {
          title: `Guest Post on ${domain.name}`,
          status,
          domainAuthority: domain.domainAuthority,
          domainRating: domain.domainRating,
          websiteTraffic: domain.websiteTraffic,
          sourceUrl: `https://example.com/source-${i}`,
          targetUrl: `https://${domain.name.toLowerCase()}.com/post-${i}`,
          price: domain.price,
          category: domain.category,
          orderNotes: `Order for ${domain.name} guest post placement`,
          dateOrdered: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString()
        };

        const orderRes = await fetch(`${API_BASE_URL}/api/orders`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(order),
          credentials: 'include'
        });

        if (!orderRes.ok) {
          throw new Error(`Failed to create order for ${user.username}`);
        }

        console.log(`Created order for ${user.username} on ${domain.name}`);
      }

    } catch (error) {
      console.error(`Failed to create demo data for ${user.username}:`, error);
    }
  }

  console.log("Demo data creation completed!");
}

createDemoData().catch(console.error);