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

    // First, find the wallet ID using the address
    const walletsUrl = `https://api.privy.io/v1/wallets?address=${walletAddress}`;
    console.log('🔍 Looking up wallet by address:', walletsUrl);
    
    const authHeader = `Basic ${btoa(`${privyAppId}:${privyAppSecret}`)}`;
    
    const walletsResponse = await fetch(walletsUrl, {
      method: 'GET',
      headers: {
        'privy-app-id': privyAppId,
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
    });

    if (!walletsResponse.ok) {
      const errorText = await walletsResponse.text();
      console.error('❌ Failed to find wallet:', {
        status: walletsResponse.status,
        statusText: walletsResponse.statusText,
        errorBody: errorText
      });
      
      return new Response(
        JSON.stringify({ 
          error: `Failed to find wallet: ${walletsResponse.status} ${walletsResponse.statusText}`,
          details: errorText
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const walletsData = await walletsResponse.json();
    console.log('📋 Wallets lookup response:', walletsData);
    
    if (!walletsData.data || walletsData.data.length === 0) {
      console.error('❌ No wallet found for address:', walletAddress);
      return new Response(
        JSON.stringify({ 
          error: 'No wallet found for the provided address'
        }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }
    
    const walletId = walletsData.data[0].id;
    console.log('✅ Found wallet ID:', walletId);
    
    // Now fetch the balance using the wallet ID
    const apiUrl = `https://api.privy.io/v1/wallets/${walletId}/balance`;
    console.log('🌐 Making balance API request to:', apiUrl);
    
    const response = await fetch(apiUrl, {
      method: 'GET',
      headers: {
        'privy-app-id': privyAppId,
        'Authorization': authHeader,
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
      (balance: any) => balance.chain === 'base' && balance.asset === 'usdc'
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