import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifyMessage } from 'https://esm.sh/viem@2.31.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Security validation functions
function validateWalletAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

function validateSubscriptionType(type: string): boolean {
  return ['early_bird', 'standard'].includes(type)
}

function validateTransactionHash(hash?: string): boolean {
  if (!hash) return true // Optional field
  return /^0x[a-fA-F0-9]{64}$/.test(hash)
}

function validateTimestamp(message: string): boolean {
  const timestampMatch = message.match(/at (\d+)/)
  if (!timestampMatch) return false
  
  const timestamp = parseInt(timestampMatch[1])
  const now = Date.now()
  const fiveMinutes = 5 * 60 * 1000
  
  return Math.abs(now - timestamp) < fiveMinutes
}

function sanitizeError(error: any): string {
  console.error('Operation error:', error)
  return 'Operation failed. Please try again.'
}

async function checkSignatureReplay(
  supabase: any,
  walletAddress: string,
  signature: string
): Promise<boolean> {
  try {
    const signatureHash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(signature)
    )
    const hashHex = Array.from(new Uint8Array(signatureHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    const { data: existing } = await supabase
      .from('signature_nonces')
      .select('id')
      .eq('wallet_address', walletAddress)
      .eq('signature_hash', hashHex)
      .single()

    if (existing) {
      return false // Signature already used
    }

    // Store the signature hash
    await supabase
      .from('signature_nonces')
      .insert({
        wallet_address: walletAddress,
        signature_hash: hashHex
      })

    return true
  } catch (error) {
    console.error('Signature replay check failed:', error)
    return false
  }
}

async function checkRateLimit(
  supabase: any,
  walletAddress: string,
  operation: string
): Promise<boolean> {
  try {
    const { data } = await supabase.rpc('check_rate_limit', {
      p_wallet_address: walletAddress,
      p_operation_type: operation
    })
    return data === true
  } catch (error) {
    console.error('Rate limit check failed:', error)
    return false
  }
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

    // Basic input validation
    if (!operation || !walletAddress || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Validate wallet address format
    if (!validateWalletAddress(walletAddress)) {
      return new Response(
        JSON.stringify({ error: 'Invalid wallet address format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Check rate limiting
    const rateLimitOk = await checkRateLimit(supabase, walletAddress, operation)
    if (!rateLimitOk) {
      await logOperation(false, 'Rate limit exceeded')
      return new Response(
        JSON.stringify({ error: 'Too many requests. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For insert/update operations, require signature authentication
    const requiresSignature = operation === 'create' || operation === 'update'
    
    if (requiresSignature) {
      if (!signature) {
        return new Response(
          JSON.stringify({ error: 'Signature required for this operation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Validate timestamp in message
      if (!validateTimestamp(message)) {
        await logOperation(false, 'Invalid or expired timestamp')
        return new Response(
          JSON.stringify({ error: 'Invalid or expired timestamp' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Check signature replay
      const signatureValid = await checkSignatureReplay(supabase, walletAddress, signature)
      if (!signatureValid) {
        await logOperation(false, 'Signature replay detected')
        return new Response(
          JSON.stringify({ error: 'Invalid signature or replay detected' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        await logOperation(false, 'Signature verification failed')
        return new Response(
          JSON.stringify({ error: 'Signature verification failed' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      if (!isValidSignature) {
        await logOperation(false, 'Invalid signature')
        return new Response(
          JSON.stringify({ error: 'Invalid signature' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
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
          .eq('wallet_address', walletAddress)
          .eq('status', 'active')
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
          return new Response(
            JSON.stringify({ error: 'Subscription data required for create operation' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Validate subscription data
        if (!validateSubscriptionType(subscriptionData.subscriptionType)) {
          return new Response(
            JSON.stringify({ error: 'Invalid subscription type' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (!validateTransactionHash(subscriptionData.transactionHash)) {
          return new Response(
            JSON.stringify({ error: 'Invalid transaction hash format' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (subscriptionData.amountPaid <= 0) {
          return new Response(
            JSON.stringify({ error: 'Invalid amount paid' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Check if subscription already exists
        const { data: existingSubscription, error: existingError } = await supabase
          .from('subscriptions')
          .select('id')
          .eq('wallet_address', walletAddress)
          .eq('status', 'active')
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
            wallet_address: walletAddress,
            user_id: privyUserId, // Keep for compatibility
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
          .eq('wallet_address', walletAddress)
          .eq('status', 'active')
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