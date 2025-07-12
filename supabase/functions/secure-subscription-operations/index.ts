import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifyMessage } from 'https://esm.sh/viem@2.31.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SubscriptionOperationRequest {
  operation: 'get' | 'create' | 'update'
  walletAddress: string
  signature: string
  message: string
  privyUserId: string
  subscriptionData?: {
    subscriptionType: 'early_bird' | 'standard'
    amountPaid: number
    transactionHash?: string
    endDate: string
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Use service role key to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { operation, walletAddress, signature, message, privyUserId, subscriptionData }: SubscriptionOperationRequest = await req.json()

    // Get client IP and user agent for audit logging
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Audit log helper
    const logOperation = async (success: boolean, errorMessage?: string, additionalData?: any) => {
      await supabase.from('security_audit_log').insert({
        operation_type: `subscription_${operation}`,
        wallet_address: walletAddress,
        user_id: privyUserId,
        ip_address: clientIP,
        user_agent: userAgent,
        success,
        error_message: errorMessage,
        additional_data: additionalData
      })
    }

    // Validate required fields
    if (!walletAddress || !privyUserId) {
      await logOperation(false, 'Missing required fields')
      return new Response(
        JSON.stringify({ error: 'Missing required fields: walletAddress, privyUserId' }),
        { status: 400, headers: corsHeaders }
      )
    }

    // For insert/update operations, require signature authentication
    const requiresSignature = operation === 'create' || operation === 'update'
    
    if (requiresSignature) {
      // Validate signature fields for authenticated operations
      if (!signature || !message) {
        await logOperation(false, 'Missing signature fields for authenticated operation')
        return new Response(
          JSON.stringify({ error: 'Missing required fields for this operation: signature, message' }),
          { status: 400, headers: corsHeaders }
        )
      }

      // Verify wallet signature to prove ownership
      let isValidSignature = false
      try {
        isValidSignature = await verifyMessage({
          address: walletAddress as `0x${string}`,
          message,
          signature: signature as `0x${string}`,
        })
      } catch (error) {
        console.error('Signature verification failed:', error)
        await logOperation(false, 'Signature verification failed', { error: error.message })
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: corsHeaders }
        )
      }

      if (!isValidSignature) {
        await logOperation(false, 'Invalid signature')
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: corsHeaders }
        )
      }
      
      console.log('Signature verification successful for authenticated operation')
    } else {
      console.log('Proceeding with read operation (no signature required)')
    }

    // Verify that the wallet address belongs to the profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('crypto_address')
      .eq('crypto_address', walletAddress)
      .maybeSingle()

    if (profileError || !profile) {
      await logOperation(false, 'Profile not found or verification failed')
      return new Response(
        JSON.stringify({ error: 'Profile not found for this wallet address' }),
        { status: 403, headers: corsHeaders }
      )
    }

    // Handle different operations
    switch (operation) {
      case 'get':
        const { data: subscription, error: getError } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', privyUserId)
          .maybeSingle()

        if (getError) {
          await logOperation(false, 'Database error during get', { error: getError.message })
          return new Response(
            JSON.stringify({ error: 'Database error' }),
            { status: 500, headers: corsHeaders }
          )
        }

        await logOperation(true, null, { subscriptionFound: !!subscription })
        return new Response(
          JSON.stringify({ subscription }),
          { headers: corsHeaders }
        )

      case 'create':
        if (!subscriptionData) {
          await logOperation(false, 'Missing subscription data for create operation')
          return new Response(
            JSON.stringify({ error: 'Subscription data required for create operation' }),
            { status: 400, headers: corsHeaders }
          )
        }

        // Check if subscription already exists
        const { data: existingSubscription, error: existingError } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('user_id', privyUserId)
          .maybeSingle()

        if (existingError) {
          await logOperation(false, 'Database error checking existing subscription', { error: existingError.message })
          return new Response(
            JSON.stringify({ error: 'Database error' }),
            { status: 500, headers: corsHeaders }
          )
        }

        if (existingSubscription) {
          await logOperation(false, 'Subscription already exists')
          return new Response(
            JSON.stringify({ error: 'Subscription already exists for this user' }),
            { status: 409, headers: corsHeaders }
          )
        }

        const { data: newSubscription, error: createError } = await supabase
          .from('subscriptions')
          .insert({
            user_id: privyUserId,
            subscription_type: subscriptionData.subscriptionType,
            amount_paid: subscriptionData.amountPaid,
            transaction_hash: subscriptionData.transactionHash,
            end_date: subscriptionData.endDate,
            status: 'active'
          })
          .select()
          .single()

        if (createError) {
          await logOperation(false, 'Database error during create', { error: createError.message })
          return new Response(
            JSON.stringify({ error: 'Failed to create subscription' }),
            { status: 500, headers: corsHeaders }
          )
        }

        await logOperation(true, null, { subscriptionType: subscriptionData.subscriptionType })
        return new Response(
          JSON.stringify({ subscription: newSubscription }),
          { headers: corsHeaders }
        )

      case 'update':
        if (!subscriptionData) {
          await logOperation(false, 'Missing subscription data for update operation')
          return new Response(
            JSON.stringify({ error: 'Subscription data required for update operation' }),
            { status: 400, headers: corsHeaders }
          )
        }

        const { data: updatedSubscription, error: updateError } = await supabase
          .from('subscriptions')
          .update(subscriptionData)
          .eq('user_id', privyUserId)
          .select()
          .single()

        if (updateError) {
          await logOperation(false, 'Database error during update', { error: updateError.message })
          return new Response(
            JSON.stringify({ error: 'Failed to update subscription' }),
            { status: 500, headers: corsHeaders }
          )
        }

        await logOperation(true, null, { updated: true })
        return new Response(
          JSON.stringify({ subscription: updatedSubscription }),
          { headers: corsHeaders }
        )

      default:
        await logOperation(false, 'Invalid operation')
        return new Response(
          JSON.stringify({ error: 'Invalid operation' }),
          { status: 400, headers: corsHeaders }
        )
    }

  } catch (error) {
    console.error('Secure subscription operations error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    )
  }
})