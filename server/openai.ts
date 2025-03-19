import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateWelcomeMessage(username: string, companyName?: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional digital marketing assistant. Generate a short, friendly, and personalized welcome message. Make it concise (max 2 sentences) and engaging."
        },
        {
          role: "user",
          content: `Generate a welcome message for a user named ${username}${companyName ? ` from ${companyName}` : ''}. They are logging into a digital marketing platform focused on link building and content placement.`
        }
      ],
      max_tokens: 100,
      temperature: 0.7,
    });

    return response.choices[0].message.content || "Welcome to LinkManager!";
  } catch (error) {
    console.error("Error generating welcome message:", error);
    return "Welcome to LinkManager!";
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
