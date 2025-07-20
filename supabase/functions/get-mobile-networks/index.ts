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
    const payboxApiKey = Deno.env.get('PAYBOX_API_KEY');
    if (!payboxApiKey) {
      console.error('PAYBOX_API_KEY not found');
      return new Response(
        JSON.stringify({ error: 'API configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Fetching mobile networks from PayBox API');

    try {
      const response = await fetch(
        'https://paybox.com.co/active_networks_transfer?currency=All',
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${payboxApiKey}`,
            'Cookie': 'XSRF-TOKEN=eyJpdiI6Ikw2MDMxTWkyTGcwaS8velAvZFZQQ1E9PSIsInZhbHVlIjoiTkt5N1JFamNuY1ZXNFlYNE5Xczh0RzhkY1VJMFFGcFYvWUM1VWxsK0RsMzFpeUpncE5NUGxjYThMUDFmUFIvWU4yNzZnQi92U3AwN3RHa0FCMnptbmZkM2x6ZjFYOG1QRTB2MllDM202QTJGZHJWNlppU0xCVHplSUVaaDIxenoiLCJtYWMiOiI2NGYzNzg4YjhhZWU3N2U3ZTEyYTExMjg4ZTA4MDA2ZWRiZTk1OGQ0YWEwMDJhMjE5ZTZjOGYwYThlZmVmN2U0IiwidGFnIjoiIn0%3D; paybox_session=eyJpdiI6IlNYZW40ZFpRVTRBT0FyTWI0YjdmMmc9PSIsInZhbHVlIjoiUzdRbFpyM2dJMEUrcjJkcG9oTGIzWEFFQjlrZTJIcGlRUnBwcFNKako2RExzRUxOTy9KdXhENkl4aWpPRGxVZjRicE1UaXRYY2lya3g1bDJwMVNPU2hWTmE2VnZVc0hESDBoSkJWZ3hlWGVsQXd5SkgzRmVNWmE4RXE5TnFvd0YiLCJtYWMiOiI0YjI1NDM1Nzc2ZDVlMDJhMmE2NTc5YmI5ODljOWIwZjllNjM5N2ZmNjhkMmY2MzIwOGYzMDYxYWUzODI5NTI4IiwidGFnIjoiIn0%3D'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`PayBox API error: ${response.status}`);
      }

      const data = await response.json();
      
      console.log('PayBox API response:', data);

      return new Response(
        JSON.stringify({ 
          networks: data.networks || data,
          timestamp: new Date().toISOString()
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } catch (apiError) {
      console.error('PayBox API error:', apiError);
      
      // Fallback to mock networks for demo
      const mockNetworks = [
        { id: 'mtn_gh', name: 'MTN', currency: 'GHS', country: 'Ghana' },
        { id: 'vodafone_gh', name: 'Vodafone', currency: 'GHS', country: 'Ghana' },
        { id: 'airteltigo_gh', name: 'AirtelTigo', currency: 'GHS', country: 'Ghana' },
        { id: 'mtn_ng', name: 'MTN', currency: 'NGN', country: 'Nigeria' },
        { id: 'airtel_ng', name: 'Airtel', currency: 'NGN', country: 'Nigeria' },
        { id: 'glo_ng', name: 'Glo', currency: 'NGN', country: 'Nigeria' },
        { id: 'safaricom_ke', name: 'Safaricom', currency: 'KES', country: 'Kenya' },
        { id: 'airtel_ke', name: 'Airtel', currency: 'KES', country: 'Kenya' },
        { id: 'mtn_ug', name: 'MTN', currency: 'UGX', country: 'Uganda' },
        { id: 'airtel_ug', name: 'Airtel', currency: 'UGX', country: 'Uganda' },
        { id: 'vodacom_tz', name: 'Vodacom', currency: 'TZS', country: 'Tanzania' },
        { id: 'airtel_tz', name: 'Airtel', currency: 'TZS', country: 'Tanzania' },
        { id: 'orange_ci', name: 'Orange', currency: 'XOF', country: 'Côte d\'Ivoire' },
        { id: 'mtn_ci', name: 'MTN', currency: 'XOF', country: 'Côte d\'Ivoire' }
      ];

      return new Response(
        JSON.stringify({ 
          networks: mockNetworks,
          timestamp: new Date().toISOString(),
          source: 'fallback'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Error in get-mobile-networks function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});