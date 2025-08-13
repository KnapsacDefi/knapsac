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
    const { portfolio_id } = await req.json()

    console.log('🎯 Claim rewards request:', { portfolio_id })

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
      console.error('Authentication failed:', userError)
      return new Response(
        JSON.stringify({ error: 'Authentication failed' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Validate required fields
    if (!portfolio_id) {
      return new Response(
        JSON.stringify({ error: 'Portfolio ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Get the portfolio entry with lending pool details
    const { data: portfolioEntry, error: portfolioError } = await supabaseClient
      .from('portfolio')
      .select(`
        *,
        lending_pool (
          target_amount,
          monthly_interest,
          closing_date,
          min_lend_period,
          max_lend_period
        )
      `)
      .eq('id', portfolio_id)
      .eq('user_id', user.id)
      .single()

    if (portfolioError || !portfolioEntry) {
      console.error('Portfolio entry not found:', portfolioError)
      return new Response(
        JSON.stringify({ error: 'Portfolio entry not found or access denied' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('📋 Portfolio entry found:', portfolioEntry)

    // Check if already claimed
    if (portfolioEntry.payment_status === 'completed') {
      return new Response(
        JSON.stringify({ error: 'Rewards already claimed' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Calculate eligibility
    const lendDate = new Date(portfolioEntry.created_at)
    const eligibleDate = new Date(lendDate.getTime() + portfolioEntry.lend_period * 24 * 60 * 60 * 1000)
    const isEligible = new Date() >= eligibleDate

    if (!isEligible) {
      return new Response(
        JSON.stringify({ 
          error: 'Not yet eligible for claiming',
          eligible_date: eligibleDate.toISOString()
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Calculate claimable amount
    const monthlyInterestRate = portfolioEntry.lending_pool.monthly_interest / 100
    const periodInMonths = portfolioEntry.lend_period / 30
    const interestEarned = portfolioEntry.lend_amount * monthlyInterestRate * periodInMonths
    const claimableAmount = portfolioEntry.lend_amount + interestEarned

    console.log('💰 Calculated claimable amount:', {
      principal: portfolioEntry.lend_amount,
      interestRate: monthlyInterestRate,
      periodInMonths,
      interestEarned,
      claimableAmount
    })

    // Update portfolio entry to mark as claimed
    const { data: updatedPortfolio, error: updateError } = await supabaseClient
      .from('portfolio')
      .update({
        payment_status: 'completed',
        claim_date: new Date().toISOString(),
        claim_amount: claimableAmount,
        payment_token: portfolioEntry.lend_token,
        claim_currency: portfolioEntry.lend_token,
        updated_at: new Date().toISOString()
      })
      .eq('id', portfolio_id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating portfolio entry:', updateError)
      return new Response(
        JSON.stringify({ error: 'Failed to update portfolio entry' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    console.log('✅ Portfolio entry updated successfully:', updatedPortfolio)

    return new Response(
      JSON.stringify({ 
        success: true,
        portfolio: updatedPortfolio,
        claimable_amount: claimableAmount,
        message: 'Rewards claimed successfully'
      }),
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