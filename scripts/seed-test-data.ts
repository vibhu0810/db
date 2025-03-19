import { apiRequest } from "../client/src/lib/queryClient";

const API_BASE_URL = "http://localhost:5000";

export const testUsers = [
  {
    username: "john_seo",
    password: "test123!",
    firstName: "John",
    lastName: "Miller",
    email: "john@dgagency.com",
    companyName: "DG Marketing Solutions",
    country: "United States",
    billingAddress: "123 Market St, San Francisco, CA 94105",
    bio: "Digital marketing specialist with 5+ years experience"
  },
  {
    username: "sarah_content",
    password: "test123!",
    firstName: "Sarah",
    lastName: "Wilson",
    email: "sarah@dgagency.com",
    companyName: "Content Kings",
    country: "Canada",
    billingAddress: "456 Queen St W, Toronto, ON M5V 2B5",
    bio: "Content strategy expert focusing on SaaS and tech"
  },
  {
    username: "mike_links",
    password: "test123!",
    firstName: "Mike",
    lastName: "Johnson",
    email: "mike@dgagency.com",
    companyName: "LinkMaster Pro",
    country: "United Kingdom",
    billingAddress: "789 Oxford St, London W1D 2DT",
    bio: "Specializing in white-hat link building strategies"
  },
  {
    username: "lisa_digital",
    password: "test123!",
    firstName: "Lisa",
    lastName: "Brown",
    email: "lisa@dgagency.com",
    companyName: "Digital Growth Labs",
    country: "Australia",
    billingAddress: "321 George St, Sydney NSW 2000",
    bio: "Digital marketing consultant for startups"
  },
  {
    username: "tom_seo",
    password: "test123!",
    firstName: "Tom",
    lastName: "Davis",
    email: "tom@dgagency.com",
    companyName: "SEO Wizards",
    country: "Germany",
    billingAddress: "159 Berliner St, Berlin 10115",
    bio: "Technical SEO specialist and analytics expert"
  },
  {
    username: "emma_content",
    password: "test123!",
    firstName: "Emma",
    lastName: "Smith",
    email: "emma@dgagency.com",
    companyName: "Content First",
    country: "France",
    billingAddress: "753 Rue de Paris, Paris 75001",
    bio: "Content marketing strategist for luxury brands"
  },
  {
    username: "david_ppc",
    password: "test123!",
    firstName: "David",
    lastName: "Clark",
    email: "david@dgagency.com",
    companyName: "PPC Masters",
    country: "Spain",
    billingAddress: "951 Calle Mayor, Madrid 28013",
    bio: "PPC and paid social media specialist"
  },
  {
    username: "amy_social",
    password: "test123!",
    firstName: "Amy",
    lastName: "White",
    email: "amy@dgagency.com",
    companyName: "Social Surge",
    country: "Italy",
    billingAddress: "357 Via Roma, Rome 00185",
    bio: "Social media marketing and community management"
  },
  {
    username: "peter_analytics",
    password: "test123!",
    firstName: "Peter",
    lastName: "King",
    email: "peter@dgagency.com",
    companyName: "Analytics Pro",
    country: "Netherlands",
    billingAddress: "852 Amsterdam Ave, Amsterdam 1012",
    bio: "Analytics and conversion optimization expert"
  },
  {
    username: "rachel_brand",
    password: "test123!",
    firstName: "Rachel",
    lastName: "Green",
    email: "rachel@dgagency.com",
    companyName: "Brand Builders",
    country: "Sweden",
    billingAddress: "456 Stockholm St, Stockholm 111 52",
    bio: "Brand strategy and digital presence consultant"
  }
];

async function createTestUsers() {
  console.log("Creating test users...");

  for (const user of testUsers) {
    try {
      await fetch(`${API_BASE_URL}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(user)
      });
      console.log(`Created user: ${user.username}`);
    } catch (error) {
      console.error(`Failed to create user ${user.username}:`, error);
    }
  }
}

createTestUsers().catch(console.error);