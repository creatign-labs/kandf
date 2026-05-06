// Marks confirmed bookings whose start time has passed (with a small grace
// period) as 'no_show'. Does NOT create any rebooking — the slot is simply
// consumed and counted toward the student's no-show total. Idempotent: only
// processes bookings still in 'confirmed' status.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Parse "9:00 AM" / "9:00 AM - 4:00 PM" / "9.00 to 11" — return start as IST Date.
function parseSlotStart(bookingDate: string, timeSlot: string): Date | null {
  if (!bookingDate || !timeSlot) return null;
  const m = timeSlot.match(/(\d{1,2})[:.](\d{0,2})?\s*(AM|PM|am|pm)?/) ||
            timeSlot.match(/(\d{1,2})\s*(AM|PM|am|pm)/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const ap = (m[3] || "").toUpperCase();
  if (ap === "PM" && h < 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  const [y, mo, d] = bookingDate.split("-").map(Number);
  // IST -> UTC
  const utcMs = Date.UTC(y, mo - 1, d, h, min) - (5.5 * 3600 * 1000);
  return new Date(utcMs);
}

const GRACE_MINUTES = 30;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const now = new Date();
    const fromDate = new Date(now.getTime() - 48 * 3600 * 1000).toISOString().slice(0, 10);
    const toDate = now.toISOString().slice(0, 10);

    const { data: bookings, error } = await admin
      .from("bookings")
      .select("id, student_id, booking_date, time_slot, status")
      .gte("booking_date", fromDate)
      .lte("booking_date", toDate)
      .eq("status", "confirmed");

    if (error) throw error;

    let consumed = 0;
    const lockedStudents = new Set<string>();

    for (const b of bookings || []) {
      const start = parseSlotStart(b.booking_date, b.time_slot);
      if (!start) continue;
      const cutoff = new Date(start.getTime() + GRACE_MINUTES * 60_000);
      if (now < cutoff) continue;

      // Mark booking as no_show — do NOT create a rebooking
      const { error: upErr } = await admin
        .from("bookings")
        .update({ status: "no_show" })
        .eq("id", b.id)
        .eq("status", "confirmed"); // guard against race
      if (upErr) continue;

      // Append attendance record (no_show)
      await admin.from("attendance").insert({
        student_id: b.student_id,
        batch_id: b.id,
        class_date: b.booking_date,
        status: "no_show",
      });

      consumed++;

      // Lock account at >=3 no-shows; warn at 2
      const { count } = await admin
        .from("attendance")
        .select("*", { count: "exact", head: true })
        .eq("student_id", b.student_id)
        .eq("status", "no_show");

      const noShowTotal = count || 0;

      if (noShowTotal >= 3 && !lockedStudents.has(b.student_id)) {
        await admin
          .from("profiles")
          .update({ enrollment_status: "locked_no_show" })
          .eq("id", b.student_id)
          .eq("enrollment_status", "active");
        await admin.from("notifications").insert({
          user_id: b.student_id,
          title: "Account Locked",
          message: "Your account has been locked due to 3+ no-shows. Contact admin.",
          type: "warning",
        });
        lockedStudents.add(b.student_id);
      } else if (noShowTotal === 2) {
        await admin.from("notifications").insert({
          user_id: b.student_id,
          title: "No-Show Warning",
          message: "You have 2 no-shows. One more will lock your booking access.",
          type: "warning",
        });
      } else {
        await admin.from("notifications").insert({
          user_id: b.student_id,
          title: "Slot Marked No-Show",
          message: `Your booking on ${b.booking_date} (${b.time_slot}) was marked as no-show. The slot has been consumed.`,
          type: "alert",
        });
      }
    }

    return new Response(
      JSON.stringify({ ok: true, processed: bookings?.length || 0, consumed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
