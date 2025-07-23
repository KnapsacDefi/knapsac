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

    // Special handling for G$ (GoodDollar) conversions
    if (fromCurrency === 'G$') {
      try {
        console.log('Fetching G$ to USD rate from CoinGecko...');
        
        // Step 1: Get G$ to USD rate from CoinGecko
        const coingeckoResponse = await fetch(
          'https://api.coingecko.com/api/v3/simple/price?ids=gooddollar&vs_currencies=usd',
          {
            method: 'GET',
            headers: {
              'accept': 'application/json'
            }
          }
        );

        if (!coingeckoResponse.ok) {
          throw new Error(`CoinGecko API error: ${coingeckoResponse.status}`);
        }

        const coingeckoData = await coingeckoResponse.json();
        const gDollarToUSD = coingeckoData.gooddollar?.usd;

        if (!gDollarToUSD) {
          throw new Error('G$ price not found in CoinGecko response');
        }

        console.log('G$ to USD rate:', gDollarToUSD);

        // Step 2: Get USD to target currency rate from Tatum
        const tatumResponse = await fetch(
          `https://api.tatum.io/v3/tatum/rate/USD?basePair=${toCurrency}`,
          {
            method: 'GET',
            headers: {
              'accept': 'application/json',
              'x-api-key': tatumApiKey
            }
          }
        );

        if (!tatumResponse.ok) {
          throw new Error(`Tatum API error for USD/${toCurrency}: ${tatumResponse.status}`);
        }

        const tatumData = await tatumResponse.json();
        const usdToTargetCurrency = tatumData.value || tatumData.rate || tatumData;

        console.log('USD to', toCurrency, 'rate:', usdToTargetCurrency);

        // Step 3: Calculate G$ to target currency rate
        const finalRate = gDollarToUSD * parseFloat(usdToTargetCurrency);

        console.log('Final G$ to', toCurrency, 'rate:', finalRate);

        return new Response(
          JSON.stringify({ 
            rate: finalRate,
            fromCurrency,
            toCurrency,
            timestamp: new Date().toISOString(),
            source: 'coingecko+tatum'
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );

      } catch (gDollarError) {
        console.error('G$ conversion error:', gDollarError);
        // Fallback to mock rate for G$
        const mockRates: Record<string, number> = {
          'GHS': 0.0081, // G$ to GHS
          'NGN': 0.00069, // G$ to NGN
          'KES': 0.0061, // G$ to KES
          'UGX': 0.00027, // G$ to UGX
          'TZS': 0.00036, // G$ to TZS
          'XOF': 0.0016, // G$ to XOF
          'CDF': 0.00024, // G$ to CDF
          'XAF': 0.0016 // G$ to XAF
        };

        const fallbackRate = mockRates[toCurrency] || 0.001;

        return new Response(
          JSON.stringify({ 
            rate: fallbackRate,
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
    }

    // Regular conversion for other currencies using Tatum
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
          timestamp: new Date().toISOString(),
          source: 'tatum'
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