import { MailService } from '@sendgrid/mail';

const mailService = new MailService();

async function testSendGrid() {
  console.log("Starting SendGrid API test...");
  
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) {
    console.error("SENDGRID_API_KEY is not configured in environment variables");
    return false;
  }
  
  console.log("SendGrid API key is configured");
  mailService.setApiKey(apiKey);
  
  try {
    console.log("Getting SendGrid account info to verify API key...");
    
    // We'll send a message to verify API access
    // To avoid actually sending an email, we'll use a test option
    // that will validate the API key but not actually send
    const testMessage = {
      to: "test@example.com",
      from: "info@digitalgratified.com", // This should match your verified sender
      subject: "SendGrid API Test",
      text: "This is a test message to validate SendGrid API access",
      mailSettings: {
        sandboxMode: {
          enable: true // This prevents the email from actually being sent
        }
      }
    };
    
    console.log("Sending test message (sandbox mode enabled)...");
    const response = await mailService.send(testMessage);
    
    console.log("SendGrid API response:", response);
    console.log("SendGrid API is working properly!");
    return true;
  } catch (error) {
    console.error("SendGrid API test failed:", error);
    return false;
  }
}

// Execute the test
testSendGrid()
  .then(success => {
    if (success) {
      console.log("SendGrid API verification completed successfully");
      process.exit(0);
    } else {
      console.error("SendGrid API verification failed");
      process.exit(1);
    }
  })
  .catch(error => {
    console.error("An unexpected error occurred:", error);
    process.exit(1);
  });