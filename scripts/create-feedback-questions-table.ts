import { db } from "../server/db";
import { sql } from "drizzle-orm";
import { defaultFeedbackQuestions } from "../shared/schema";

async function createFeedbackQuestionsTable() {
  console.log("Creating feedback_questions table...");
  
  try {
    // Create the feedback_questions table using raw SQL
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS feedback_questions (
        id SERIAL PRIMARY KEY,
        question TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        created_by INTEGER REFERENCES users(id),
        sort_order INTEGER NOT NULL DEFAULT 0
      );
    `);
    
    console.log("Table created successfully");
    
    // Check if there are any existing questions
    const existingQuestions = await db.execute(sql`
      SELECT COUNT(*) FROM feedback_questions;
    `);
    
    const count = parseInt(existingQuestions.rows[0].count);
    
    // Only seed default questions if the table is empty
    if (count === 0) {
      console.log("Seeding default feedback questions...");
      
      // Insert default questions
      for (let i = 0; i < defaultFeedbackQuestions.length; i++) {
        await db.execute(sql`
          INSERT INTO feedback_questions (question, sort_order)
          VALUES (${defaultFeedbackQuestions[i]}, ${i + 1});
        `);
      }
      
      console.log(`Seeded ${defaultFeedbackQuestions.length} default questions`);
    } else {
      console.log(`Table already contains ${count} questions, skipping seed`);
    }
    
    console.log("Process completed successfully");
  } catch (error) {
    console.error("Error:", error);
  } finally {
    process.exit(0);
  }
}

createFeedbackQuestionsTable();