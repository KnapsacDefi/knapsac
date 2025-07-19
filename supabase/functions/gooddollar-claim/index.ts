
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ClaimRequest {
  action: 'checkEligibility' | 'recordClaim' | 'checkStatus';
  walletAddress: string;
  transactionHash?: string;
  amount?: string;
}

// GoodDollar contract addresses and ABIs
const UBI_SCHEME_CONTRACT = '0xD7aC544F8A570C4d8764c3AAbCF6870CBD960D0D';
const CELO_RPC_URL = 'https://forno.celo.org';

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, walletAddress, transactionHash, amount }: ClaimRequest = await req.json();

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === 'checkStatus') {
      // Check last claim time from database
      const { data: lastClaim } = await supabase
        .from('gooddollar_claims')
        .select('claimed_at')
        .eq('wallet_address', walletAddress)
        .order('claimed_at', { ascending: false })
        .limit(1)
        .single();

      let nextClaimTime = null;
      
      if (lastClaim && lastClaim.claimed_at) {
        const lastClaimTime = new Date(lastClaim.claimed_at);
        nextClaimTime = new Date(lastClaimTime.getTime() + 24 * 60 * 60 * 1000); // Add 24 hours
      }

      return new Response(JSON.stringify({ 
        nextClaimTime: nextClaimTime?.toISOString() || null
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (action === 'checkEligibility') {
      // Check claim eligibility using GoodDollar contracts
      
      // First check if user is verified via identity contract
      const identityCheckResponse = await fetch(`${supabaseUrl}/functions/v1/gooddollar-identity-check`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({ walletAddress }),
      });

      const identityData = await identityCheckResponse.json();
      
      if (!identityData.isVerified) {
        return new Response(JSON.stringify({ 
          canClaim: false, 
          amount: '0',
          error: 'Identity not verified' 
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Check entitlement via contract call
      const entitlementCall = {
        jsonrpc: "2.0",
        method: "eth_call",
        params: [{
          to: UBI_SCHEME_CONTRACT,
          data: `0x9d76ea58000000000000000000000000${walletAddress.slice(2)}` // checkEntitlement(address)
        }, "latest"],
        id: 1
      };

      const rpcResponse = await fetch(CELO_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(entitlementCall)
      });

      const rpcResult = await rpcResponse.json();
      const entitlementAmount = rpcResult.result ? parseInt(rpcResult.result, 16) : 0;

      // Check last claim time from database
      const { data: lastClaim } = await supabase
        .from('gooddollar_claims')
        .select('claimed_at')
        .eq('wallet_address', walletAddress)
        .order('claimed_at', { ascending: false })
        .limit(1)
        .single();

      let canClaim = entitlementAmount > 0;
      
      // Check if 24 hours have passed since last claim
      if (lastClaim && lastClaim.claimed_at) {
        const lastClaimTime = new Date(lastClaim.claimed_at);
        const now = new Date();
        const hoursSinceLastClaim = (now.getTime() - lastClaimTime.getTime()) / (1000 * 60 * 60);
        canClaim = canClaim && hoursSinceLastClaim >= 24;
      }

      return new Response(JSON.stringify({ 
        canClaim, 
        amount: entitlementAmount.toString() 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } else if (action === 'recordClaim') {
      // Record successful claim in database
      const { data, error } = await supabase
        .from('gooddollar_claims')
        .insert([{
          wallet_address: walletAddress,
          transaction_hash: transactionHash,
          amount: parseFloat(amount || '0'),
          claimed_at: new Date().toISOString()
        }])
        .select()
        .single();

      if (error) {
        console.error('Error recording claim:', error);
        throw error;
      }

      return new Response(JSON.stringify({ success: true, claim: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error in gooddollar-claim function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
