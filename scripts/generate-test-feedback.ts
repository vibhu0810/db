import { storage } from "../server/storage";

async function generateTestFeedback() {
  try {
    console.log("Generating test feedback data...");
    
    // Get all users
    const users = await storage.getUsers();
    const regularUsers = users.filter(user => !user.is_admin);
    
    if (regularUsers.length === 0) {
      console.log("No regular users found. Please create users first.");
      return;
    }
    
    console.log(`Found ${regularUsers.length} regular users`);
    
    // Generate feedback for the past 3 months for each user
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1; // 1-12
    const currentYear = currentDate.getFullYear();
    
    for (const user of regularUsers) {
      console.log(`Generating feedback for user ${user.username} (${user.id})`);
      
      // Get existing feedback for this user
      const existingFeedback = await storage.getUserFeedback(user.id);
      
      for (let i = 0; i < 3; i++) {
        // Calculate month and year (go back i months)
        let month = currentMonth - i;
        let year = currentYear;
        
        // Handle month rollover
        if (month <= 0) {
          month += 12;
          year -= 1;
        }
        
        // Check if feedback already exists for this month/year
        const feedbackExists = existingFeedback.some(f => 
          f.month === month && f.year === year
        );
        
        if (feedbackExists) {
          console.log(`Feedback already exists for ${user.username} for ${month}/${year}`);
          continue;
        }
        
        // Generate random ratings for the 5 questions
        const ratings = Array.from({ length: 5 }, () => Math.floor(Math.random() * 5) + 1);
        const averageRating = ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length;
        
        // Create feedback
        const feedbackData = {
          userId: user.id,
          month,
          year, 
          ratings: JSON.stringify(ratings),
          averageRating: averageRating.toFixed(1),
          comments: `Feedback comments for ${month}/${year}. Overall the service was ${averageRating > 4 ? 'excellent' : averageRating > 3 ? 'good' : averageRating > 2 ? 'average' : 'needs improvement'}.`,
          createdAt: new Date(year, month - 1, 15), // 15th of the month
          isCompleted: true
        };
        
        const result = await storage.createFeedback(feedbackData);
        console.log(`Created feedback for ${user.username} for ${month}/${year} with ID ${result.id}`);
      }
    }
    
    console.log("Test feedback generation completed!");
  } catch (error) {
    console.error("Error generating test feedback:", error);
  } finally {
    process.exit();
  }
}

generateTestFeedback();