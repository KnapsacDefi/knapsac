
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transactionId, transactionHash, amount, currency, phoneNumber, mobileNetwork, walletAddress } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const payboxApiKey = Deno.env.get('PAYBOX_TRANSFER_API_KEY');
    if (!payboxApiKey) {
      console.error('PAYBOX_TRANSFER_API_KEY not found');
      return new Response(
        JSON.stringify({ error: 'API configuration error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Processing mobile money transfer:', {
      transactionId,
      transactionHash,
      amount,
      currency,
      phoneNumber,
      mobileNetwork
    });

    // Use transaction hash as PayBox order ID directly
    const orderId = transactionHash;

    try {
      // Call PayBox transfer API
      const formData = new FormData();
      formData.append('currency', currency);
      formData.append('amount', amount.toString());
      formData.append('mode', 'Test'); // Use 'Live' for production
      formData.append('mobile_network', mobileNetwork);
      formData.append('mobile_number', phoneNumber);
      formData.append('order_id', orderId);
      formData.append('customer_id', walletAddress);
      formData.append('description', `Withdrawal of ${amount} ${currency}`);
      formData.append('callback_url', `${Deno.env.get('SUPABASE_URL')}/functions/v1/payment-callback`);

      const response = await fetch('https://paybox.com.co/transfer', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${payboxApiKey}`
        },
        body: formData
      });

      const result = await response.json();
      console.log('PayBox transfer response:', result);

      // Update transaction with PayBox response and set order_id to transaction hash
      const { error: updateError } = await supabaseClient
        .from('transactions')
        .update({
          order_id: orderId, // This is now the transaction hash
          paybox_response: result,
          status: result.status === 'Success' ? 'completed' : 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', transactionId);

      if (updateError) {
        console.error('Error updating transaction:', updateError);
      }

      return new Response(
        JSON.stringify({
          success: result.status === 'Success',
          orderId,
          payboxResponse: result
        }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } catch (payboxError) {
      console.error('PayBox API error:', payboxError);
      
      // Update transaction status to failed
      await supabaseClient
        .from('transactions')
        .update({
          status: 'failed',
          paybox_response: { error: payboxError.message },
          updated_at: new Date().toISOString()
        })
        .eq('id', transactionId);

      return new Response(
        JSON.stringify({ error: 'Transfer failed' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

  } catch (error) {
    console.error('Error in process-mobile-money-transfer function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
