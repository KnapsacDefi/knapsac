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
    console.log('Processing credit score request...')
    
    const { wallet_address } = await req.json()
    console.log('Requested wallet address:', wallet_address)
    
    if (!wallet_address) {
      console.error('Wallet address is missing')
      return new Response(
        JSON.stringify({ error: 'Wallet address is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get the API key from environment
    const apiKey = Deno.env.get('MYZSCORE_API_KEY')
    console.log('API key found:', apiKey ? 'yes' : 'no')
    
    if (!apiKey) {
      console.error('MYZSCORE_API_KEY not found in environment')
      return new Response(
        JSON.stringify({ error: 'API configuration error' }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Call the myzscore.ai API
    console.log(`Calling myzscore API for wallet: ${wallet_address}`)
    const response = await fetch(`https://api.myzscore.ai/zpass/api/zscore/wallet/${wallet_address}`, {
      method: 'GET',
      headers: {
        'x-api-key': apiKey,
        'Content-Type': 'application/json'
      }
    })

    console.log('API Response status:', response.status)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('API Error:', errorText)
      
      if (response.status === 404) {
        // No credit score found for this wallet
        return new Response(
          JSON.stringify({ 
            error: 'No credit score found for this wallet',
            score: null 
          }),
          { 
            status: 404,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
      
      return new Response(
        JSON.stringify({ error: `API error: ${response.status}` }),
        { 
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const data = await response.json()
    console.log('API Response data:', data)

    // Extract the score from the response
    const score = data.score || data.zscore || data.creditScore || null
    
    if (score === null || score === undefined) {
      console.error('No score found in API response:', data)
      return new Response(
        JSON.stringify({ 
          error: 'Invalid response from credit score API',
          score: null
        }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Returning credit score:', score)
    return new Response(
      JSON.stringify({ 
        score: parseInt(score),
        wallet_address,
        last_updated: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Error in get-credit-score function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})