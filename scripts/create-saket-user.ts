import { db } from '../server/db';
import { users, InsertUser } from '../shared/schema';
import { eq } from 'drizzle-orm';
import { hashPassword } from '../server/auth';

async function createSaketUser() {
  try {
    console.log('Starting user creation...');
    const hashedPassword = await hashPassword('saket@dg123');
    
    const newUser: InsertUser = {
      username: 'saket',
      firstName: 'Saket',
      lastName: 'Aggarwal',
      email: 'saket@digitalgratified.com',
      password: hashedPassword,
      companyName: 'Digital Gratified FZ-LLC',
      country: 'U.A.E.',
      billingAddress: '',
      bio: '',
      is_admin: false,
    };

    // Check if user already exists
    const existingUser = await db.select().from(users).where(eq(users.username, 'saket')).limit(1);
    
    if (existingUser.length > 0) {
      console.log('User "saket" already exists with ID:', existingUser[0].id);
      return;
    }

    // Create the user
    const result = await db.insert(users).values(newUser).returning();
    console.log('User created successfully with ID:', result[0].id);
  } catch (error) {
    console.error('Error creating user:', error);
  } finally {
    process.exit(0);
  }
}

createSaketUser();