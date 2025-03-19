import { db } from "../server/db";
import { users } from "@shared/schema";
import { hashPassword } from "../server/auth";
import { eq } from 'drizzle-orm';

async function createAdminUser() {
  try {
    // First delete any existing admin user
    await db.delete(users).where(eq(users.username, "digitalgratified"));

    // Create admin user with a simpler password for testing
    const userData = {
      username: "digitalgratified",
      password: "admin123",  // Simplified password for testing
      firstName: "Admin",
      lastName: "User",
      email: "admin@digitalgratified.com",
      companyName: "Digital Gratified",
      country: "United States",
      billingAddress: "123 Admin St, Digital City, DC 10001",
      bio: "Digital Marketing Platform Administrator",
      profilePicture: null
    };

    const hashedPassword = await hashPassword(userData.password);
    console.log("Creating admin user with hashed password");
    console.log("Password before hashing:", userData.password);
    console.log("Generated hash:", hashedPassword);

    // Insert with is_admin added
    await db.insert(users).values({
      ...userData,
      password: hashedPassword,
      is_admin: true
    });

    console.log("Admin user created successfully");
    console.log("Please try logging in with:");
    console.log("Username: digitalgratified");
    console.log("Password: admin123");
  } catch (error) {
    console.error("Failed to create admin user:", error);
  }
}

createAdminUser().catch(console.error);