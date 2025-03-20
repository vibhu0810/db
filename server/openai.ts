import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateWelcomeMessage(username: string, companyName?: string): Promise<string> {
  try {
    // Extract first name from username if it contains spaces
    const firstName = username.includes(' ') ? username.split(' ')[0] : username;
    
    // Return fixed format message
    return `Welcome ${firstName} to SaaS x Links! 🥷`;
  } catch (error) {
    console.error("Error generating welcome message:", error);
    return "Welcome to SaaS x Links! 🥷";
  }
}

export async function getBusinessInsight(companyName: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a digital marketing expert. Provide a brief, insightful tip about link building or content marketing. Keep it specific and actionable."
        },
        {
          role: "user",
          content: `Provide a quick marketing tip for ${companyName} about effective link building or content placement strategy.`
        }
      ],
      max_tokens: 150,
      temperature: 0.7,
    });

    return response.choices[0].message.content || "Focus on creating high-quality, valuable content to attract natural backlinks.";
  } catch (error) {
    console.error("Error generating business insight:", error);
    return "Focus on creating high-quality, valuable content to attract natural backlinks.";
  }
}

export async function generateSEOJoke(): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a witty SEO expert. Generate a short, funny one-liner joke about SEO, backlinks, or digital marketing. Keep it light and professional."
        }
      ],
      max_tokens: 60,
      temperature: 0.7,
    });

    return response.choices[0].message.content || "Why did the SEO expert go broke? Because he lost all his rankings!";
  } catch (error) {
    console.error("Error generating SEO joke:", error);
    return "Why did the SEO expert go broke? Because he lost all his rankings!";
  }
}