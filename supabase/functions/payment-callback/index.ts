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
    const callbackData = await req.json();

    console.log('Payment callback received:', callbackData);

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

    const {
      status,
      message,
      token,
      timestamp,
      currency,
      amount,
      fee,
      mode,
      order_id,
      environment
    } = callbackData;

    if (!order_id) {
      console.error('No order_id in callback data');
      return new Response(
        JSON.stringify({ error: 'Missing order_id' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Find transaction by order_id
    const { data: transaction, error: findError } = await supabaseClient
      .from('transactions')
      .select('*')
      .eq('order_id', order_id)
      .single();

    if (findError || !transaction) {
      console.error('Transaction not found for order_id:', order_id);
      return new Response(
        JSON.stringify({ error: 'Transaction not found' }),
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Update transaction with callback data
    const updatedStatus = status === 'Success' ? 'completed' : 'failed';
    
    const { error: updateError } = await supabaseClient
      .from('transactions')
      .update({
        status: updatedStatus,
        paybox_response: {
          ...transaction.paybox_response,
          callback: callbackData
        },
        updated_at: new Date().toISOString()
      })
      .eq('id', transaction.id);

    if (updateError) {
      console.error('Error updating transaction:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update transaction' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    console.log('Transaction updated successfully:', {
      transactionId: transaction.id,
      status: updatedStatus,
      orderId: order_id
    });

    // Log the callback for audit purposes
    await supabaseClient
      .from('security_audit_log')
      .insert({
        operation_type: 'payment_callback',
        wallet_address: transaction.wallet_address,
        success: status === 'Success',
        additional_data: {
          order_id,
          transaction_id: transaction.id,
          callback_data: callbackData
        }
      });

    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Callback processed successfully',
        transaction_id: transaction.id,
        status: updatedStatus
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in payment-callback function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});