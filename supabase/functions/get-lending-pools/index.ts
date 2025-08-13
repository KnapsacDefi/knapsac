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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { data: lendingPools, error } = await supabaseClient
      .from('lending_pool')
      .select(`
        *,
        portfolio!lending_pool_id (
          lend_amount
        )
      `)
      .eq('status', 'published')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching lending pools:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Calculate funding progress for each pool
    const poolsWithProgress = lendingPools?.map(pool => {
      const totalLent = pool.portfolio?.reduce((sum: number, p: any) => sum + parseFloat(p.lend_amount || '0'), 0) || 0
      const progress = (totalLent / parseFloat(pool.target_amount)) * 100
      
      return {
        ...pool,
        total_lent: totalLent,
        funding_progress: Math.min(progress, 100)
      }
    }) || []

    return new Response(
      JSON.stringify({ pools: poolsWithProgress }),
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