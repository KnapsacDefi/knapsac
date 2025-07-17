import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

    console.log('Checking identity verification for address:', walletAddress);

    let isVerified = false;
    let whitelistedAddress: string | undefined;
    let canClaim = false;

    try {
      // Try GoodDollar Graph API first (more reliable than REST API)
      console.log('Checking GoodDollar Graph API for verification...');
      const graphQuery = `
        query GetUser($address: String!) {
          user(id: $address) {
            id
            isVerified
            whitelistedAddress
          }
        }
      `;
      
      const graphResponse = await fetch('https://api.thegraph.com/subgraphs/name/gooddollar/gooddollar-v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: graphQuery,
          variables: { address: walletAddress.toLowerCase() }
        })
      });

      if (graphResponse.ok) {
        const graphData = await graphResponse.json();
        console.log('GoodDollar Graph API response:', graphData);
        
        if (graphData.data?.user?.isVerified) {
          isVerified = true;
          whitelistedAddress = graphData.data.user.whitelistedAddress || walletAddress;
          canClaim = true;
        }
      } else {
        console.log('GoodDollar Graph API returned non-OK status:', graphResponse.status);
      }
    } catch (apiError) {
      console.log('GoodDollar Graph API error:', apiError);
      // Continue to on-chain check if API fails
    }

    // If not verified via API, check on-chain
    if (!isVerified) {
      console.log('Checking on-chain identity verification...');
      try {
        // GoodDollar Identity contract on Celo mainnet
        const IDENTITY_CONTRACT = '0x76e76e10Ac308A1D54a00f9df27EdCE4801F288b';
        const RPC_URL = 'https://forno.celo.org';
        
        // Check if address is whitelisted in the identity contract
        const response = await fetch(RPC_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            method: 'eth_call',
            params: [
              {
                to: IDENTITY_CONTRACT,
                data: `0x3af32abf${walletAddress.slice(2).padStart(64, '0')}` // isWhitelisted(address)
              },
              'latest'
            ],
            id: 1
          })
        });

        const result = await response.json();
        console.log('On-chain verification result:', result);
        
        if (result.result && result.result !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
          isVerified = true;
          whitelistedAddress = walletAddress;
          canClaim = true;
        }
      } catch (onChainError) {
        console.error('On-chain verification error:', onChainError);
      }
    }

    // Log the identity check for security audit
    try {
      await supabase
        .from('security_audit_log')
        .insert({
          wallet_address: walletAddress,
          operation_type: 'identity_verification_check',
          success: true,
          additional_data: {
            isVerified,
            whitelistedAddress,
            canClaim,
            timestamp: new Date().toISOString()
          }
        });
    } catch (logError) {
      console.error('Failed to log identity check:', logError);
    }

    const response: IdentityResponse = {
      isVerified,
      whitelistedAddress,
      canClaim
    };

    console.log('Final identity verification result:', response);

    return new Response(
      JSON.stringify(response),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Identity verification error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error during identity verification',
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