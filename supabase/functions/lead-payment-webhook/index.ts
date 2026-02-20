import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const razorpaySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!razorpaySecret) {
      throw new Error('Razorpay secret not configured');
    }

    const body = await req.text();
    const signature = req.headers.get('x-razorpay-signature');

    // Verify webhook signature
    if (!signature) {
      console.error('Missing x-razorpay-signature header');
      return new Response(JSON.stringify({ error: 'Missing signature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify webhook signature using Web Crypto API
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(razorpaySecret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(body));
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    if (expectedSignature !== signature) {
      console.error('Invalid webhook signature');
      return new Response(JSON.stringify({ error: 'Invalid signature' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.parse(body);
    const event = payload.event;
    console.log('Received Razorpay webhook event:', event);

    // We only care about payment_link.paid
    if (event !== 'payment_link.paid') {
      console.log('Ignoring event:', event);
      return new Response(JSON.stringify({ status: 'ignored' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const paymentLink = payload.payload?.payment_link?.entity;
    if (!paymentLink) {
      console.error('No payment_link entity in payload');
      return new Response(JSON.stringify({ error: 'Invalid payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const notes = paymentLink.notes || {};
    const installmentId = notes.installment_id;
    const leadId = notes.lead_id;
    const razorpayPaymentId = payload.payload?.payment?.entity?.id || paymentLink.id;

    if (!installmentId) {
      console.log('No installment_id in notes, not a lead payment link');
      return new Response(JSON.stringify({ status: 'ignored' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Processing lead payment: installment=${installmentId}, lead=${leadId}`);

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Mark installment as paid
    const { data: installment, error: instError } = await supabase
      .from('lead_installments')
      .update({
        status: 'paid',
        paid_at: new Date().toISOString(),
        razorpay_payment_id: razorpayPaymentId,
      })
      .eq('id', installmentId)
      .neq('status', 'paid') // idempotency
      .select('*, leads(id, name, email, phone, course_id, stage)')
      .maybeSingle();

    if (instError) {
      console.error('Failed to update installment:', instError);
      throw instError;
    }

    if (!installment) {
      console.log('Installment already paid or not found (idempotent)');
      return new Response(JSON.stringify({ status: 'already_processed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Installment ${installmentId} marked as paid`);

    // 2. If enrollment fee (installment #1), convert lead and create student
    if (installment.installment_number === 1 && leadId) {
      console.log('Enrollment fee paid — converting lead and creating student account');

      const lead = installment.leads;
      if (!lead) {
        console.error('Lead not found for installment');
        return new Response(JSON.stringify({ status: 'paid', warning: 'lead_not_found' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Update lead stage to converted
      await supabase.from('leads').update({ stage: 'converted' }).eq('id', leadId);
      console.log(`Lead ${leadId} stage set to converted`);

      // 3. Create student auth account
      const nameParts = (lead.name || '').trim().split(/\s+/);
      const firstName = nameParts[0] || 'Student';
      const lastName = nameParts.slice(1).join(' ') || '';

      // Generate password
      const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%";
      let password = "";
      for (let i = 0; i < 12; i++) {
        password += chars.charAt(Math.floor(Math.random() * chars.length));
      }

      // Check if user already exists with this email
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existingUser = existingUsers?.users?.find(u => u.email === lead.email);

      let studentId: string;

      if (existingUser) {
        console.log('User already exists with email:', lead.email);
        studentId = existingUser.id;
      } else {
        // Create auth user (auto-confirmed)
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email: lead.email,
          password: password,
          email_confirm: true,
          user_metadata: {
            first_name: firstName,
            last_name: lastName,
            phone: lead.phone || '',
          },
        });

        if (createError) {
          console.error('Failed to create student auth user:', createError);
          // Still return success for the payment part
          return new Response(JSON.stringify({
            status: 'paid',
            warning: 'student_creation_failed',
            error: createError.message,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        studentId = newUser.user.id;
        console.log(`Created student auth user: ${studentId}`);
      }

      // 4. Update profile to enrolled status (awaiting Super Admin activation)
      await supabase
        .from('profiles')
        .update({
          enrollment_status: 'enrolled',
          first_name: firstName,
          last_name: lastName,
          phone: lead.phone || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', studentId);

      console.log(`Profile updated for student ${studentId}, status = enrolled`);

      // 5. Create notification for admins
      const { data: adminUsers } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['admin', 'super_admin']);

      if (adminUsers && adminUsers.length > 0) {
        const notifications = adminUsers.map(admin => ({
          user_id: admin.user_id,
          title: 'New Lead Payment Received',
          message: `${lead.name} has paid the enrollment fee (₹${(paymentLink.amount / 100).toLocaleString()}). Student account created and awaiting activation.`,
          type: 'info',
        }));
        await supabase.from('notifications').insert(notifications);
        console.log(`Notified ${adminUsers.length} admins`);
      }

      // 6. Store student_id on the lead for future reference
      await supabase.from('leads').update({
        stage: 'converted',
      }).eq('id', leadId);

      return new Response(JSON.stringify({
        status: 'paid',
        lead_converted: true,
        student_created: true,
        student_id: studentId,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Non-enrollment installments — just mark paid
    return new Response(JSON.stringify({ status: 'paid' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in lead-payment-webhook:', errorMessage);
    // Return 200 to prevent Razorpay from retrying on our logic errors
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
