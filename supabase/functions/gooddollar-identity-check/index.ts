import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface IdentityRequest {
  walletAddress: string;
}

interface IdentityResponse {
  isVerified: boolean;
  whitelistedAddress?: string;
  canClaim: boolean;
  error?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletAddress }: IdentityRequest = await req.json();

    if (!walletAddress) {
      return new Response(
        JSON.stringify({ error: 'Wallet address is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Check GoodDollar identity verification via their API
    const identityApiUrl = `https://api.gooddollar.org/verify/face/${walletAddress}`;
    
    let isVerified = false;
    let whitelistedAddress = undefined;

    try {
      const identityResponse = await fetch(identityApiUrl, {
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (identityResponse.ok) {
        const identityData = await identityResponse.json();
        isVerified = identityData.isVerified || false;
        whitelistedAddress = identityData.whitelistedAddress;
      }
    } catch (apiError) {
      console.error('GoodDollar API error:', apiError);
      // Continue with verification check from on-chain data
    }

    // If not verified via API, check on-chain identity contracts
    if (!isVerified) {
      try {
        // Check Celo blockchain for identity verification
        const celoApiUrl = `https://forno.celo.org`;
        
        // Call identity contract to check if address is verified
        const contractCall = {
          jsonrpc: "2.0",
          method: "eth_call",
          params: [{
            to: "0x76598b7bf16fa5a4b8b71dd86e9d7eb233afbe68", // GoodDollar Identity contract
            data: `0x9a50400e000000000000000000000000${walletAddress.slice(2)}` // isVerified(address) function
          }, "latest"],
          id: 1
        };

        const response = await fetch(celoApiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(contractCall)
        });

        if (response.ok) {
          const result = await response.json();
          // Parse boolean result from contract
          isVerified = result.result === '0x0000000000000000000000000000000000000000000000000000000000000001';
        }
      } catch (chainError) {
        console.error('Blockchain verification error:', chainError);
      }
    }

    // Check claim eligibility based on verification status
    const canClaim = isVerified;

    // Log identity check
    await supabase.from('security_audit_log').insert({
      wallet_address: walletAddress,
      operation_type: 'identity_check',
      success: true,
      additional_data: { 
        isVerified, 
        whitelistedAddress,
        canClaim,
        timestamp: new Date().toISOString()
      }
    });

    const response: IdentityResponse = {
      isVerified,
      whitelistedAddress,
      canClaim
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Identity check error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        isVerified: false,
        canClaim: false
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});