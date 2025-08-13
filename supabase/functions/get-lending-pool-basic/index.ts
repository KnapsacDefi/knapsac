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
    const { id: poolId } = await req.json();

    if (!poolId) {
      return new Response(
        JSON.stringify({ error: 'Pool ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    // Fast query for basic pool info only - no joins
    const { data: lendingPool, error } = await supabaseClient
      .from('lending_pool')
      .select(`
        id,
        target_amount,
        monthly_interest,
        closing_date,
        min_lend_period,
        max_lend_period,
        recipient_address,
        status,
        created_at,
        updated_at,
        user_id,
        startup_id
      `)
      .eq('id', poolId)
      .eq('status', 'published')
      .maybeSingle()

    if (error) {
      console.error('Error fetching basic lending pool:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: error.code === 'PGRST116' ? 404 : 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    if (!lendingPool) {
      return new Response(
        JSON.stringify({ error: 'Lending pool not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ pool: lendingPool }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=600' // Cache for 10 minutes
        } 
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