import fetch from 'node-fetch';

const AHREFS_API_ENDPOINT = 'https://api.ahrefs.com/v3';

interface AhrefsMetrics {
  domainRating: number;
  traffic: number;
  lastUpdated: Date;
}

export async function getDomainMetrics(domain: string): Promise<AhrefsMetrics> {
  if (!process.env.AHREFS_API_KEY) {
    throw new Error('Ahrefs API key not configured');
  }

  try {
    const response = await fetch(`${AHREFS_API_ENDPOINT}/metrics`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AHREFS_API_KEY}`
      },
      body: JSON.stringify({
        target: domain,
        metrics: ['domain_rating', 'organic_traffic'],
        limit: 1
      })
    });

    if (!response.ok) {
      throw new Error(`Ahrefs API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      domainRating: data.domain_rating || 0,
      traffic: data.organic_traffic || 0,
      lastUpdated: new Date()
    };
  } catch (error) {
    console.error('Error fetching Ahrefs metrics:', error);
    throw error;
  }
}
