import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifyMessage } from 'https://esm.sh/viem@2.31.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Security validation functions
function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

function validateWalletAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

function validateProfileType(type: string): boolean {
  return ['Startup', 'Lender', 'Service Provider'].includes(type)
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
    // Clean up old nonces (older than 1 hour)
    await supabase.rpc('cleanup_old_nonces')

    const signatureHash = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(signature)
    )
    const hashHex = Array.from(new Uint8Array(signatureHash))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    console.log('🔍 Checking signature replay for:', { walletAddress, signatureHash: hashHex.substring(0, 10) + '...' })

    const { data: existing, error: checkError } = await supabase
      .from('signature_nonces')
      .select('id')
      .eq('wallet_address', walletAddress)
      .eq('signature_hash', hashHex)
      .maybeSingle()

    if (checkError) {
      console.error('❌ Error checking signature replay:', checkError)
      return false
    }

    if (existing) {
      console.log('❌ Signature replay detected')
      return false // Signature already used
    }

    console.log('✅ Signature is new, storing it')
    // Store the signature hash - we'll only store if the operation succeeds
    const { error: insertError } = await supabase
      .from('signature_nonces')
      .insert({
        wallet_address: walletAddress,
        signature_hash: hashHex
      })

    if (insertError) {
      console.error('❌ Error storing signature nonce:', insertError)
      return false
    }

    return true
  } catch (error) {
    console.error('❌ Signature replay check failed:', error)
    return false
  }
}


interface ProfileOperationRequest {
  operation: 'get' | 'create' | 'update' | 'checkExisting' | 'updatePreference'
  walletAddress: string
  signature?: string
  message?: string
  profileData?: {
    userEmail?: string
    profileType?: "Startup" | "Lender" | "Service Provider"
    signedTermsHash?: string
    show_all_tokens?: boolean
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

    // Basic input validation
    if (!operation || !walletAddress) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }
    
    // Message is only required for operations that need signatures
    if (!['get', 'updatePreference'].includes(operation) && !message) {
      return new Response(
        JSON.stringify({ error: 'Message required for this operation' }),
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


    // For insert/update operations, require signature authentication
    const requiresSignature = operation === 'create' || operation === 'update'
    
    if (requiresSignature) {
      if (!signature) {
        return new Response(
          JSON.stringify({ error: 'Signature required for this operation' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }


      // Check signature replay
      console.log('🔄 Checking for signature replay...')
      const signatureValid = await checkSignatureReplay(supabase, walletAddress, signature)
      if (!signatureValid) {
        console.log('❌ Signature replay check failed')
        await logOperation(false, 'Signature replay detected or storage failed')
        return new Response(
          JSON.stringify({ error: 'Signature has already been used or there was an error processing it. Please sign a new message.' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }
      console.log('✅ Signature replay check passed')

      // Verify wallet signature to prove ownership
      let isValidSignature = false
      try {
        console.log('🔐 Verifying signature for authenticated operation:', {
          operation,
          walletAddress,
          signature: signature?.substring(0, 10) + '...',
          message: message?.substring(0, 50) + '...',
          messageLength: message?.length,
          walletAddressLength: walletAddress?.length,
          signatureLength: signature?.length
        });
        
        // Ensure wallet address starts with 0x
        const formattedWalletAddress = walletAddress.startsWith('0x') ? walletAddress : `0x${walletAddress}`;
        // Ensure signature starts with 0x  
        const formattedSignature = signature.startsWith('0x') ? signature : `0x${signature}`;
        
        console.log('🔧 Formatted for verification:', {
          formattedWalletAddress,
          formattedSignature: formattedSignature?.substring(0, 10) + '...',
          originalWalletAddress: walletAddress,
          originalSignature: signature?.substring(0, 10) + '...'
        });
        
        isValidSignature = await verifyMessage({
          address: formattedWalletAddress as `0x${string}`,
          message,
          signature: formattedSignature as `0x${string}`,
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
          JSON.stringify({ error: `Signature verification error: ${error.message}` }),
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
      
      console.log('🎉 Signature verification successful, proceeding with authenticated operation...')
    } else {
      console.log('📖 Proceeding with read operation (no signature required)...')
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
          return new Response(
            JSON.stringify({ error: 'Profile data required for create operation' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        // Validate profile data (email is optional for create)
        if (profileData.userEmail && profileData.userEmail.trim() && !validateEmail(profileData.userEmail)) {
          console.log('❌ Invalid email format:', profileData.userEmail)
          return new Response(
            JSON.stringify({ error: 'Invalid email format' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }

        if (!profileData.profileType || !validateProfileType(profileData.profileType)) {
          return new Response(
            JSON.stringify({ error: 'Invalid profile type' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
          await logOperation(false, sanitizeError(createError))
          return new Response(
            JSON.stringify({ error: sanitizeError(createError) }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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

      case 'updatePreference':
        if (!profileData || typeof profileData.show_all_tokens !== 'boolean') {
          await logOperation(false, 'Missing or invalid show_all_tokens preference')
          return new Response(
            JSON.stringify({ error: 'Boolean show_all_tokens preference required' }),
            { status: 400, headers: corsHeaders }
          )
        }

        const { data: updatedPreference, error: preferenceError } = await supabase
          .from('profiles')
          .update({ show_all_tokens: profileData.show_all_tokens })
          .eq('crypto_address', walletAddress)
          .select()
          .single()

        if (preferenceError) {
          await logOperation(false, 'Database error during preference update', { error: preferenceError.message })
          return new Response(
            JSON.stringify({ error: 'Failed to update preference' }),
            { status: 500, headers: corsHeaders }
          )
        }

        await logOperation(true, null, { preference_updated: true })
        return new Response(
          JSON.stringify({ profile: updatedPreference }),
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