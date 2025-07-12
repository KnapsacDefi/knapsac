import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('📨 get-usdc-balance function called');

    const requestBody = await req.json();
    console.log('📝 Request body:', requestBody);
    
    const { walletAddress } = requestBody;
    console.log('💳 Wallet address:', walletAddress);

    if (!walletAddress) {
      console.error('❌ Wallet address is missing');
      return new Response(
        JSON.stringify({ error: 'Wallet address is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const privyAppId = Deno.env.get('PRIVY_APP_ID');
    const privyAppSecret = Deno.env.get('PRIVY_APP_SECRET');
    
    console.log('🔑 Privy credentials check:', {
      appIdExists: !!privyAppId,
      appSecretExists: !!privyAppSecret
    });

    if (!privyAppId || !privyAppSecret) {
      console.error('❌ Privy credentials not configured');
      return new Response(
        JSON.stringify({ error: 'Privy credentials not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // For now, return a mock response to test if the function works
    console.log('✅ Function working, returning mock balance');
    return new Response(
      JSON.stringify({ balance: '0.00' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Error in get-usdc-balance function:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Function error',
        details: error?.message || 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})