import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { Pool } from 'pg';
import * as schema from '../shared/schema';
import { hashPassword } from '../server/auth';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

async function createTables() {
  console.log('Creating tables for test environment...');
  
  // Create a database connection
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Execute create table statements for each table in the schema
    
    // Step 1: Create organizations table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS organizations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        owner_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        logo VARCHAR(255),
        website VARCHAR(255),
        billing_email VARCHAR(255),
        billing_details JSONB,
        subscription_plan VARCHAR(50) DEFAULT 'basic',
        admins_count INTEGER DEFAULT 1,
        inventory_managers_count INTEGER DEFAULT 1,
        user_managers_count INTEGER DEFAULT 0,
        users_count INTEGER DEFAULT 5,
        monthly_order_limit INTEGER DEFAULT 100,
        current_orders_count INTEGER DEFAULT 0
      )
    `);
    console.log('Created organizations table');
    
    // Step 2: Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER REFERENCES organizations(id),
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        first_name VARCHAR(50),
        last_name VARCHAR(50),
        email VARCHAR(255) NOT NULL,
        email_verified BOOLEAN DEFAULT FALSE,
        verification_token VARCHAR(100),
        password_reset_token VARCHAR(100),
        password_reset_expires TIMESTAMP,
        company_name VARCHAR(100),
        country VARCHAR(2),
        billing_address TEXT,
        bio TEXT,
        profile_picture VARCHAR(255),
        company_logo VARCHAR(255),
        date_of_birth VARCHAR(10),
        phone_number VARCHAR(20),
        linkedin_url VARCHAR(255),
        instagram_profile VARCHAR(255),
        is_admin BOOLEAN DEFAULT FALSE,
        role VARCHAR(50) DEFAULT 'user',
        managed_by INTEGER,
        monthly_order_limit INTEGER,
        subscription_tier VARCHAR(50),
        subscription_start TIMESTAMP,
        subscription_end TIMESTAMP,
        last_login TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP
      )
    `);
    console.log('Created users table');
    
    // Step 3: Add foreign key for organization owner_id
    await pool.query(`
      ALTER TABLE organizations 
      ADD CONSTRAINT fk_owner_id
      FOREIGN KEY (owner_id) 
      REFERENCES users(id)
    `);
    console.log('Added foreign key for organization owner_id');
    
    // Step 4: Create user_assignments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_assignments (
        id SERIAL PRIMARY KEY,
        manager_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT NOW(),
        assigned_by INTEGER REFERENCES users(id),
        active BOOLEAN DEFAULT TRUE
      )
    `);
    console.log('Created user_assignments table');
    
    // Step 5: Create domains table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS domains (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER REFERENCES organizations(id),
        website_name VARCHAR(255) NOT NULL,
        website_url VARCHAR(255) NOT NULL,
        domain_rating VARCHAR(10),
        website_traffic INTEGER,
        niche VARCHAR(100),
        type VARCHAR(50) NOT NULL,
        guidelines TEXT,
        guest_post_price VARCHAR(20),
        niche_edit_price VARCHAR(20),
        gp_tat VARCHAR(50),
        ne_tat VARCHAR(50),
        last_metrics_update TIMESTAMP,
        is_global BOOLEAN DEFAULT FALSE,
        user_id INTEGER REFERENCES users(id),
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP
      )
    `);
    console.log('Created domains table');
    
    // Step 6: Create domain_pricing table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS domain_pricing (
        id SERIAL PRIMARY KEY,
        domain_id INTEGER REFERENCES domains(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        guest_post_price VARCHAR(20),
        niche_edit_price VARCHAR(20),
        is_custom BOOLEAN DEFAULT TRUE,
        pricing_tier_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP,
        created_by INTEGER REFERENCES users(id)
      )
    `);
    console.log('Created domain_pricing table');
    
    // Step 7: Create pricing_tiers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS pricing_tiers (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER REFERENCES organizations(id),
        name VARCHAR(100) NOT NULL,
        description TEXT,
        multiplier NUMERIC(5, 2) DEFAULT 1.00,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP,
        created_by INTEGER REFERENCES users(id)
      )
    `);
    console.log('Created pricing_tiers table');
    
    // Step 8: Create user_pricing_tiers table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_pricing_tiers (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        tier_id INTEGER REFERENCES pricing_tiers(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT NOW(),
        assigned_by INTEGER REFERENCES users(id)
      )
    `);
    console.log('Created user_pricing_tiers table');
    
    // Step 9: Create orders table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER REFERENCES organizations(id),
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        domain_id INTEGER REFERENCES domains(id),
        source_url VARCHAR(255) NOT NULL,
        target_url VARCHAR(255) NOT NULL,
        anchor_text VARCHAR(255) NOT NULL,
        text_edit TEXT,
        notes TEXT,
        price VARCHAR(20) NOT NULL,
        status VARCHAR(50) NOT NULL,
        type VARCHAR(50) NOT NULL,
        date_ordered TIMESTAMP DEFAULT NOW(),
        date_completed TIMESTAMP,
        title VARCHAR(255),
        link_url VARCHAR(255),
        content_doc VARCHAR(255),
        created_by INTEGER REFERENCES users(id),
        assigned_to INTEGER REFERENCES users(id),
        updated_at TIMESTAMP
      )
    `);
    console.log('Created orders table');
    
    // Step 10: Create order_comments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_comments (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        comment TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        read_by JSONB DEFAULT '[]',
        is_from_admin BOOLEAN DEFAULT FALSE,
        is_system_message BOOLEAN DEFAULT FALSE,
        ticket_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Created order_comments table');
    
    // Step 11: Create support_tickets table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS support_tickets (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER REFERENCES organizations(id),
        title VARCHAR(255) NOT NULL,
        user_id INTEGER REFERENCES users(id),
        order_id INTEGER REFERENCES orders(id),
        status VARCHAR(50) NOT NULL DEFAULT 'open',
        priority VARCHAR(50) NOT NULL DEFAULT 'medium',
        category VARCHAR(100),
        description TEXT NOT NULL,
        attachments JSONB DEFAULT '[]',
        resolution TEXT,
        resolved_at TIMESTAMP,
        rating INTEGER,
        feedback TEXT,
        due_date TIMESTAMP,
        assigned_to INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        closed_at TIMESTAMP,
        updated_at TIMESTAMP
      )
    `);
    console.log('Created support_tickets table');
    
    // Step 12: Create ticket_comments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ticket_comments (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER REFERENCES support_tickets(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        content TEXT NOT NULL,
        is_internal BOOLEAN DEFAULT FALSE,
        attachments JSONB DEFAULT '[]',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP
      )
    `);
    console.log('Created ticket_comments table');
    
    // Step 13: Create ticket_history table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ticket_history (
        id SERIAL PRIMARY KEY,
        ticket_id INTEGER REFERENCES support_tickets(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(100) NOT NULL,
        details JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Created ticket_history table');
    
    // Step 14: Create feedback_questions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS feedback_questions (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER REFERENCES organizations(id),
        question TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        options JSONB DEFAULT '[]',
        category VARCHAR(100),
        is_required BOOLEAN DEFAULT TRUE,
        is_active BOOLEAN DEFAULT TRUE,
        sort_order INTEGER NOT NULL,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP
      )
    `);
    console.log('Created feedback_questions table');
    
    // Step 15: Create feedback_campaigns table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS feedback_campaigns (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER REFERENCES organizations(id),
        name VARCHAR(255) NOT NULL,
        description TEXT,
        target_user_role VARCHAR(50) NOT NULL DEFAULT 'all',
        frequency VARCHAR(50) NOT NULL,
        start_date TIMESTAMP NOT NULL,
        end_date TIMESTAMP,
        is_active BOOLEAN DEFAULT TRUE,
        created_by INTEGER REFERENCES users(id),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Created feedback_campaigns table');
    
    // Step 16: Create campaign_questions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS campaign_questions (
        id SERIAL PRIMARY KEY,
        campaign_id INTEGER REFERENCES feedback_campaigns(id) ON DELETE CASCADE,
        question_id INTEGER REFERENCES feedback_questions(id) ON DELETE CASCADE,
        sort_order INTEGER NOT NULL
      )
    `);
    console.log('Created campaign_questions table');
    
    // Step 17: Create feedback table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS feedback (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER REFERENCES organizations(id),
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        campaign_id INTEGER REFERENCES feedback_campaigns(id),
        responses JSONB NOT NULL,
        average_rating NUMERIC(3, 2),
        comments TEXT,
        is_completed BOOLEAN DEFAULT FALSE,
        submitted_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Created feedback table');
    
    // Step 18: Create order_feedback table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS order_feedback (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER REFERENCES organizations(id),
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        user_id INTEGER REFERENCES users(id),
        rating INTEGER NOT NULL,
        comments TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Created order_feedback table');
    
    // Step 19: Create notifications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        related_id INTEGER,
        related_type VARCHAR(50),
        created_at TIMESTAMP DEFAULT NOW()
      )
    `);
    console.log('Created notifications table');
    
    // Step 20: Create invoices table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        organization_id INTEGER REFERENCES organizations(id),
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        amount NUMERIC(10, 2) NOT NULL,
        notes TEXT,
        due_date TIMESTAMP NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        file_url VARCHAR(255),
        file_name VARCHAR(255),
        paid_at TIMESTAMP,
        client_email VARCHAR(255),
        payment_method VARCHAR(50),
        payment_fee NUMERIC(10, 2),
        created_by INTEGER REFERENCES users(id)
      )
    `);
    console.log('Created invoices table');
    
    // Step 21: Create sessions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS test_sessions (
        sid VARCHAR(255) NOT NULL PRIMARY KEY,
        sess JSON NOT NULL,
        expire TIMESTAMP(6) NOT NULL
      )
    `);
    console.log('Created test_sessions table');
    
    // Add index on session expiration
    await pool.query(`
      CREATE INDEX IF NOT EXISTS test_sessions_expire_idx ON test_sessions (expire)
    `);
    console.log('Added index on test_sessions expire column');
    
    console.log('Tables created successfully');
    
  } catch (error) {
    console.error('Error creating tables:', error);
    throw error;
  } finally {
    // Close the connection pool
    await pool.end();
  }
}

async function createAdminUser() {
  console.log('Creating admin user...');
  
  // Create a database connection
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // First check if organization exists
    const orgResult = await pool.query(`
      SELECT * FROM organizations WHERE name = 'Digital Gratified'
    `);
    
    let orgId: number;
    
    if (orgResult.rows.length === 0) {
      // Create organization
      const newOrgResult = await pool.query(`
        INSERT INTO organizations (name, subscription_plan)
        VALUES ('Digital Gratified', 'enterprise')
        RETURNING id
      `);
      
      orgId = newOrgResult.rows[0].id;
      console.log(`Created organization: Digital Gratified (ID: ${orgId})`);
    } else {
      orgId = orgResult.rows[0].id;
      console.log(`Organization already exists: Digital Gratified (ID: ${orgId})`);
    }
    
    // Check if admin user exists
    const userResult = await pool.query(`
      SELECT * FROM users WHERE username = 'admin'
    `);
    
    if (userResult.rows.length === 0) {
      // Hash password
      const hashedPassword = await hashPassword('admin123');
      
      // Create admin user
      const newUserResult = await pool.query(`
        INSERT INTO users (
          organization_id, username, password, email, 
          is_admin, role, email_verified, first_name, last_name
        )
        VALUES (
          $1, 'admin', $2, 'admin@digitalgratified.com', 
          true, 'admin', true, 'Admin', 'User'
        )
        RETURNING id
      `, [orgId, hashedPassword]);
      
      const userId = newUserResult.rows[0].id;
      console.log(`Created admin user: admin (ID: ${userId})`);
      
      // Update organization with owner_id
      await pool.query(`
        UPDATE organizations SET owner_id = $1 WHERE id = $2
      `, [userId, orgId]);
      console.log(`Updated organization owner`);
    } else {
      console.log(`Admin user already exists`);
    }
    
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  } finally {
    // Close the connection pool
    await pool.end();
  }
}

async function createDemoUsers() {
  console.log('Creating demo users...');
  
  // Create a database connection
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Get organization ID
    const orgResult = await pool.query(`
      SELECT id FROM organizations WHERE name = 'Digital Gratified'
    `);
    
    if (orgResult.rows.length === 0) {
      throw new Error('Organization not found');
    }
    
    const orgId = orgResult.rows[0].id;
    
    // Create demo users for each role
    const demoUsers = [
      {
        username: 'user_manager',
        password: 'password123',
        email: 'user_manager@example.com',
        role: 'user_manager',
        firstName: 'User',
        lastName: 'Manager',
        companyName: 'User Management Inc.'
      },
      {
        username: 'inventory_manager',
        password: 'password123',
        email: 'inventory_manager@example.com',
        role: 'inventory_manager',
        firstName: 'Inventory',
        lastName: 'Manager',
        companyName: 'Inventory Solutions'
      },
      {
        username: 'client1',
        password: 'password123',
        email: 'client1@example.com',
        role: 'user',
        firstName: 'Demo',
        lastName: 'Client',
        companyName: 'Demo Company 1'
      },
      {
        username: 'client2',
        password: 'password123',
        email: 'client2@example.com',
        role: 'user',
        firstName: 'Another',
        lastName: 'Client',
        companyName: 'Demo Company 2'
      }
    ];
    
    for (const user of demoUsers) {
      // Check if user exists
      const userResult = await pool.query(`
        SELECT * FROM users WHERE username = $1
      `, [user.username]);
      
      if (userResult.rows.length === 0) {
        // Hash password
        const hashedPassword = await hashPassword(user.password);
        
        // Create user
        const newUserResult = await pool.query(`
          INSERT INTO users (
            organization_id, username, password, email, 
            role, email_verified, first_name, last_name, company_name
          )
          VALUES (
            $1, $2, $3, $4, 
            $5, true, $6, $7, $8
          )
          RETURNING id
        `, [
          orgId, 
          user.username, 
          hashedPassword, 
          user.email, 
          user.role, 
          user.firstName, 
          user.lastName, 
          user.companyName
        ]);
        
        const userId = newUserResult.rows[0].id;
        console.log(`Created user: ${user.username} (ID: ${userId})`);
      } else {
        console.log(`User already exists: ${user.username}`);
      }
    }
    
    // Assign clients to user manager
    const userManagerResult = await pool.query(`
      SELECT id FROM users WHERE username = 'user_manager'
    `);
    
    if (userManagerResult.rows.length > 0) {
      const userManagerId = userManagerResult.rows[0].id;
      
      const clientsResult = await pool.query(`
        SELECT id FROM users WHERE username IN ('client1', 'client2')
      `);
      
      for (const client of clientsResult.rows) {
        // Check if assignment exists
        const assignmentResult = await pool.query(`
          SELECT * FROM user_assignments 
          WHERE manager_id = $1 AND user_id = $2
        `, [userManagerId, client.id]);
        
        if (assignmentResult.rows.length === 0) {
          // Create assignment
          await pool.query(`
            INSERT INTO user_assignments (manager_id, user_id, assigned_by)
            VALUES ($1, $2, $1)
          `, [userManagerId, client.id]);
          
          console.log(`Assigned user ${client.id} to manager ${userManagerId}`);
        } else {
          console.log(`Assignment already exists for user ${client.id}`);
        }
      }
    }
    
  } catch (error) {
    console.error('Error creating demo users:', error);
    throw error;
  } finally {
    // Close the connection pool
    await pool.end();
  }
}

async function createDemoData() {
  console.log('Creating demo data...');
  
  // Create a database connection
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    // Get organization ID
    const orgResult = await pool.query(`
      SELECT id FROM organizations WHERE name = 'Digital Gratified'
    `);
    
    if (orgResult.rows.length === 0) {
      throw new Error('Organization not found');
    }
    
    const orgId = orgResult.rows[0].id;
    
    // Get inventory manager
    const inventoryManagerResult = await pool.query(`
      SELECT id FROM users WHERE username = 'inventory_manager'
    `);
    
    if (inventoryManagerResult.rows.length === 0) {
      throw new Error('Inventory manager not found');
    }
    
    const inventoryManagerId = inventoryManagerResult.rows[0].id;
    
    // Create demo domains
    const demoDomains = [
      {
        websiteName: 'Travel Blog',
        websiteUrl: 'travelblog.example.com',
        domainRating: '45',
        websiteTraffic: 10000,
        niche: 'Travel',
        type: 'guest_post',
        guestPostPrice: '150',
        guidelines: 'Article should be at least 1000 words and include 2 images.'
      },
      {
        websiteName: 'Tech Review Site',
        websiteUrl: 'techreview.example.com',
        domainRating: '60',
        websiteTraffic: 25000,
        niche: 'Technology',
        type: 'both',
        guestPostPrice: '200',
        nicheEditPrice: '100',
        guidelines: 'Focus on recent technology trends and innovations.'
      },
      {
        websiteName: 'Health & Wellness',
        websiteUrl: 'wellness.example.com',
        domainRating: '38',
        websiteTraffic: 7500,
        niche: 'Health',
        type: 'niche_edit',
        nicheEditPrice: '80',
        guidelines: 'Must be factually accurate and cite reputable sources.'
      }
    ];
    
    for (const domain of demoDomains) {
      // Check if domain exists
      const domainResult = await pool.query(`
        SELECT * FROM domains WHERE website_url = $1
      `, [domain.websiteUrl]);
      
      if (domainResult.rows.length === 0) {
        // Create domain
        await pool.query(`
          INSERT INTO domains (
            organization_id, website_name, website_url, domain_rating, website_traffic,
            niche, type, guidelines, guest_post_price, niche_edit_price,
            is_global, created_by
          )
          VALUES (
            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11
          )
        `, [
          orgId,
          domain.websiteName,
          domain.websiteUrl,
          domain.domainRating,
          domain.websiteTraffic,
          domain.niche,
          domain.type,
          domain.guidelines,
          domain.guestPostPrice || null,
          domain.nicheEditPrice || null,
          inventoryManagerId
        ]);
        
        console.log(`Created domain: ${domain.websiteName}`);
      } else {
        console.log(`Domain already exists: ${domain.websiteName}`);
      }
    }
    
    // Create pricing tiers
    const pricingTiers = [
      {
        name: 'Standard',
        description: 'Standard pricing for regular clients',
        multiplier: 1.0
      },
      {
        name: 'Premium',
        description: 'Premium pricing with 15% markup',
        multiplier: 1.15
      },
      {
        name: 'VIP',
        description: 'VIP pricing with 25% markup',
        multiplier: 1.25
      },
      {
        name: 'Discount',
        description: 'Discounted pricing with 10% reduction',
        multiplier: 0.9
      }
    ];
    
    // Get admin user ID
    const adminResult = await pool.query(`
      SELECT id FROM users WHERE username = 'admin'
    `);
    
    if (adminResult.rows.length === 0) {
      throw new Error('Admin user not found');
    }
    
    const adminId = adminResult.rows[0].id;
    
    for (const tier of pricingTiers) {
      // Check if tier exists
      const tierResult = await pool.query(`
        SELECT * FROM pricing_tiers WHERE name = $1 AND organization_id = $2
      `, [tier.name, orgId]);
      
      if (tierResult.rows.length === 0) {
        // Create tier
        await pool.query(`
          INSERT INTO pricing_tiers (
            organization_id, name, description, multiplier, created_by
          )
          VALUES (
            $1, $2, $3, $4, $5
          )
        `, [
          orgId,
          tier.name,
          tier.description,
          tier.multiplier,
          adminId
        ]);
        
        console.log(`Created pricing tier: ${tier.name}`);
      } else {
        console.log(`Pricing tier already exists: ${tier.name}`);
      }
    }
    
    // Create feedback questions
    const feedbackQuestions = [
      {
        question: 'How would you rate the overall quality of our service?',
        type: 'rating',
        category: 'general',
        sortOrder: 1
      },
      {
        question: 'How satisfied are you with the communication from our team?',
        type: 'rating',
        category: 'communication',
        sortOrder: 2
      },
      {
        question: 'How satisfied are you with the turnaround time for your orders?',
        type: 'rating',
        category: 'delivery',
        sortOrder: 3
      },
      {
        question: 'What could we do to improve our service?',
        type: 'text',
        category: 'improvement',
        sortOrder: 4
      }
    ];
    
    for (const question of feedbackQuestions) {
      // Check if question exists
      const questionResult = await pool.query(`
        SELECT * FROM feedback_questions 
        WHERE question = $1 AND organization_id = $2
      `, [question.question, orgId]);
      
      if (questionResult.rows.length === 0) {
        // Create question
        await pool.query(`
          INSERT INTO feedback_questions (
            organization_id, question, type, category, sort_order, created_by
          )
          VALUES (
            $1, $2, $3, $4, $5, $6
          )
        `, [
          orgId,
          question.question,
          question.type,
          question.category,
          question.sortOrder,
          adminId
        ]);
        
        console.log(`Created feedback question: ${question.question.substring(0, 30)}...`);
      } else {
        console.log(`Feedback question already exists: ${question.question.substring(0, 30)}...`);
      }
    }
    
    // Create feedback campaign
    const campaignResult = await pool.query(`
      SELECT * FROM feedback_campaigns
      WHERE name = 'Monthly Client Feedback' AND organization_id = $1
    `, [orgId]);
    
    let campaignId: number;
    
    if (campaignResult.rows.length === 0) {
      // Create campaign
      const now = new Date();
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1); // 1 year in the future
      
      const newCampaignResult = await pool.query(`
        INSERT INTO feedback_campaigns (
          organization_id, name, description, target_user_role, 
          frequency, start_date, end_date, created_by
        )
        VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8
        )
        RETURNING id
      `, [
        orgId,
        'Monthly Client Feedback',
        'Monthly feedback collection from all clients',
        'user',
        'monthly',
        now,
        endDate,
        adminId
      ]);
      
      campaignId = newCampaignResult.rows[0].id;
      console.log(`Created feedback campaign: Monthly Client Feedback (ID: ${campaignId})`);
    } else {
      campaignId = campaignResult.rows[0].id;
      console.log(`Feedback campaign already exists: Monthly Client Feedback (ID: ${campaignId})`);
    }
    
    // Add questions to campaign
    const questionIds = await pool.query(`
      SELECT id FROM feedback_questions
      WHERE organization_id = $1
      ORDER BY sort_order
    `, [orgId]);
    
    for (let i = 0; i < questionIds.rows.length; i++) {
      const questionId = questionIds.rows[i].id;
      
      // Check if question is already in campaign
      const campaignQuestionResult = await pool.query(`
        SELECT * FROM campaign_questions
        WHERE campaign_id = $1 AND question_id = $2
      `, [campaignId, questionId]);
      
      if (campaignQuestionResult.rows.length === 0) {
        // Add question to campaign
        await pool.query(`
          INSERT INTO campaign_questions (
            campaign_id, question_id, sort_order
          )
          VALUES (
            $1, $2, $3
          )
        `, [
          campaignId,
          questionId,
          i + 1
        ]);
        
        console.log(`Added question ${questionId} to campaign ${campaignId}`);
      } else {
        console.log(`Question ${questionId} already in campaign ${campaignId}`);
      }
    }
    
  } catch (error) {
    console.error('Error creating demo data:', error);
    throw error;
  } finally {
    // Close the connection pool
    await pool.end();
  }
}

// Main function to run all setup tasks
async function setupDatabase() {
  try {
    await createTables();
    await createAdminUser();
    await createDemoUsers();
    await createDemoData();
    console.log('Database setup completed successfully');
  } catch (error) {
    console.error('Database setup failed:', error);
    process.exit(1);
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  setupDatabase();
}

export { setupDatabase };