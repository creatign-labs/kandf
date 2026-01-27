import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID')!;
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('Not authenticated');
    }

    const RESUME_ADDON_PRICE = 399; // ₹399

    // Check if already purchased
    const { data: existingPurchase } = await supabase
      .from('addon_purchases')
      .select('*')
      .eq('student_id', user.id)
      .eq('addon_type', 'resume_builder')
      .eq('status', 'paid')
      .maybeSingle();

    if (existingPurchase) {
      throw new Error('Resume builder already purchased');
    }

    // Create Razorpay order
    // Note: receipt must be <= 40 characters
    const shortUserId = user.id.substring(0, 8);
    const receipt = `res_${shortUserId}_${Date.now().toString().slice(-8)}`;
    
    const orderResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(`${razorpayKeyId}:${razorpayKeySecret}`),
      },
      body: JSON.stringify({
        amount: RESUME_ADDON_PRICE * 100, // Razorpay expects amount in paise
        currency: 'INR',
        receipt: receipt,
        notes: {
          student_id: user.id,
          addon_type: 'resume_builder',
        },
      }),
    });

    if (!orderResponse.ok) {
      const errorText = await orderResponse.text();
      console.error('Razorpay order creation failed:', errorText);
      throw new Error('Failed to create payment order');
    }

    const order = await orderResponse.json();

    // Create pending addon purchase record
    // First check if there's an existing pending record
    const { data: existingPending } = await supabase
      .from('addon_purchases')
      .select('id')
      .eq('student_id', user.id)
      .eq('addon_type', 'resume_builder')
      .eq('status', 'pending')
      .maybeSingle();

    if (existingPending) {
      // Update existing pending record
      await supabase
        .from('addon_purchases')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', existingPending.id);
    } else {
      // Insert new pending record
      await supabase
        .from('addon_purchases')
        .insert({
          student_id: user.id,
          addon_type: 'resume_builder',
          amount: RESUME_ADDON_PRICE,
          status: 'pending',
        });
    }

    console.log('Created Razorpay order for resume addon:', order.id);

    return new Response(
      JSON.stringify({
        orderId: order.id,
        amount: RESUME_ADDON_PRICE,
        currency: 'INR',
        keyId: razorpayKeyId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating resume addon order:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});