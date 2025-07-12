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
  console.log('🚀 Edge function called:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    // Use service role key to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('📝 Parsing request body...');
    const rawBody = await req.text();
    console.log('📄 Raw request body:', { 
      rawBody: rawBody.substring(0, 500),
      bodyLength: rawBody.length,
      firstBytes: Array.from(new TextEncoder().encode(rawBody.substring(0, 20)))
    });
    
    let parsedBody;
    try {
      parsedBody = JSON.parse(rawBody);
      console.log('✅ Successfully parsed JSON:', parsedBody);
    } catch (parseError) {
      console.error('❌ Failed to parse JSON:', {
        parseError,
        rawBodyStart: rawBody.substring(0, 100),
        rawBodyBytes: Array.from(new TextEncoder().encode(rawBody.substring(0, 20)))
      });
      throw parseError;
    }
    
    const { operation, walletAddress, signature, message, profileData }: ProfileOperationRequest = parsedBody;
    
    console.log('🔍 Operation details:', {
      operation,
      walletAddress,
      signature: signature?.substring(0, 10) + '...',
      message: message?.substring(0, 50) + '...',
      profileData
    });

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
      console.log('🔐 Verifying signature:', {
        walletAddress,
        signature: signature?.substring(0, 10) + '...',
        message: message?.substring(0, 50) + '...',
        messageLength: message?.length
      });
      
      isValidSignature = await verifyMessage({
        address: walletAddress as `0x${string}`,
        message,
        signature: signature as `0x${string}`,
      })
      
      console.log('✅ Signature verification result:', isValidSignature)
    } catch (error) {
      console.error('❌ Signature verification failed:', {
        error,
        errorMessage: error?.message,
        walletAddress,
        signature: signature?.substring(0, 10) + '...',
        message: message?.substring(0, 50) + '...'
      })
      await logOperation(false, 'Signature verification failed', { error: error.message })
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!isValidSignature) {
      console.error('❌ Signature verification failed - invalid signature')
      await logOperation(false, 'Invalid signature')
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    console.log('🎉 Signature verification successful, proceeding with operation...')

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
        console.log('🔨 Processing create operation...');
        
        if (!profileData) {
          console.error('❌ Profile data missing');
          await logOperation(false, 'Missing profile data for create operation')
          return new Response(
            JSON.stringify({ error: 'Profile data required for create operation' }),
            { status: 400, headers: corsHeaders }
          )
        }
        
        console.log('✅ Profile data provided:', profileData);

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

        const insertData = {
          user_email: profileData.userEmail || '',
          crypto_address: walletAddress,
          profile_type: profileData.profileType,
          signed_terms_hash: profileData.signedTermsHash || '',
        };
        
        console.log('📊 Inserting profile data:', insertData);
        
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert(insertData)
          .select()
          .single();
          
        console.log('💾 Database insert result:', { newProfile, createError });

        if (createError) {
          console.error('❌ Database create error:', {
            createError,
            errorMessage: createError?.message,
            errorCode: createError?.code,
            errorDetails: createError?.details
          });
          await logOperation(false, 'Database error during create', { error: createError.message })
          return new Response(
            JSON.stringify({ error: 'Failed to create profile' }),
            { status: 500, headers: corsHeaders }
          )
        }

        console.log('🎉 Profile created successfully, returning response...');
        const response = { profile: newProfile };
        console.log('📤 Returning response:', response);
        
        await logOperation(true, null, { profileType: profileData.profileType })
        return new Response(
          JSON.stringify(response),
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
    console.error('❌ Edge function error:', {
      error,
      errorMessage: error?.message,
      errorStack: error?.stack,
      errorType: typeof error,
      errorString: error?.toString()
    });
    
    const errorResponse = { error: 'Internal server error' };
    console.log('📤 Returning error response:', errorResponse);
    
    return new Response(
      JSON.stringify(errorResponse),
      { status: 500, headers: corsHeaders }
    )
  }
})