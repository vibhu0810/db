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

    // Get current date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    const url = encodeURI(`${AHREFS_API_ENDPOINT}/site-explorer/domain-rating?date=${today}&target=${domain}`);
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${process.env.AHREFS_API_KEY}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Ahrefs API error response:', errorText);

      // For insufficient plan errors, throw a specific error
      if (response.status === 403 && errorText.includes('Insufficient plan')) {
        throw new Error('INSUFFICIENT_PLAN');
      }

      throw new Error(`Ahrefs API error: ${response.statusText}`);
    }

    const data = await response.json();
    console.log(`Received Ahrefs data for ${domain}:`, data);

    if (!data.domain_rating) {
      throw new Error('Domain rating not found in response');
    }

    return {
      domainRating: parseFloat(data.domain_rating) || 0,
      lastUpdated: new Date()
    };
  } catch (error) {
    console.error('Error fetching Ahrefs DR:', error);
    throw error;
  }
}