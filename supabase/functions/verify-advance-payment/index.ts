import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const paymentSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
  courseId: z.string().uuid(),
  amount: z.number().positive(),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!razorpayKeySecret) {
      throw new Error('Razorpay secret not configured');
    }

    // Validate input
    const body = await req.json();
    const validationResult = paymentSchema.safeParse(body);
    
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({ error: 'Invalid input', details: validationResult.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, courseId, amount } = validationResult.data;

    console.log('Verifying advance payment for user:', user.id);

    // Verify signature
    const generatedSignature = createHmac('sha256', razorpayKeySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    if (generatedSignature !== razorpay_signature) {
      console.error('Signature verification failed');
      return new Response(
        JSON.stringify({ error: 'Invalid payment signature' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Signature verified, creating advance payment record');

    // Create advance payment record
    const { data: advancePayment, error: paymentError } = await supabase
      .from('advance_payments')
      .insert({
        student_id: user.id,
        course_id: courseId,
        amount: amount,
        razorpay_payment_id: razorpay_payment_id,
        status: 'completed',
        paid_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Failed to create advance payment record:', paymentError);
      throw new Error('Failed to record payment');
    }

    console.log('Advance payment recorded:', advancePayment.id);

    // Update profile enrollment_status to enrolled using mark_advance_paid function
    // Note: The function name remains the same but now updates enrollment_status
    const { error: markError } = await supabase.rpc('mark_advance_paid', {
      p_student_id: user.id,
      p_payment_id: razorpay_payment_id
    });

    if (markError) {
      console.error('Failed to update enrollment_status:', markError);
    } else {
      console.log('Enrollment status updated to enrolled');
    }

    // Create student access approval record (pending)
    const { data: approval, error: approvalError } = await supabase
      .from('student_access_approvals')
      .insert({
        student_id: user.id,
        advance_payment_id: advancePayment.id,
        status: 'pending',
      })
      .select()
      .single();

    if (approvalError) {
      console.error('Failed to create approval record:', approvalError);
      // Don't throw - payment was successful, just log the error
    } else {
      console.log('Access approval record created:', approval.id);
    }

    // Notify super admins about new advance payment
    const { data: superAdmins } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'super_admin');

    if (superAdmins && superAdmins.length > 0) {
      // Get student info
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('id', user.id)
        .single();

      // Get course info
      const { data: course } = await supabase
        .from('courses')
        .select('title')
        .eq('id', courseId)
        .single();

      const studentName = profile ? `${profile.first_name} ${profile.last_name}` : user.email;
      const courseName = course?.title || 'Unknown Course';

      // Create notifications for super admins
      const notifications = superAdmins.map(admin => ({
        user_id: admin.user_id,
        title: 'New Advance Payment',
        message: `${studentName} has made an advance payment of ₹${amount} for ${courseName}. Pending approval.`,
        type: 'info',
      }));

      const { error: notifError } = await supabase
        .from('notifications')
        .insert(notifications);

      if (notifError) {
        console.error('Failed to create notifications:', notifError);
      } else {
        console.log('Notifications sent to', superAdmins.length, 'super admins');
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        advancePayment,
        message: 'Payment verified and recorded successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in verify-advance-payment:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
