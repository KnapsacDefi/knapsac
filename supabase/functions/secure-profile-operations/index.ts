import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifyMessage } from 'https://esm.sh/viem@2.31.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ProfileOperationRequest {
  operation: 'get' | 'create' | 'update' | 'checkExisting'
  walletAddress: string
  signature: string
  message: string
  profileData?: {
    userEmail?: string
    profileType?: "Startup" | "Lender" | "Service Provider"
    signedTermsHash?: string
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

    const { operation, walletAddress, signature, message, profileData }: ProfileOperationRequest = await req.json()

    // Get client IP and user agent for audit logging
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    // Audit log helper
    const logOperation = async (success: boolean, errorMessage?: string, additionalData?: any) => {
      await supabase.from('security_audit_log').insert({
        operation_type: `profile_${operation}`,
        wallet_address: walletAddress,
        user_id: null, // We don't have Supabase user IDs with Privy
        ip_address: clientIP,
        user_agent: userAgent,
        success,
        error_message: errorMessage,
        additional_data: additionalData
      })
    }

    // Validate required fields
    if (!walletAddress || !signature || !message) {
      await logOperation(false, 'Missing required fields')
      return new Response(
        JSON.stringify({ error: 'Missing required fields: walletAddress, signature, message' }),
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
       console.error('Signature verification :', isValidSignature)
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

    // Handle different operations
    switch (operation) {
      case 'get':
        const { data: profile, error: getError } = await supabase
          .from('profiles')
          .select('*')
          .eq('crypto_address', walletAddress)
          .maybeSingle()

        if (getError) {
          await logOperation(false, 'Database error during get', { error: getError.message })
          return new Response(
            JSON.stringify({ error: 'Database error' }),
            { status: 500, headers: corsHeaders }
          )
        }

        await logOperation(true, null, { profileFound: !!profile })
        return new Response(
          JSON.stringify({ profile }),
          { headers: corsHeaders }
        )

      case 'checkExisting':
        const { data: existingProfile, error: checkError } = await supabase
          .from('profiles')
          .select('id')
          .eq('crypto_address', walletAddress)
          .maybeSingle()

        if (checkError) {
          await logOperation(false, 'Database error during check', { error: checkError.message })
          return new Response(
            JSON.stringify({ error: 'Database error' }),
            { status: 500, headers: corsHeaders }
          )
        }

        await logOperation(true, null, { exists: !!existingProfile })
        return new Response(
          JSON.stringify({ exists: !!existingProfile }),
          { headers: corsHeaders }
        )

      case 'create':
        if (!profileData) {
          await logOperation(false, 'Missing profile data for create operation')
          return new Response(
            JSON.stringify({ error: 'Profile data required for create operation' }),
            { status: 400, headers: corsHeaders }
          )
        }

        // Check if profile already exists
        const { data: existingForCreate, error: existingError } = await supabase
          .from('profiles')
          .select('id')
          .eq('crypto_address', walletAddress)
          .maybeSingle()

        if (existingError) {
          await logOperation(false, 'Database error checking existing profile', { error: existingError.message })
          return new Response(
            JSON.stringify({ error: 'Database error' }),
            { status: 500, headers: corsHeaders }
          )
        }

        if (existingForCreate) {
          await logOperation(false, 'Profile already exists')
          return new Response(
            JSON.stringify({ error: 'Profile already exists for this wallet address' }),
            { status: 409, headers: corsHeaders }
          )
        }

        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            user_email: profileData.userEmail || '',
            crypto_address: walletAddress,
            profile_type: profileData.profileType,
            signed_terms_hash: profileData.signedTermsHash || '',
          })
          .select()
          .single()

        if (createError) {
          await logOperation(false, 'Database error during create', { error: createError.message })
          return new Response(
            JSON.stringify({ error: 'Failed to create profile' }),
            { status: 500, headers: corsHeaders }
          )
        }

        await logOperation(true, null, { profileType: profileData.profileType })
        return new Response(
          JSON.stringify({ profile: newProfile }),
          { headers: corsHeaders }
        )

      case 'update':
        if (!profileData) {
          await logOperation(false, 'Missing profile data for update operation')
          return new Response(
            JSON.stringify({ error: 'Profile data required for update operation' }),
            { status: 400, headers: corsHeaders }
          )
        }

        const { data: updatedProfile, error: updateError } = await supabase
          .from('profiles')
          .update(profileData)
          .eq('crypto_address', walletAddress)
          .select()
          .single()

        if (updateError) {
          await logOperation(false, 'Database error during update', { error: updateError.message })
          return new Response(
            JSON.stringify({ error: 'Failed to update profile' }),
            { status: 500, headers: corsHeaders }
          )
        }

        await logOperation(true, null, { updated: true })
        return new Response(
          JSON.stringify({ profile: updatedProfile }),
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
    console.error('Secure profile operations error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    )
  }
})