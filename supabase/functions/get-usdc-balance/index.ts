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
    console.log('📨 Request received:', {
      method: req.method,
      headers: Object.fromEntries(req.headers.entries()),
      url: req.url
    });

    const requestBody = await req.json();
    console.log('📝 Request body:', requestBody);
    
    const { walletAddress } = requestBody;
    console.log('💳 Wallet address extracted:', walletAddress);

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
      appSecretExists: !!privyAppSecret,
      appIdLength: privyAppId?.length,
      appSecretLength: privyAppSecret?.length
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

    // Fetch USDC balance using Privy API
    const apiUrl = `https://api.privy.io/v1/wallets/${walletAddress}/balance?asset=usdc&chain=base`;
    console.log('🌐 Making API request to:', apiUrl);
    
    const response = await fetch(apiUrl, {
      headers: {
        'privy-app-id': privyAppId,
        'Authorization': `Basic ${btoa(`${privyAppId}:${privyAppSecret}`)}`,
      },
    });

    console.log('📡 Privy API response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok,
      headers: Object.fromEntries(response.headers.entries())
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Privy API error:', {
        status: response.status,
        statusText: response.statusText,
        errorBody: errorText
      });
      throw new Error(`Privy API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    console.log('📊 Privy API response data:', data);
    
    // Extract USD value from the balances array
    const usdBalance = data.balances?.[0]?.display_values?.usd || '0';
    console.log('💰 Extracted USD balance:', usdBalance);
    
    return new Response(
      JSON.stringify({ balance: usdBalance }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('❌ Error in get-usdc-balance function:', {
      error,
      errorMessage: error?.message,
      errorStack: error?.stack,
      errorType: typeof error,
      errorString: error?.toString()
    });
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to fetch balance',
        details: error?.message || 'Unknown error'
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})