import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cache-Control': 'public, max-age=30, s-maxage=30',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletAddress, chain } = await req.json();

    if (!walletAddress || !chain) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Map chain names to Tatum API format
    const chainMapping: Record<string, string> = {
      'ethereum': 'ethereum-mainnet',
      'celo': 'celo-mainnet',
      'base': 'base-mainnet'
    };

    const tatumChain = chainMapping[chain];
    if (!tatumChain) {
      return new Response(
        JSON.stringify({ error: 'Unsupported chain' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log(`Fetching portfolio for ${walletAddress} on ${tatumChain}`);

    const tatumApiKey = Deno.env.get('TATUM_API_KEY');
    if (!tatumApiKey) {
      throw new Error('TATUM_API_KEY not configured');
    }

    const url = `https://api.tatum.io/v4/data/wallet/portfolio?chain=${tatumChain}&addresses=${walletAddress}&tokenTypes=fungible`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'x-api-key': tatumApiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Tatum API error: ${response.status} ${response.statusText}`);
    }

    const portfolioData = await response.json();
    console.log('Portfolio data:', JSON.stringify(portfolioData, null, 2));
    
    return new Response(
      JSON.stringify({ 
        portfolio: portfolioData,
        chain,
        walletAddress 
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in get-token-balance function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});