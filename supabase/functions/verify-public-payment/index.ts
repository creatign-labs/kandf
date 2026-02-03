import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.190.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { scheduleId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();

    if (!scheduleId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new Error('Missing payment verification parameters');
    }

    // Verify signature using Web Crypto API
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const encoder = new TextEncoder();
    const keyData = encoder.encode(razorpayKeySecret);
    const msgData = encoder.encode(body);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, msgData);
    const expectedSignature = Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (expectedSignature !== razorpay_signature) {
      console.error('Signature verification failed');
      throw new Error('Payment verification failed');
    }

    // Fetch the payment schedule to get enrollment_id
    const { data: schedule, error: scheduleError } = await supabase
      .from('payment_schedules')
      .select('id, enrollment_id, status')
      .eq('id', scheduleId)
      .single();

    if (scheduleError || !schedule) {
      throw new Error('Payment schedule not found');
    }

    if (schedule.status === 'paid') {
      // Already paid, just return success
      return new Response(
        JSON.stringify({ success: true, message: 'Already paid' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update payment schedule status
    const { error: updateError } = await supabase
      .from('payment_schedules')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        payment_id: razorpay_payment_id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', scheduleId);

    if (updateError) {
      console.error('Failed to update payment schedule:', updateError);
      throw new Error('Failed to update payment status');
    }

    // Check if all payments for this enrollment are complete
    const { data: pendingPayments } = await supabase
      .from('payment_schedules')
      .select('id')
      .eq('enrollment_id', schedule.enrollment_id)
      .in('status', ['pending', 'overdue']);

    // If no pending payments remain, update enrollment payment_completed flag
    if (!pendingPayments || pendingPayments.length === 0) {
      await supabase
        .from('enrollments')
        .update({ payment_completed: true })
        .eq('id', schedule.enrollment_id);
    }

    console.log('Public payment verified for schedule:', scheduleId);

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error verifying public payment:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
