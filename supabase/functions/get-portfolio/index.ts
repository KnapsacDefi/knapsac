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
    const { userId } = await req.json()
    
    if (!userId) {
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

    const { data: portfolio, error } = await supabaseClient
      .from('portfolio')
      .select(`
        *,
        lending_pool!lending_pool_id (
          target_amount,
          monthly_interest,
          closing_date,
          min_lend_period,
          max_lend_period
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching portfolio:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Calculate claimable amounts and eligibility
    const portfolioWithClaims = portfolio?.map(entry => {
      const lendingPool = entry.lending_pool
      const currentDate = new Date()
      const closingDate = new Date(lendingPool.closing_date)
      const eligibleDate = new Date(closingDate.getTime() + (lendingPool.min_lend_period * 24 * 60 * 60 * 1000))
      
      const isEligible = currentDate > eligibleDate
      
      let claimableAmount = 0
      if (isEligible) {
        const eligibleDays = Math.floor((currentDate.getTime() - closingDate.getTime()) / (24 * 60 * 60 * 1000))
        const eligibleMonths = eligibleDays / 30
        const interestMultiplier = 1 + (eligibleMonths * (parseFloat(lendingPool.monthly_interest) / 100))
        claimableAmount = parseFloat(entry.lend_amount) * interestMultiplier
      }
      
      return {
        ...entry,
        is_eligible: isEligible,
        claimable_amount: claimableAmount,
        eligible_date: eligibleDate.toISOString()
      }
    }) || []

    return new Response(
      JSON.stringify({ portfolio: portfolioWithClaims }),
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