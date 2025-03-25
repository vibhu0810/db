import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Interface for domain information returned by OpenAI
export interface DomainInfo {
  websiteName: string;
  niche: string;
}

export async function generateWelcomeMessage(username: string, companyName?: string): Promise<string> {
  try {
    // Extract first name from username if it contains spaces
    const firstName = username.includes(' ') ? username.split(' ')[0] : username;
    
    // Return fixed format message with special formatting that will be interpreted on the frontend
    return `Welcome ${firstName} to <saasxlinks>SaaS×Links!</saasxlinks> 🥷`;
  } catch (error) {
    console.error("Error generating welcome message:", error);
    return "Welcome to <saasxlinks>SaaS×Links!</saasxlinks> 🥷";
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

/**
 * Determine domain information (website name and niche) from a URL
 * @param websiteUrl - The URL of the website (e.g., example.com)
 * @returns Promise with website name and niche
 */
export async function determineDomainInfo(websiteUrl: string): Promise<DomainInfo> {
  try {
    // Clean the URL (remove http://, https://, www., etc.)
    const cleanUrl = websiteUrl.replace(/^(https?:\/\/)?(www\.)?/, '').split('/')[0];
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an SEO expert who specializes in determining website niches and proper website names. 
          Given a domain name, analyze it and return:
          1. A proper website/company name derived from the domain (converting domain words to proper title case, removing TLD)
          2. The most likely niche/industry the website belongs to (be specific but use common categories)
          
          Return only valid JSON in the exact format: {"websiteName": "Example Name", "niche": "Technology/SaaS"}`
        },
        {
          role: "user",
          content: `Analyze this domain: ${cleanUrl}`
        }
      ],
      max_tokens: 150,
      temperature: 0.3,
      response_format: { type: "json_object" }
    });

    const jsonResponse = JSON.parse(response.choices[0].message.content || '{"websiteName": "", "niche": ""}');
    
    return {
      websiteName: jsonResponse.websiteName || cleanUrl,
      niche: jsonResponse.niche || "General"
    };
  } catch (error) {
    console.error("Error determining domain info:", error);
    
    // Fallback: Create a basic name from the URL
    const nameFromUrl = websiteUrl
      .replace(/^(https?:\/\/)?(www\.)?/, '')
      .split('/')[0]
      .split('.')
      .slice(0, -1)
      .join(' ')
      .split('-')
      .join(' ')
      .split('_')
      .join(' ')
      .replace(/\b\w/g, l => l.toUpperCase());
    
    return {
      websiteName: nameFromUrl || websiteUrl,
      niche: "General"
    };
  }
}