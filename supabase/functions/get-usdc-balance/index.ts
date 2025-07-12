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
    
    const { walletId } = requestBody;
    console.log('💳 Wallet ID:', walletId);

    if (!walletId) {
      console.error('❌ Wallet ID is missing');
      return new Response(
        JSON.stringify({ error: 'Wallet ID is required' }),
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

    // Use the wallet ID directly for the balance API call
    const authHeader = `Basic ${btoa(`${privyAppId}:${privyAppSecret}`)}`;
    console.log('✅ Using wallet ID:', walletId);
    
    // Fetch the balance using the wallet ID
    const apiUrl = `https://api.privy.io/v1/wallets/${walletId}/balance`;
    console.log('🌐 Making balance API request to:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'privy-app-id': privyAppId,
        'Content-Type': 'application/json',
      },
    });

    console.log('📡 Privy API response:', {
      status: response.status,
      statusText: response.statusText,
      ok: response.ok
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Privy API error:', {
        status: response.status,
        statusText: response.statusText,
        errorBody: errorText
      });
      
      return new Response(
        JSON.stringify({ 
          error: `Privy API error: ${response.status} ${response.statusText}`,
          details: errorText
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const data = await response.json();
    console.log('📊 Privy API response data:', data);
    
    // Find USDC balance on Base chain
    const usdcBalance = data.balances?.find(
      (balance: any) => balance.chain === 'ethereum' && balance.asset === 'usdc'
    );
    
    const usdValue = usdcBalance?.display_values?.usd || '0.00';
    console.log('💰 Extracted USDC balance:', usdValue);
    
    return new Response(
      JSON.stringify({ balance: usdValue }),
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