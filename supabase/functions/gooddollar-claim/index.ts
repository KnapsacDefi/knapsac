import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ClaimRequest {
  walletAddress: string;
  action: 'claim' | 'checkStatus';
}

interface ClaimResponse {
  success: boolean;
  message?: string;
  amount?: string;
  canClaim?: boolean;
  nextClaimTime?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { walletAddress, action } = await req.json() as ClaimRequest;

    if (!walletAddress) {
      return new Response(
        JSON.stringify({ success: false, message: 'Wallet address is required' }),
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

    if (action === 'checkStatus') {
      // Check if user can claim (24-hour cooldown)
      const { data: lastClaim } = await supabase
        .from('gooddollar_claims')
        .select('claimed_at')
        .eq('wallet_address', walletAddress)
        .order('claimed_at', { ascending: false })
        .limit(1)
        .single();

      let canClaim = true;
      let nextClaimTime = null;

      if (lastClaim) {
        const lastClaimTime = new Date(lastClaim.claimed_at);
        const now = new Date();
        const timeDiff = now.getTime() - lastClaimTime.getTime();
        const hoursDiff = timeDiff / (1000 * 3600);

        if (hoursDiff < 24) {
          canClaim = false;
          nextClaimTime = new Date(lastClaimTime.getTime() + 24 * 60 * 60 * 1000).toISOString();
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          canClaim, 
          nextClaimTime 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    if (action === 'claim') {
      // Check if user can claim (24-hour cooldown)
      const { data: lastClaim } = await supabase
        .from('gooddollar_claims')
        .select('claimed_at')
        .eq('wallet_address', walletAddress)
        .order('claimed_at', { ascending: false })
        .limit(1)
        .single();

      if (lastClaim) {
        const lastClaimTime = new Date(lastClaim.claimed_at);
        const now = new Date();
        const timeDiff = now.getTime() - lastClaimTime.getTime();
        const hoursDiff = timeDiff / (1000 * 3600);

        if (hoursDiff < 24) {
          const nextClaimTime = new Date(lastClaimTime.getTime() + 24 * 60 * 60 * 1000);
          return new Response(
            JSON.stringify({ 
              success: false, 
              message: `You can claim again in ${Math.ceil(24 - hoursDiff)} hours`,
              nextClaimTime: nextClaimTime.toISOString()
            }),
            { 
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
          );
        }
      }

      // Record the claim
      const claimAmount = '100'; // G$ amount (this would come from GoodDollar protocol)
      
      const { error: insertError } = await supabase
        .from('gooddollar_claims')
        .insert({
          wallet_address: walletAddress,
          amount: parseFloat(claimAmount),
          claimed_at: new Date().toISOString()
        });

      if (insertError) {
        console.error('Error recording claim:', insertError);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Failed to record claim' 
          }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        );
      }

      // TODO: Integrate with actual GoodDollar claiming mechanism
      // This would involve calling GoodDollar smart contracts on Celo
      // For now, we just record the claim in our database

      console.log(`Claim processed for ${walletAddress}: ${claimAmount} G$`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Claim successful!',
          amount: claimAmount
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    return new Response(
      JSON.stringify({ success: false, message: 'Invalid action' }),
      { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error processing claim:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Internal server error' 
      }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});