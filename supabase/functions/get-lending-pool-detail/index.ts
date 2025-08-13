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

    // First get basic pool info
    const { data: lendingPool, error } = await supabaseClient
      .from('lending_pool')
      .select('*')
      .eq('id', poolId)
      .eq('status', 'published')
      .maybeSingle()

    if (error) {
      console.error('Error fetching lending pool:', error)
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

    // Use database function for efficient funding calculation
    const { data: fundingData, error: fundingError } = await supabaseClient
      .rpc('get_pool_funding_progress', { pool_id: poolId })

    if (fundingError) {
      console.error('Error fetching funding progress:', fundingError)
      // Return pool without funding data if calculation fails
      return new Response(
        JSON.stringify({ pool: lendingPool }),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json',
            'Cache-Control': 'public, max-age=300'
          } 
        }
      )
    }

    // Calculate funding progress for the pool
    const fundingProgress = fundingData && fundingData.length > 0 ? fundingData[0] : { total_lent: 0, funding_progress: 0 }
    
    const poolWithProgress = {
      ...lendingPool,
      total_lent: parseFloat(fundingProgress.total_lent || '0'),
      funding_progress: parseFloat(fundingProgress.funding_progress || '0')
    }

    return new Response(
      JSON.stringify({ pool: poolWithProgress }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300' // Cache for 5 minutes
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