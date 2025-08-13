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
      recipient_address,
      user_id
    } = await req.json()

    // Validate required fields including user_id
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: 'User ID required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

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

    // Calculate expected claim date
    const expectedClaimDate = new Date(lendingPool.closing_date);
    expectedClaimDate.setDate(expectedClaimDate.getDate() + lend_period);

    // Create portfolio entry
    const portfolioData = {
      lending_pool_id,
      user_id,
      lend_amount: parseFloat(lend_amount),
      lend_token,
      chain,
      lend_period,
      lend_transaction_hash,
      recipient_address,
      payment_status: 'pending',
      expected_claim_date: expectedClaimDate.toISOString()
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