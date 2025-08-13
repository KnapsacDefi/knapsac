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
    // Get the authorization header to forward the JWT
    const authHeader = req.headers.get('authorization')
    
    // Create authenticated client using anon key + JWT
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: authHeader ? { authorization: authHeader } : {}
        }
      }
    )

    // Only select safe, non-sensitive data for public viewing
    const { data: lendingPools, error } = await supabaseClient
      .from('lending_pool')
      .select(`
        id,
        target_amount,
        monthly_interest,
        closing_date,
        min_lend_period,
        max_lend_period,
        status,
        created_at,
        portfolio!lending_pool_id (
          lend_amount
        )
      `)
      .eq('status', 'published')
      .gt('closing_date', new Date().toISOString())
      .order('closing_date', { ascending: true })

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