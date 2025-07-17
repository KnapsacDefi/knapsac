import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { ethers } from 'https://esm.sh/ethers@5.7.2'

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
        // GoodDollar Identity contract on Celo mainnet (correct address from deployment.json)
        const IDENTITY_CONTRACT = '0xC361A6E67822a0EDc17D899227dd9FC50BD62F42';
        const RPC_URL = 'https://forno.celo.org';
        
        // Identity contract ABI for the isWhitelisted function
        const IDENTITY_ABI = [
          "function isWhitelisted(address account) public view returns (bool)"
        ];
        
        // Initialize ethers provider and contract
        const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
        const identityContract = new ethers.Contract(IDENTITY_CONTRACT, IDENTITY_ABI, provider);
        
        // Check if the address is whitelisted (face verified)
        const isWhitelistedResult = await identityContract.isWhitelisted(walletAddress);
        console.log('On-chain isWhitelisted result for', walletAddress, ':', isWhitelistedResult);
        
        if (isWhitelistedResult) {
          isVerified = true;
          whitelistedAddress = walletAddress;
          canClaim = true;
          console.log('Address is verified on-chain');
        } else {
          console.log('Address is NOT verified on-chain');
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