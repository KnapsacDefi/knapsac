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
    const { fromCurrency, toCurrency, amount } = await req.json();

    if (!fromCurrency || !toCurrency) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const tatumApiKey = Deno.env.get('TATUM_API_KEY');
    if (!tatumApiKey) {
      console.error('TATUM_API_KEY not found');
      return new Response(
        JSON.stringify({ error: 'API configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Fetching conversion rate from ${fromCurrency} to ${toCurrency}`);

    try {
      const response = await fetch(
        `https://api.tatum.io/v3/tatum/rate/${fromCurrency}?basePair=${toCurrency}`,
        {
          method: 'GET',
          headers: {
            'accept': 'application/json',
            'x-api-key': tatumApiKey
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Tatum API error: ${response.status}`);
      }

      const data = await response.json();
      const rate = data.value || data.rate || data;

      console.log('Tatum API response:', data);

      return new Response(
        JSON.stringify({ 
          rate: parseFloat(rate),
          fromCurrency,
          toCurrency,
          timestamp: new Date().toISOString()
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } catch (apiError) {
      console.error('Tatum API error:', apiError);
      
      // Fallback to mock rates for demo
      const mockRates: Record<string, number> = {
        'GHS': 16.2,
        'NGN': 1450.0,
        'KES': 165.5,
        'UGX': 3700.0,
        'TZS': 2800.0,
        'XOF': 620.0
      };

      const mockRate = mockRates[toCurrency] || 1.0;

      return new Response(
        JSON.stringify({ 
          rate: mockRate,
          fromCurrency,
          toCurrency,
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
    console.error('Error in get-conversion-rate function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});