import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TatumTokenBalance {
  chain: string;
  address: string;
  balance: string;
  denominatedBalance: string;
  decimals: number;
  tokenAddress: string;
  type: string;
}

interface TatumPortfolioResponse {
  result: TatumTokenBalance[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletAddress } = await req.json();

    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: 'Wallet address is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Get Tatum API key from Supabase secrets
    const tatumApiKey = Deno.env.get('TATUM_API_KEY');
    if (!tatumApiKey) {
      console.error('TATUM_API_KEY not found in environment variables');
      return new Response(
        JSON.stringify({ error: 'API configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Call Tatum API to get wallet portfolio
    const tatumUrl = `https://api.tatum.io/v4/data/wallet/portfolio?chain=celo-mainnet&addresses=${walletAddress}&tokenTypes=fungible`;
    
    console.log('Calling Tatum API:', tatumUrl);
    
    const tatumResponse = await fetch(tatumUrl, {
      method: 'GET',
      headers: {
        'accept': 'application/json',
        'x-api-key': tatumApiKey,
      },
    });

    if (!tatumResponse.ok) {
      console.error('Tatum API error:', tatumResponse.status, tatumResponse.statusText);
      const errorText = await tatumResponse.text();
      console.error('Tatum API error response:', errorText);
      
      return new Response(
        JSON.stringify({ error: 'Failed to fetch balance from Tatum API' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const portfolioData: TatumPortfolioResponse = await tatumResponse.json();
    console.log('Tatum API response:', JSON.stringify(portfolioData, null, 2));

    // Find GoodDollar token (G$) with the specific token address
    const gooddollarTokenAddress = '0x62b8b11039fcfe5ab0c56e502b1c372a3d2a9c7a';
    const gooddollarToken = portfolioData.result?.find(
      token => token.tokenAddress.toLowerCase() === gooddollarTokenAddress.toLowerCase()
    );

    if (!gooddollarToken) {
      console.log('GoodDollar token not found in portfolio, returning 0 balance');
      return new Response(
        JSON.stringify({ 
          balance: '0',
          symbol: 'G$',
          decimals: 18,
          balanceFormatted: '0.00'
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Format the balance using denominatedBalance (which is already in proper decimal format)
    const balanceNumber = parseFloat(gooddollarToken.denominatedBalance) / Math.pow(10, gooddollarToken.decimals);
    const balanceFormatted = balanceNumber.toFixed(2);

    console.log('GoodDollar balance found:', {
      balance: gooddollarToken.balance,
      decimals: gooddollarToken.decimals,
      formatted: balanceFormatted
    });

    return new Response(
      JSON.stringify({
        balance: gooddollarToken.denominatedBalance,
        symbol: 'G$',
        decimals: gooddollarToken.decimals,
        balanceFormatted: balanceFormatted,
        name: 'GoodDollar'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in get-gooddollar-balance function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});