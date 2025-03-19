import { db } from "../server/db";
import { users } from "@shared/schema";
import { hashPassword } from "../server/auth";

async function createAdminUser() {
  try {
    const userData = {
      username: "digitalgratified",
      password: "DG@121212",
      firstName: "Admin",
      lastName: "User",
      email: "admin@digitalgratified.com",
      companyName: "Digital Gratified",
      country: "United States",
      billingAddress: "123 Admin St, Digital City, DC 10001",
      bio: "Digital Marketing Platform Administrator",
      is_admin: true
    };

    const hashedPassword = await hashPassword(userData.password);
    
    await db.insert(users).values({
      ...userData,
      password: hashedPassword,
    });

    console.log("Admin user created successfully");
  } catch (error) {
    console.error("Failed to create admin user:", error);
  }
}

createAdminUser().catch(console.error);
