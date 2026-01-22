import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Get today's date
    const today = new Date().toISOString().split('T')[0];

    console.log(`Processing attendance auto-closure for date: ${today}`);

    // Get all confirmed bookings for today
    const { data: bookings, error: bookingsError } = await supabaseAdmin
      .from('bookings')
      .select(`
        id,
        student_id,
        course_id,
        time_slot
      `)
      .eq('booking_date', today)
      .eq('status', 'confirmed');

    if (bookingsError) {
      console.error('Error fetching bookings:', bookingsError);
      throw bookingsError;
    }

    if (!bookings || bookings.length === 0) {
      console.log('No confirmed bookings for today');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'No confirmed bookings for today',
        markedAbsent: 0,
        alreadyMarked: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Found ${bookings.length} confirmed bookings for today`);

    // Get existing attendance records for today
    const { data: existingAttendance, error: attendanceError } = await supabaseAdmin
      .from('attendance')
      .select('student_id, batch_id')
      .eq('class_date', today);

    if (attendanceError) {
      console.error('Error fetching existing attendance:', attendanceError);
      throw attendanceError;
    }

    // Create a set of students who already have attendance marked
    const markedStudents = new Set(
      (existingAttendance || []).map(a => `${a.student_id}-${a.batch_id}`)
    );

    // Get batch info for students - we need to find their enrolled batches
    const studentIds = [...new Set(bookings.map(b => b.student_id))];
    
    const { data: enrollments, error: enrollmentsError } = await supabaseAdmin
      .from('enrollments')
      .select('student_id, batch_id')
      .in('student_id', studentIds)
      .eq('status', 'active');

    if (enrollmentsError) {
      console.error('Error fetching enrollments:', enrollmentsError);
      throw enrollmentsError;
    }

    // Map student to their batch
    const studentBatchMap: Record<string, string> = {};
    for (const enrollment of enrollments || []) {
      studentBatchMap[enrollment.student_id] = enrollment.batch_id;
    }

    // Find students who haven't been marked
    const unmarkedStudents: { studentId: string; batchId: string }[] = [];
    
    for (const booking of bookings) {
      const batchId = studentBatchMap[booking.student_id];
      if (!batchId) continue;
      
      const key = `${booking.student_id}-${batchId}`;
      if (!markedStudents.has(key)) {
        unmarkedStudents.push({
          studentId: booking.student_id,
          batchId
        });
      }
    }

    if (unmarkedStudents.length === 0) {
      console.log('All students already have attendance marked');
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'All students already have attendance marked',
        markedAbsent: 0,
        alreadyMarked: bookings.length
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Marking ${unmarkedStudents.length} students as absent`);

    // Create attendance records for unmarked students as 'absent'
    const attendanceRecords = unmarkedStudents.map(s => ({
      student_id: s.studentId,
      batch_id: s.batchId,
      class_date: today,
      status: 'absent',
      marked_by: null // System auto-marked
    }));

    const { error: insertError } = await supabaseAdmin
      .from('attendance')
      .insert(attendanceRecords);

    if (insertError) {
      console.error('Error inserting attendance records:', insertError);
      throw insertError;
    }

    // Update booking status to 'completed' for all today's bookings
    const { error: updateBookingsError } = await supabaseAdmin
      .from('bookings')
      .update({ status: 'completed' })
      .eq('booking_date', today)
      .eq('status', 'confirmed');

    if (updateBookingsError) {
      console.error('Error updating booking status:', updateBookingsError);
      // Don't throw, this is not critical
    }

    // Send notifications to absent students
    const notifications = unmarkedStudents.map(s => ({
      user_id: s.studentId,
      title: '⚠️ Attendance Marked - Absent',
      message: `You were automatically marked as absent for your class on ${today}. If you believe this is an error, please contact the administration. Note: 3 absences may result in account restrictions.`,
      type: 'attendance_alert',
      read: false
    }));

    if (notifications.length > 0) {
      const { error: notifyError } = await supabaseAdmin
        .from('notifications')
        .insert(notifications);

      if (notifyError) {
        console.error('Error sending notifications:', notifyError);
        // Don't throw, notifications are not critical
      }
    }

    console.log(`Successfully marked ${unmarkedStudents.length} students as absent`);

    return new Response(JSON.stringify({ 
      success: true, 
      date: today,
      totalBookings: bookings.length,
      markedAbsent: unmarkedStudents.length,
      alreadyMarked: bookings.length - unmarkedStudents.length,
      notificationsSent: notifications.length
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("attendance-auto-closure error:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
