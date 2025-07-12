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
    const privyAppId = Deno.env.get('PRIVY_APP_ID');
    const privyAppSecret = Deno.env.get('PRIVY_APP_SECRET');
    
    console.log('Testing Privy secrets:', {
      appIdExists: !!privyAppId,
      appSecretExists: !!privyAppSecret,
      appIdLength: privyAppId?.length,
      appSecretLength: privyAppSecret?.length,
      appIdFirst4: privyAppId?.substring(0, 4),
      appSecretFirst4: privyAppSecret?.substring(0, 4)
    });
    
    return new Response(
      JSON.stringify({ 
        success: true,
        privy_app_id_configured: !!privyAppId,
        privy_app_secret_configured: !!privyAppSecret,
        app_id_length: privyAppId?.length || 0,
        app_secret_length: privyAppSecret?.length || 0
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  } catch (error) {
    console.error('Error in test-privy-secrets:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Test failed',
        details: error.message 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})