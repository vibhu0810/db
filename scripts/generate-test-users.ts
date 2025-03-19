import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { db } from "../server/db";
import { users } from "@shared/schema";
import { eq, like } from "drizzle-orm";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function createTestUsers() {
  // Delete existing test users
  await db.delete(users).where(like(users.username, 'test%'));

  const testUsers = [
    { username: 'test1', company: 'Tech Marketing Pro', name: 'John Smith' },
    { username: 'test2', company: 'Digital Solutions Inc', name: 'Sarah Johnson' },
    { username: 'test3', company: 'SEO Masters', name: 'Mike Brown' },
    { username: 'test4', company: 'Content Kings', name: 'Lisa Davis' },
    { username: 'test5', company: 'Link Building Experts', name: 'David Wilson' },
    { username: 'test6', company: 'Web Presence LLC', name: 'Emma Taylor' },
    { username: 'test7', company: 'Digital Growth Agency', name: 'James Anderson' },
    { username: 'test8', company: 'SEO Solutions Pro', name: 'Anna Martin' },
    { username: 'test9', company: 'Content Strategy Co', name: 'Robert Thompson' },
    { username: 'test10', company: 'Digital Marketing Hub', name: 'Michelle Clark' }
  ];

  for (const user of testUsers) {
    const [firstName, lastName] = user.name.split(' ');
    const hashedPassword = await hashPassword('password123');

    await db.insert(users).values({
      username: user.username,
      password: hashedPassword,
      company_name: user.company,
      first_name: firstName,
      last_name: lastName,
      email: `${firstName.toLowerCase()}@${user.company.toLowerCase().replace(/\s+/g, '')}.com`,
      country: 'United States',
      billing_address: '123 Business St',
      bio: 'Digital marketing professional'
    });
  }

  console.log('Test users created successfully');
}

createTestUsers().catch(console.error);