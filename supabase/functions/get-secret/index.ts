
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
    console.log('Processing secret request...')
    
    const { secret_name } = await req.json()
    console.log('Requested secret:', secret_name)
    
    if (!secret_name) {
      console.error('Secret name is missing')
      return new Response(
        JSON.stringify({ error: 'Secret name is required' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get the secret from Deno environment
    const secret_value = Deno.env.get(secret_name)
    console.log('Secret found:', secret_value ? 'yes' : 'no')
    
    if (!secret_value) {
      console.error(`Secret ${secret_name} not found in environment`)
      return new Response(
        JSON.stringify({ error: `Secret ${secret_name} not found` }),
        { 
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Returning secret successfully')
    return new Response(
      JSON.stringify({ secret_value }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Error in get-secret function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})
