import fetch from 'node-fetch';

const AHREFS_API_ENDPOINT = 'https://api.ahrefs.com/v3';

interface AhrefsDRMetrics {
  domainRating: number;
  lastUpdated: Date;
}

export async function getDomainRating(domainUrl: string): Promise<AhrefsDRMetrics> {
  if (!process.env.AHREFS_API_KEY) {
    throw new Error('Ahrefs API key not configured');
  }

  try {
    // Clean the domain URL - remove protocol and www if present
    const domain = domainUrl.replace(/^(https?:\/\/)?(www\.)?/, '').replace(/\/$/, '');
    console.log(`Fetching Ahrefs DR for domain: ${domain}`);

    const response = await fetch(`${AHREFS_API_ENDPOINT}/domain-rating`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AHREFS_API_KEY}`
      },
      body: JSON.stringify({
        target: domain,
        limit: 1
      })
    });

    if (!response.ok) {
      throw new Error(`Ahrefs API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Received Ahrefs data for ${domain}:`, data);

    return {
      domainRating: data.domain_rating || 0,
      lastUpdated: new Date()
    };
  } catch (error) {
    console.error('Error fetching Ahrefs DR:', error);
    throw error;
  }
}