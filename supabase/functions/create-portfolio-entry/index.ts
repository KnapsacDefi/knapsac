import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      lending_pool_id,
      lend_amount,
      lend_token,
      chain,
      lend_period,
      lend_transaction_hash,
      recipient_address
    } = await req.json()

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Get user from token
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate required fields
    if (!lending_pool_id || !lend_amount || !lend_token || !chain || !lend_period || !recipient_address) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Verify the lending pool exists and is published
    const { data: lendingPool, error: poolError } = await supabaseClient
      .from('lending_pool')
      .select('*')
      .eq('id', lending_pool_id)
      .eq('status', 'published')
      .single()

    if (poolError || !lendingPool) {
      return new Response(
        JSON.stringify({ error: 'Invalid or unpublished lending pool' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate lending period is within allowed range
    if (lend_period < lendingPool.min_lend_period || lend_period > lendingPool.max_lend_period) {
      return new Response(
        JSON.stringify({ error: 'Lending period outside allowed range' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create portfolio entry
    const portfolioData = {
      lending_pool_id,
      user_id: user.id,
      lend_amount: parseFloat(lend_amount),
      lend_token,
      chain,
      lend_period,
      lend_transaction_hash,
      recipient_address,
      payment_status: 'pending'
    }

    const { data: portfolio, error } = await supabaseClient
      .from('portfolio')
      .insert(portfolioData)
      .select()
      .single()

    if (error) {
      console.error('Error creating portfolio entry:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ portfolio }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})