import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const VENDOR_FEE = 5000;
const GST_RATE = 0.18;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const razorpayKeyId = Deno.env.get("RAZORPAY_KEY_ID");
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

    if (!razorpayKeyId || !razorpayKeySecret) throw new Error("Razorpay not configured");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceKey);
    const { data: vendorProfile, error: profileErr } = await admin
      .from("vendor_profiles")
      .select("id, approval_status")
      .eq("user_id", user.id)
      .maybeSingle();

    if (profileErr || !vendorProfile) {
      return new Response(JSON.stringify({ error: "Vendor profile not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const amount = VENDOR_FEE;
    const gstAmount = Math.round(amount * GST_RATE * 100) / 100;
    const totalAmount = amount + gstAmount;

    const receipt = `vnd_${user.id.slice(0, 8)}_${Date.now().toString().slice(-8)}`;
    const auth = btoa(`${razorpayKeyId}:${razorpayKeySecret}`);
    const orderRes = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Math.round(totalAmount * 100),
        currency: "INR",
        receipt,
        notes: { type: "vendor_registration", vendor_profile_id: vendorProfile.id, user_id: user.id },
      }),
    });

    if (!orderRes.ok) {
      const errText = await orderRes.text();
      console.error("Razorpay order failed:", errText);
      return new Response(JSON.stringify({ error: "Failed to create order", details: errText }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const order = await orderRes.json();

    await admin.from("vendor_payments").insert({
      user_id: user.id,
      vendor_profile_id: vendorProfile.id,
      amount, gst_amount: gstAmount, total_amount: totalAmount,
      currency: "INR", razorpay_order_id: order.id, status: "created",
    });

    return new Response(JSON.stringify({ order, amount, gstAmount, totalAmount }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("create-vendor-payment-order error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
