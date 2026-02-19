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
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Find active students whose course has expired
    const { data: expiredEnrollments, error: fetchError } = await supabase
      .from('enrollments')
      .select(`
        id,
        student_id,
        course_id,
        enrollment_date,
        courses (duration)
      `)
      .eq('status', 'active');

    if (fetchError) {
      console.error('Error fetching enrollments:', fetchError);
      throw fetchError;
    }

    let lockedCount = 0;
    const today = new Date();

    for (const enrollment of expiredEnrollments || []) {
      const course = enrollment.courses as any;
      if (!course?.duration) continue;

      // Parse duration (e.g. "3 months", "6 months")
      const durationMatch = course.duration.match(/(\d+)/);
      const months = durationMatch ? parseInt(durationMatch[1]) : 3;

      const enrollmentDate = new Date(enrollment.enrollment_date);
      const expiryDate = new Date(enrollmentDate);
      expiryDate.setMonth(expiryDate.getMonth() + months);

      if (today >= expiryDate) {
        // Check if profile is still active
        const { data: profile } = await supabase
          .from('profiles')
          .select('enrollment_status')
          .eq('id', enrollment.student_id)
          .single();

        if (profile?.enrollment_status === 'active') {
          // Lock the student
          const { error: updateError } = await supabase
            .from('profiles')
            .update({
              enrollment_status: 'locked_course_expired',
              updated_at: new Date().toISOString(),
            })
            .eq('id', enrollment.student_id);

          if (!updateError) {
            lockedCount++;

            // Notify the student
            await supabase.from('notifications').insert({
              user_id: enrollment.student_id,
              title: 'Course Expired',
              message: 'Your course period has ended. Contact admin to extend or unlock your account.',
              type: 'warning',
            });

            console.log(`Locked student ${enrollment.student_id} - course expired`);
          }
        }
      }
    }

    console.log(`Course expiry check complete. Locked ${lockedCount} students.`);

    return new Response(
      JSON.stringify({ success: true, lockedCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Course expiry check error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
