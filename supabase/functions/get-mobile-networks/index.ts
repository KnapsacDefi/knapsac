
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get currency from request body or default to 'All'
    let currency = 'All';
    if (req.method === 'POST') {
      try {
        const body = await req.json();
        currency = body.currency || 'All';
      } catch (e) {
        console.log('No valid JSON body, using default currency');
      }
    }

    const payboxApiKey = Deno.env.get('PAYBOX_COLLECTION_API_KEY');
    if (!payboxApiKey) {
      console.error('PAYBOX_COLLECTION_API_KEY not found');
      return new Response(
        JSON.stringify({ error: 'API configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Fetching mobile networks from PayBox API for currency: ${currency}`);

    try {
      const response = await fetch(
        `https://paybox.com.co/active_networks_transfer?currency=${currency}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${payboxApiKey}`,
            'Cookie': 'XSRF-TOKEN=eyJpdiI6Ikw2MDMxTWkyTGcwaS8velAvZFZQQ1E9PSIsInZhbHVlIjoiTkt5N1JFamNuY1ZXNFlYNE5Xczh0RzhkY1VJMFFGcFYvWUM1VWxsK0RsMzFpeUpncE5NUGxjYThMUDFmUFIvWU4yNzZnQi92U3AwN3RHa0FCMnptbmZkM2x6ZjFYOG1QRTB2MllDM202QTJGZHJWNlppU0xCVHplSUVaaDIxenoiLCJtYWMiOiI2NGYzNzg4YjhhZWU3N2U3ZTEyYTExMjg4ZTA4MDA2ZWRiZTk1OGQ0YWEwMDJhMjE5ZTZjOGYwYThlZmVmN2U0IiwidGFnIjoiIn0%3D; paybox_session=eyJpdiI6IlNYZW40ZFpRVTRBT0FyTWI0YjdmMmc9PSIsInZhbHVlIjoiUzdRbFpyM2dJMEUrcjJkcG9oTGIzWEFFQjlrZTJIcGlRUnBwcFNKako2RExzRUxOTy9KdXhENkl4aWpPRGxVZjRicE1UaXRYY2lya3g1bDJwMVNPU2hWTmE2VnZVc0hESDBoSkJWZ3hlWGVsQXd5SkgzRmVNWmE4RXE5TnFvd0YiLCJtYWMiOiI0YjI1NDM1Nzc2ZDVlMDJhMmE2NTc5YmI5ODljOWIwZjllNjM5N2ZmNjhkMmY2MzIwOGYzMDYxYWUzODI5NTI4IiwidGFnIjoiIn0%3D'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`PayBox API error: ${response.status} - ${response.statusText}`);
      }

      const data = await response.json();
      
      console.log('PayBox API response:', data);

      // Transform the currency-grouped response to a flat array
      let networks = [];
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        // Handle grouped response by currency
        for (const [currencyCode, currencyNetworks] of Object.entries(data)) {
          if (Array.isArray(currencyNetworks)) {
            networks = networks.concat(currencyNetworks);
          }
        }
      } else if (Array.isArray(data)) {
        networks = data;
      }

      console.log('Processed networks:', networks);

      return new Response(
        JSON.stringify({ 
          networks: networks,
          timestamp: new Date().toISOString()
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } catch (apiError) {
      console.error('PayBox API error:', apiError);
      
      // Return error response instead of mock data
      return new Response(
        JSON.stringify({ 
          error: 'Failed to fetch mobile networks from PayBox API',
          message: apiError.message,
          networks: [],
          timestamp: new Date().toISOString()
        }),
        { 
          status: 503, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Error in get-mobile-networks function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        networks: [],
        timestamp: new Date().toISOString()
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
