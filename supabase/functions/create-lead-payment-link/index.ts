import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID');
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!razorpayKeyId || !razorpayKeySecret) {
      throw new Error('Razorpay credentials not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { installmentId } = await req.json();

    if (!installmentId) {
      return new Response(
        JSON.stringify({ error: 'Missing installmentId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch installment with lead info
    const { data: installment, error: instError } = await supabase
      .from('lead_installments')
      .select('*, leads(name, email, phone)')
      .eq('id', installmentId)
      .single();

    if (instError || !installment) {
      return new Response(
        JSON.stringify({ error: 'Installment not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (installment.status === 'paid') {
      return new Response(
        JSON.stringify({ error: 'This installment is already paid' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if payment link already exists
    if (installment.payment_link_id) {
      // Fetch existing link status from Razorpay
      const auth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
      const existingRes = await fetch(`https://api.razorpay.com/v1/payment_links/${installment.payment_link_id}`, {
        headers: { 'Authorization': `Basic ${auth}` },
      });

      if (existingRes.ok) {
        const existingLink = await existingRes.json();
        if (existingLink.status !== 'cancelled' && existingLink.status !== 'expired') {
          return new Response(
            JSON.stringify({ payment_link: existingLink }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
      }
    }

    const lead = installment.leads;
    const auth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);

    // Create Razorpay Payment Link
    const linkResponse = await fetch('https://api.razorpay.com/v1/payment_links', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(installment.amount * 100), // paise
        currency: 'INR',
        description: `${installment.label} - ${lead?.name || 'Lead Payment'}`,
        customer: {
          name: lead?.name || undefined,
          email: lead?.email || undefined,
          contact: lead?.phone || undefined,
        },
        notify: {
          sms: !!lead?.phone,
          email: !!lead?.email,
        },
        reminder_enable: true,
        notes: {
          installment_id: installmentId,
          lead_id: installment.lead_id,
          label: installment.label,
        },
        callback_url: '',
        callback_method: '',
      }),
    });

    if (!linkResponse.ok) {
      const errorData = await linkResponse.text();
      console.error('Razorpay payment link creation failed:', errorData);
      throw new Error('Failed to create Razorpay payment link');
    }

    const paymentLink = await linkResponse.json();
    console.log('Razorpay payment link created:', paymentLink.id);

    // Store payment_link_id on the installment
    await supabase
      .from('lead_installments')
      .update({ payment_link_id: paymentLink.id })
      .eq('id', installmentId);

    return new Response(
      JSON.stringify({ payment_link: paymentLink }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in create-lead-payment-link:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
