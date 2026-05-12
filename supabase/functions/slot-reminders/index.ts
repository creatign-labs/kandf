import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Parse a "HH:MM AM/PM" or "HH:MM - HH:MM" time slot to a Date for the booking_date (IST).
// We treat the *start* time. If parsing fails, returns null.
function parseSlotStart(bookingDate: string, timeSlot: string): Date | null {
  if (!bookingDate || !timeSlot) return null;
  const m = timeSlot.match(/(\d{1,2}):?(\d{0,2})\s*(AM|PM|am|pm)?/);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = m[2] ? parseInt(m[2], 10) : 0;
  const ap = (m[3] || "").toUpperCase();
  if (ap === "PM" && h < 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  // Booking date is stored as IST date. Construct as IST -> UTC.
  // IST offset = +5:30
  const [y, mo, d] = bookingDate.split("-").map(Number);
  const utcMs = Date.UTC(y, mo - 1, d, h, min) - (5.5 * 3600 * 1000);
  return new Date(utcMs);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const now = new Date();
    // Look ahead window: today and tomorrow IST
    const lookAhead = new Date(now.getTime() + 36 * 3600 * 1000);
    const isoFrom = now.toISOString().slice(0, 10);
    const isoTo = lookAhead.toISOString().slice(0, 10);

    const { data: bookings, error } = await admin
      .from("bookings")
      .select("id, student_id, booking_date, time_slot, recipe_id, recipe_ids, table_number, table_numbers, status, profiles!bookings_student_id_fkey(first_name, last_name, email)")
      .in("status", ["confirmed"])
      .gte("booking_date", isoFrom)
      .lte("booking_date", isoTo);

    if (error) throw error;

    // Fetch recipients separately if FK alias not present
    const sent: any[] = [];

    for (const b of bookings || []) {
      const start = parseSlotStart(b.booking_date as string, b.time_slot as string);
      if (!start) continue;
      const minsUntil = (start.getTime() - now.getTime()) / 60000;

      // Get student profile
      let email: string | null = null;
      let name: string = "there";
      const prof: any = (b as any).profiles;
      if (prof) {
        email = prof.email;
        name = [prof.first_name, prof.last_name].filter(Boolean).join(" ") || "there";
      } else {
        const { data: p } = await admin.from("profiles").select("email, first_name, last_name").eq("id", b.student_id).single();
        if (p) { email = p.email; name = [p.first_name, p.last_name].filter(Boolean).join(" ") || "there"; }
      }
      if (!email) continue;

      const recipe_title = (b as any).recipes?.title;

      type Rem = { type: "24h" | "cutoff" | "2h"; template: "slot_reminder_24h" | "slot_cancellation_cutoff" | "slot_reminder_2h"; window: [number, number] };
      // Cron runs every 15 min. Each window is generous enough to catch one tick but narrow enough not to overlap.
      const reminders: Rem[] = [
        { type: "24h", template: "slot_reminder_24h", window: [23 * 60, 25 * 60] },          // ~24h before
        { type: "cutoff", template: "slot_cancellation_cutoff", window: [-9999, -9999] },    // handled by clock-time match below
        { type: "2h", template: "slot_reminder_2h", window: [105, 135] },                    // ~2h before (90-150)
      ];

      // Cutoff: send when current IST clock is between 22:30 and 23:45 the night BEFORE booking_date.
      // i.e. start day = booking_date, now hours (IST) = 22-23, and minsUntil between 0 and 26h.
      const istNow = new Date(now.getTime() + 5.5 * 3600 * 1000);
      const istHours = istNow.getUTCHours();
      const isCutoffWindow = istHours === 22 || istHours === 23;
      const isNightBefore = (() => {
        // booking_date is tomorrow in IST?
        const istTomorrow = new Date(istNow.getTime() + 24 * 3600 * 1000).toISOString().slice(0,10);
        return b.booking_date === istTomorrow;
      })();

      for (const r of reminders) {
        let inWindow = false;
        if (r.type === "cutoff") {
          inWindow = isCutoffWindow && isNightBefore;
        } else {
          inWindow = minsUntil >= r.window[0] && minsUntil <= r.window[1];
        }
        if (!inWindow) continue;

        // Dedup
        const { data: existing } = await admin
          .from("booking_reminders_sent")
          .select("id")
          .eq("booking_id", b.id)
          .eq("reminder_type", r.type)
          .maybeSingle();
        if (existing) continue;

        // Mark sent FIRST (idempotency on race)
        const { error: insErr } = await admin.from("booking_reminders_sent").insert({
          booking_id: b.id, reminder_type: r.type,
        });
        if (insErr) continue;

        // Trigger send
        await fetch(`${supabaseUrl}/functions/v1/send-branded-email`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${serviceRoleKey}` },
          body: JSON.stringify({
            template: r.template,
            to: email,
            data: {
              name, booking_date: b.booking_date, time_slot: b.time_slot,
              recipe_title, table_number: b.table_number,
            },
          }),
        }).catch((e) => console.error("send fail", e));

        sent.push({ booking_id: b.id, type: r.type, to: email });
      }
    }

    return new Response(JSON.stringify({ success: true, sent_count: sent.length, sent }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    console.error("slot-reminders error:", msg);
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
