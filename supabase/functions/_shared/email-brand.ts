// Shared branded email template builder for Knead & Frost
// All templates use a consistent layered design: header with logo wordmark,
// amber accent dividers, content card, and footer with contact + social.

const BRAND = {
  name: "Knead & Frost",
  tagline: "Global Baking Academy",
  primary: "#d4a574", // honey/amber
  primaryDark: "#a87a45",
  cream: "#fdf8f1",
  ink: "#2b2118",
  muted: "#7a6a55",
  border: "#ecdfc9",
  site: "https://kneadandfrost.in",
  supportEmail: "support@kneadandfrost.in",
  address: "Knead & Frost Academy, India",
};

function shell(opts: { preheader?: string; title: string; bodyHtml: string; ctaUrl?: string; ctaLabel?: string }): string {
  const { preheader = "", title, bodyHtml, ctaUrl, ctaLabel } = opts;
  const cta = ctaUrl && ctaLabel
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0">
         <tr><td style="border-radius:8px;background:${BRAND.primary}">
           <a href="${ctaUrl}" style="display:inline-block;padding:14px 28px;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px">${ctaLabel}</a>
         </td></tr>
       </table>` : "";
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;padding:0;background:${BRAND.cream};font-family:Helvetica,Arial,sans-serif;color:${BRAND.ink}">
<span style="display:none!important;opacity:0;color:transparent;height:0;width:0;overflow:hidden">${preheader}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.cream};padding:32px 16px">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid ${BRAND.border};border-radius:14px;overflow:hidden;box-shadow:0 4px 14px rgba(168,122,69,0.08)">
      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,${BRAND.primary} 0%,${BRAND.primaryDark} 100%);padding:32px 32px 28px;text-align:center;color:#ffffff">
        <div style="font-family:Georgia,'Times New Roman',serif;font-size:30px;letter-spacing:1px;font-weight:700">🧁 ${BRAND.name}</div>
        <div style="margin-top:6px;font-size:13px;letter-spacing:3px;text-transform:uppercase;opacity:.92">${BRAND.tagline}</div>
      </td></tr>
      <!-- Accent bar -->
      <tr><td style="height:4px;background:repeating-linear-gradient(90deg,${BRAND.primary} 0 18px,${BRAND.cream} 18px 24px)"></td></tr>
      <!-- Body -->
      <tr><td style="padding:36px 36px 28px">
        <h1 style="margin:0 0 18px;font-family:Georgia,serif;font-size:24px;color:${BRAND.ink};font-weight:600">${title}</h1>
        <div style="font-size:15px;line-height:1.65;color:${BRAND.ink}">${bodyHtml}</div>
        ${cta}
      </td></tr>
      <!-- Divider -->
      <tr><td style="padding:0 36px"><div style="border-top:1px solid ${BRAND.border}"></div></td></tr>
      <!-- Footer -->
      <tr><td style="padding:24px 36px 32px;text-align:center;font-size:12px;color:${BRAND.muted};line-height:1.6">
        <div style="font-weight:600;color:${BRAND.primaryDark};margin-bottom:6px">${BRAND.name} · ${BRAND.tagline}</div>
        <div>Need help? <a href="mailto:${BRAND.supportEmail}" style="color:${BRAND.primaryDark};text-decoration:none">${BRAND.supportEmail}</a> · <a href="${BRAND.site}" style="color:${BRAND.primaryDark};text-decoration:none">${BRAND.site}</a></div>
        <div style="margin-top:10px;color:${BRAND.muted}">${BRAND.address}</div>
        <div style="margin-top:14px;color:#b8a88e;font-size:11px">This is an automated message — please do not reply directly.</div>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

export type TemplateName =
  | "enquiry_ack"
  | "enrollment_confirmation"
  | "payment_success"
  | "certificate_release"
  | "slot_reminder_24h"
  | "slot_reminder_2h"
  | "slot_cancellation_cutoff"
  | "slot_booking_confirmation";

export interface RenderResult { subject: string; html: string; }

export function renderTemplate(template: TemplateName, data: Record<string, any>): RenderResult {
  const name = data.name || "there";
  switch (template) {
    case "enquiry_ack":
      return {
        subject: "Thank you for your enquiry – Knead & Frost",
        html: shell({
          preheader: "We've received your enquiry and will be in touch soon.",
          title: `Hi ${name}, thanks for reaching out!`,
          bodyHtml: `
            <p>Thank you for showing interest in <strong>Knead & Frost Academy</strong>.</p>
            <p>Our team will contact you shortly to guide you through our courses, schedules and the perfect program for your baking journey.</p>`,
        }),
      };
    case "enrollment_confirmation":
      return {
        subject: `Welcome to ${data.course_title || "your course"} – Knead & Frost`,
        html: shell({
          preheader: "Your enrollment is confirmed.",
          title: `You're enrolled, ${name}! 🎉`,
          bodyHtml: `
            <p>Welcome aboard! Your enrollment is officially confirmed.</p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:${BRAND.cream};border:1px solid ${BRAND.border};border-radius:10px;margin:18px 0">
              <tr><td style="padding:18px 22px">
                <div style="font-size:13px;color:${BRAND.muted};text-transform:uppercase;letter-spacing:1px">Course</div>
                <div style="font-size:17px;font-weight:600;color:${BRAND.ink};margin-top:4px">${data.course_title || "Course"}</div>
                ${data.student_code ? `<div style="margin-top:14px;font-size:13px;color:${BRAND.muted};text-transform:uppercase;letter-spacing:1px">Student ID</div><div style="font-size:15px;font-weight:600;color:${BRAND.ink};margin-top:4px">${data.student_code}</div>` : ""}
                ${data.start_date ? `<div style="margin-top:14px;font-size:13px;color:${BRAND.muted};text-transform:uppercase;letter-spacing:1px">Start</div><div style="font-size:15px;color:${BRAND.ink};margin-top:4px">${data.start_date}</div>` : ""}
              </td></tr>
            </table>
            <p>Log in to your student portal to view your schedule, book slots and track progress.</p>`,
          ctaUrl: `${BRAND.site}/login`,
          ctaLabel: "Open Student Portal",
        }),
      };
    case "payment_success":
      return {
        subject: `Payment received – ₹${data.amount || ""} – Knead & Frost`,
        html: shell({
          preheader: "We've received your payment. Thank you!",
          title: `Payment confirmed, ${name}`,
          bodyHtml: `
            <p>We've received your payment. Here's your receipt:</p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:${BRAND.cream};border:1px solid ${BRAND.border};border-radius:10px;margin:18px 0">
              <tr><td style="padding:18px 22px">
                <table width="100%" cellpadding="6" cellspacing="0" style="font-size:14px;color:${BRAND.ink}">
                  <tr><td style="color:${BRAND.muted}">Amount</td><td align="right" style="font-weight:700">₹${data.amount ?? "—"}</td></tr>
                  ${data.invoice_number ? `<tr><td style="color:${BRAND.muted}">Invoice</td><td align="right">${data.invoice_number}</td></tr>` : ""}
                  ${data.payment_id ? `<tr><td style="color:${BRAND.muted}">Payment ID</td><td align="right" style="font-family:monospace;font-size:12px">${data.payment_id}</td></tr>` : ""}
                  ${data.payment_stage ? `<tr><td style="color:${BRAND.muted}">Stage</td><td align="right" style="text-transform:capitalize">${String(data.payment_stage).replace(/_/g," ")}</td></tr>` : ""}
                  ${data.course_title ? `<tr><td style="color:${BRAND.muted}">Course</td><td align="right">${data.course_title}</td></tr>` : ""}
                  <tr><td style="color:${BRAND.muted}">Date</td><td align="right">${data.date || new Date().toLocaleDateString("en-IN")}</td></tr>
                </table>
              </td></tr>
            </table>
            <p>Thank you for choosing Knead & Frost. A copy of this receipt is available in your portal.</p>`,
          ctaUrl: `${BRAND.site}/login`,
          ctaLabel: "View in Portal",
        }),
      };
    case "certificate_release":
      return {
        subject: "🎓 Your Certificate is Ready – Knead & Frost",
        html: shell({
          preheader: "Congratulations on completing your course!",
          title: `Congratulations, ${name}!`,
          bodyHtml: `
            <p style="font-size:16px">You've successfully completed <strong>${data.course_title || "your course"}</strong> at Knead & Frost Academy.</p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:linear-gradient(135deg,${BRAND.cream} 0%,#fff5e1 100%);border:2px dashed ${BRAND.primary};border-radius:12px;margin:20px 0">
              <tr><td style="padding:24px;text-align:center">
                <div style="font-family:Georgia,serif;font-size:18px;color:${BRAND.primaryDark};font-weight:600">Certificate of Completion</div>
                ${data.certificate_number ? `<div style="margin-top:10px;font-size:13px;color:${BRAND.muted}">Certificate No.</div><div style="font-family:monospace;font-size:15px;font-weight:600;color:${BRAND.ink}">${data.certificate_number}</div>` : ""}
                ${data.issue_date ? `<div style="margin-top:12px;font-size:12px;color:${BRAND.muted}">Issued ${data.issue_date}</div>` : ""}
              </td></tr>
            </table>
            <p>Your certificate is now available in your student portal. We're proud to have been part of your baking journey!</p>`,
          ctaUrl: `${BRAND.site}/login`,
          ctaLabel: "Download Certificate",
        }),
      };
    case "slot_reminder_24h":
      return {
        subject: `Reminder: Your slot tomorrow at ${data.time_slot}`,
        html: shell({
          preheader: "You have a baking session tomorrow.",
          title: `See you tomorrow, ${name}!`,
          bodyHtml: `
            <p>This is a friendly reminder of your upcoming session.</p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:${BRAND.cream};border:1px solid ${BRAND.border};border-radius:10px;margin:18px 0">
              <tr><td style="padding:18px 22px;font-size:15px">
                <div><strong>Date:</strong> ${data.booking_date}</div>
                <div style="margin-top:6px"><strong>Time Slot:</strong> ${data.time_slot}</div>
                ${data.recipe_title ? `<div style="margin-top:6px"><strong>Recipe:</strong> ${data.recipe_title}</div>` : ""}
              </td></tr>
            </table>
            <p>Need to cancel? You must do so before <strong>11:59 PM tonight</strong>. Same-day cancellations are not allowed.</p>`,
          ctaUrl: `${BRAND.site}/login`,
          ctaLabel: "View Booking",
        }),
      };
    case "slot_cancellation_cutoff":
      return {
        subject: `⏰ Last chance to cancel — slot tomorrow at ${data.time_slot}`,
        html: shell({
          preheader: "Cancellation window closes at 11:59 PM tonight.",
          title: `Cancellation cutoff approaching, ${name}`,
          bodyHtml: `
            <p>Your session is scheduled for <strong>${data.booking_date}</strong> at <strong>${data.time_slot}</strong>${data.recipe_title ? ` (${data.recipe_title})` : ""}.</p>
            <p style="background:#fff5e1;border-left:4px solid ${BRAND.primary};padding:12px 16px;border-radius:6px"><strong>Cancellations close at 11:59 PM tonight.</strong> After that, the slot will be locked and counted as attended/no-show.</p>
            <p>If you can no longer attend, please cancel from your portal now.</p>`,
          ctaUrl: `${BRAND.site}/login`,
          ctaLabel: "Manage Booking",
        }),
      };
    case "slot_reminder_2h":
      return {
        subject: `🍰 Your session starts in 2 hours – ${data.time_slot}`,
        html: shell({
          preheader: "Final reminder: see you soon at the academy.",
          title: `Almost time, ${name}!`,
          bodyHtml: `
            <p>Your session begins in approximately <strong>2 hours</strong>.</p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:${BRAND.cream};border:1px solid ${BRAND.border};border-radius:10px;margin:18px 0">
              <tr><td style="padding:18px 22px;font-size:15px">
                <div><strong>Time:</strong> ${data.time_slot}</div>
                ${data.recipe_title ? `<div style="margin-top:6px"><strong>Recipe:</strong> ${data.recipe_title}</div>` : ""}
                ${data.table_number ? `<div style="margin-top:6px"><strong>Table:</strong> ${data.table_number}</div>` : ""}
              </td></tr>
            </table>
            <p>Please arrive 10 minutes early. Looking forward to seeing you!</p>`,
        }),
      };
    case "slot_booking_confirmation":
      return {
        subject: `✅ Slot booked – ${data.booking_date} at ${data.time_slot}`,
        html: shell({
          preheader: "Your baking slot is confirmed.",
          title: `Booking confirmed, ${name}!`,
          bodyHtml: `
            <p>Great news — your slot has been successfully booked. Here are the details:</p>
            <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;background:${BRAND.cream};border:1px solid ${BRAND.border};border-radius:10px;margin:18px 0">
              <tr><td style="padding:18px 22px;font-size:15px">
                <div><strong>Date:</strong> ${data.booking_date}</div>
                <div style="margin-top:6px"><strong>Time Slot:</strong> ${data.time_slot}</div>
                ${data.course_title ? `<div style="margin-top:6px"><strong>Course:</strong> ${data.course_title}</div>` : ""}
                ${data.recipe_title ? `<div style="margin-top:6px"><strong>Recipe:</strong> ${data.recipe_title}</div>` : ""}
              </td></tr>
            </table>
            <p style="background:#fff5e1;border-left:4px solid ${BRAND.primary};padding:12px 16px;border-radius:6px"><strong>Need to cancel?</strong> Cancellations must be made before <strong>11:59 PM the previous day</strong>. Same-day cancellations are not allowed.</p>
            <p>We'll send you a reminder 24 hours and 2 hours before your session. See you soon!</p>`,
          ctaUrl: `${BRAND.site}/login`,
          ctaLabel: "View My Bookings",
        }),
      };
    default:
      throw new Error(`Unknown template: ${template}`);
  }
}

export const FROM_ADDRESS = Deno.env.get("RESEND_FROM_EMAIL") || "Knead & Frost <noreply@kneadandfrost.in>";
export const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";
