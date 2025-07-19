
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { createPublicClient, http } from 'https://esm.sh/viem@2.32.0'
import { celo } from 'https://esm.sh/viem@2.32.0/chains'

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
      // Create Viem public client for Celo
      const publicClient = createPublicClient({
        chain: celo,
        transport: http('https://forno.celo.org'),
      });

      // GoodDollar Identity contract on Celo mainnet
      const IDENTITY_CONTRACT = '0xC361A6E67822a0EDc17D899227dd9FC50BD62F42';
      
      // Identity contract ABI for the isWhitelisted function
      const IDENTITY_ABI = [
        {
          "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
          "name": "isWhitelisted",
          "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
          "stateMutability": "view",
          "type": "function"
        }
      ] as const;
      
      // Check if the address is whitelisted (face verified)
      const isWhitelistedResult = await publicClient.readContract({
        address: IDENTITY_CONTRACT as `0x${string}`,
        abi: IDENTITY_ABI,
        functionName: 'isWhitelisted',
        args: [walletAddress as `0x${string}`]
      });
      
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
      // Return false but don't throw - this is expected for unverified users
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
