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

    const { data: lendingPool, error } = await supabaseClient
      .from('lending_pool')
      .select(`
        *,
        portfolio!lending_pool_id (
          lend_amount
        )
      `)
      .eq('id', poolId)
      .eq('status', 'published')
      .single()

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

    // Calculate funding progress for the pool
    const totalLent = lendingPool.portfolio?.reduce((sum: number, p: any) => sum + parseFloat(p.lend_amount || '0'), 0) || 0
    const progress = (totalLent / parseFloat(lendingPool.target_amount)) * 100
    
    const poolWithProgress = {
      ...lendingPool,
      total_lent: totalLent,
      funding_progress: Math.min(progress, 100)
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