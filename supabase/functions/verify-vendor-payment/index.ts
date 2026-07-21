import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const razorpayKeySecret = Deno.env.get("RAZORPAY_KEY_SECRET")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabaseUser = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authErr } = await supabaseUser.auth.getUser();
    if (authErr || !user) throw new Error("Not authenticated");

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await req.json();
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new Error("Missing payment verification parameters");
    }

    // Verify HMAC
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const encoder = new TextEncoder();
    const cryptoKey = await crypto.subtle.importKey(
      "raw", encoder.encode(razorpayKeySecret),
      { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
    );
    const sig = await crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(body));
    const expected = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0")).join("");

    if (expected !== razorpay_signature) throw new Error("Payment signature verification failed");

    const admin = createClient(supabaseUrl, serviceKey);

    const { data: paymentRow, error: payErr } = await admin
      .from("vendor_payments")
      .update({
        razorpay_payment_id, razorpay_signature,
        status: "paid", paid_at: new Date().toISOString(),
      })
      .eq("razorpay_order_id", razorpay_order_id)
      .eq("user_id", user.id)
      .select("id, vendor_profile_id")
      .maybeSingle();

    if (payErr || !paymentRow) {
      console.error("Failed to update vendor payment:", payErr);
      throw new Error("Payment record not found");
    }

    // Move vendor from pending_payment -> pending (awaiting admin approval)
    if (paymentRow.vendor_profile_id) {
      await admin.from("vendor_profiles")
        .update({ approval_status: "pending", updated_at: new Date().toISOString() })
        .eq("id", paymentRow.vendor_profile_id);
    }
    await admin.from("vendor_access_approvals")
      .update({ status: "pending", updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("verify-vendor-payment error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
