import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  console.log('🚀 Edge function called:', {
    method: req.method,
    url: req.url,
    headers: Object.fromEntries(req.headers.entries())
  });

  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight request');
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('📝 Parsing request body...');
    const rawBody = await req.text();
    console.log('📄 Raw request body:', {
      rawBody,
      bodyLength: rawBody.length,
      firstBytes: Array.from(new TextEncoder().encode(rawBody.substring(0, 20)))
    });

    let body;
    try {
      body = JSON.parse(rawBody);
      console.log('✅ Successfully parsed JSON:', body);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const { operation, walletAddress, signature, message, profileData } = body;

    console.log('🔍 Operation details:', {
      operation,
      walletAddress,
      signature: signature ? `${signature.substring(0, 10)}...` : 'undefined',
      message: message ? `${message.substring(0, 50)}...` : 'undefined',
      profileData
    });

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('❌ Missing Supabase configuration');
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle GET operation (no signature required)
    if (operation === 'get') {
      console.log('📖 Proceeding with read operation (no signature required)...');
      
      try {
        console.log('🔍 Querying database for wallet:', walletAddress);
        const { data: profiles, error: queryError } = await supabase
          .from('profiles')
          .select('*')
          .eq('crypto_address', walletAddress);

        console.log('📊 Database query result:', {
          profiles: profiles,
          profilesLength: profiles?.length || 0,
          queryError: queryError,
          firstProfile: profiles?.[0] || null
        });

        if (queryError) {
          console.error('❌ Database query error:', queryError);
          throw queryError;
        }

        const profile = profiles && profiles.length > 0 ? profiles[0] : null;
        
        console.log('🎯 Profile processing:', {
          profileExists: !!profile,
          profileId: profile?.id || 'none',
          profileType: profile?.profile_type || 'none',
          cryptoAddress: profile?.crypto_address || 'none',
          signedTermsHash: profile?.signed_terms_hash || 'none'
        });

        // Log audit entry
        await supabase.from('security_audit_log').insert({
          operation_type: 'profile_get',
          wallet_address: walletAddress,
          success: true,
          additional_data: { 
            profileFound: !!profile,
            profileId: profile?.id || null,
            profileType: profile?.profile_type || null
          }
        });

        const responseData = { profile };
        console.log('📤 Preparing response:', {
          responseData,
          profileIsNull: profile === null,
          profileKeys: profile ? Object.keys(profile) : [],
          responseStringified: JSON.stringify(responseData)
        });

        // Test JSON serialization
        try {
          const testSerialization = JSON.stringify(responseData);
          console.log('✅ JSON serialization test passed, length:', testSerialization.length);
        } catch (serializationError) {
          console.error('❌ JSON serialization failed:', serializationError);
          throw new Error('Profile data cannot be serialized');
        }

        return new Response(
          JSON.stringify(responseData),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );

      } catch (error) {
        console.error('❌ GET operation failed:', error);
        
        await supabase.from('security_audit_log').insert({
          operation_type: 'profile_get',
          wallet_address: walletAddress,
          success: false,
          error_message: error.message
        });

        return new Response(
          JSON.stringify({ error: 'Failed to get profile' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Handle other operations (create, update, etc.)
    if (!walletAddress || !signature || !message) {
      console.error('❌ Missing required fields for secure operation');
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Signature verification for secure operations
    const verifySignature = async (message: string, signature: string, walletAddress: string) => {
      try {
        console.log('🔐 Verifying signature for wallet:', walletAddress);
        
        // Import ethers for signature verification
        const { ethers } = await import('https://esm.sh/ethers@6.7.1');
        
        // Recover the address from the signature
        const recoveredAddress = ethers.verifyMessage(message, signature);
        console.log('🔍 Signature verification:', {
          expectedAddress: walletAddress.toLowerCase(),
          recoveredAddress: recoveredAddress.toLowerCase(),
          match: recoveredAddress.toLowerCase() === walletAddress.toLowerCase()
        });
        
        return recoveredAddress.toLowerCase() === walletAddress.toLowerCase();
      } catch (error) {
        console.error('❌ Signature verification failed:', error);
        return false;
      }
    };

    // Verify signature for secure operations
    const isValidSignature = await verifySignature(message, signature, walletAddress);
    if (!isValidSignature) {
      console.error('❌ Invalid signature');
      
      // Log failed attempt
      await supabase.from('security_audit_log').insert({
        operation_type: operation,
        wallet_address: walletAddress,
        success: false,
        error_message: 'Invalid signature'
      });

      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Handle CREATE operation
    if (operation === 'create') {
      console.log('🔨 Creating new profile...');
      
      try {
        // Check if profile already exists
        const { data: existingProfiles } = await supabase
          .from('profiles')
          .select('id')
          .eq('crypto_address', walletAddress);

        if (existingProfiles && existingProfiles.length > 0) {
          console.log('⚠️ Profile already exists for wallet:', walletAddress);
          return new Response(
            JSON.stringify({ error: 'Profile already exists' }),
            { 
              status: 409, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        // Create new profile
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            crypto_address: walletAddress,
            user_email: profileData.userEmail,
            profile_type: profileData.profileType,
            signed_terms_hash: profileData.signedTermsHash,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (createError) {
          console.error('❌ Profile creation error:', createError);
          throw createError;
        }

        console.log('✅ Profile created successfully:', newProfile);

        // Log successful creation
        await supabase.from('security_audit_log').insert({
          operation_type: 'profile_create',
          wallet_address: walletAddress,
          success: true,
          additional_data: { profileId: newProfile.id }
        });

        return new Response(
          JSON.stringify({ profile: newProfile }),
          { 
            status: 201, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );

      } catch (error) {
        console.error('❌ Profile creation failed:', error);
        
        await supabase.from('security_audit_log').insert({
          operation_type: 'profile_create',
          wallet_address: walletAddress,
          success: false,
          error_message: error.message
        });

        return new Response(
          JSON.stringify({ error: 'Failed to create profile' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Handle UPDATE operation
    if (operation === 'updatePreference') {
      console.log('🔄 Updating profile preferences...');
      
      try {
        const { data: updatedProfile, error: updateError } = await supabase
          .from('profiles')
          .update({
            ...profileData,
            updated_at: new Date().toISOString()
          })
          .eq('crypto_address', walletAddress)
          .select()
          .single();

        if (updateError) {
          console.error('❌ Profile update error:', updateError);
          throw updateError;
        }

        console.log('✅ Profile updated successfully:', updatedProfile);

        // Log successful update
        await supabase.from('security_audit_log').insert({
          operation_type: 'profile_update',
          wallet_address: walletAddress,
          success: true,
          additional_data: { profileId: updatedProfile.id }
        });

        return new Response(
          JSON.stringify({ profile: updatedProfile }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );

      } catch (error) {
        console.error('❌ Profile update failed:', error);
        
        await supabase.from('security_audit_log').insert({
          operation_type: 'profile_update',
          wallet_address: walletAddress,
          success: false,
          error_message: error.message
        });

        return new Response(
          JSON.stringify({ error: 'Failed to update profile' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Handle CHECK_EXISTING operation
    if (operation === 'checkExisting') {
      console.log('🔍 Checking if profile exists...');
      
      try {
        const { data: existingProfiles, error: checkError } = await supabase
          .from('profiles')
          .select('id')
          .eq('crypto_address', walletAddress);

        if (checkError) {
          console.error('❌ Profile check error:', checkError);
          throw checkError;
        }

        const exists = existingProfiles && existingProfiles.length > 0;
        console.log('✅ Profile existence check:', { exists });

        // Log check operation
        await supabase.from('security_audit_log').insert({
          operation_type: 'profile_check',
          wallet_address: walletAddress,
          success: true,
          additional_data: { exists }
        });

        return new Response(
          JSON.stringify({ exists }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );

      } catch (error) {
        console.error('❌ Profile check failed:', error);
        
        await supabase.from('security_audit_log').insert({
          operation_type: 'profile_check',
          wallet_address: walletAddress,
          success: false,
          error_message: error.message
        });

        return new Response(
          JSON.stringify({ error: 'Failed to check profile' }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

    // Unknown operation
    console.error('❌ Unknown operation:', operation);
    return new Response(
      JSON.stringify({ error: 'Unknown operation' }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
