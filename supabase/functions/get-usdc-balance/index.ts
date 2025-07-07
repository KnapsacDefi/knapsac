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
    const { walletAddress } = await req.json()

    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: 'Wallet address is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const privyAppId = Deno.env.get('PRIVY_APP_ID')
    const privyAppSecret = Deno.env.get('PRIVY_APP_SECRET')

    if (!privyAppId || !privyAppSecret) {
      return new Response(
        JSON.stringify({ error: 'Privy credentials not configured' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Fetch USDC balance using Privy API
    const response = await fetch(`https://api.privy.io/v1/wallets/${walletAddress}/balance?asset=usdc&chain=base`, {
      headers: {
        'privy-app-id': privyAppId,
        'Authorization': `Basic ${btoa(`${privyAppId}:${privyAppSecret}`)}`,
      },
    })

    if (!response.ok) {
      throw new Error(`Privy API error: ${response.statusText}`)
    }

    const data = await response.json()
    
    // Extract USD value from the balances array
    const usdBalance = data.balances?.[0]?.display_values?.usd || '0'
    
    return new Response(
      JSON.stringify({ balance: usdBalance }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error fetching USDC balance:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch balance' }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})