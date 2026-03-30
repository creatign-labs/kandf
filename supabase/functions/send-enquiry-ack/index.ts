const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY is not configured");
      return new Response(JSON.stringify({ error: "Email service not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { to, name } = await req.json();

    if (!to) {
      return new Response(JSON.stringify({ error: "Recipient email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 0; background: #f4f4f5; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 8px; overflow: hidden; }
    .header { background: #d4a574; padding: 32px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; }
    .header p { margin: 4px 0 0; opacity: 0.9; font-size: 14px; }
    .body { padding: 32px; }
    .body h2 { color: #1a1a1a; margin-top: 0; }
    .body p { color: #52525b; line-height: 1.6; }
    .footer { padding: 24px 32px; text-align: center; color: #71717a; font-size: 12px; border-top: 1px solid #e4e4e7; }
  </style>
</head>
<body>
  <div style="padding: 24px;">
    <div class="container">
      <div class="header">
        <h1>🧁 Knead & Frost</h1>
        <p>Global Baking Academy</p>
      </div>
      <div class="body">
        <h2>Hi ${name || "there"},</h2>
        <p>Thanks for showing interest in <strong>Knead & Frost Academy</strong>!</p>
        <p>Our team will contact you shortly to help you with your enquiry and guide you through our courses and programs.</p>
        <p>We look forward to being a part of your baking journey!</p>
        <p>Warm regards,<br/><strong>The Knead & Frost Academy Team</strong></p>
      </div>
      <div class="footer">
        <p>This is an automated message from Knead & Frost. Please do not reply.</p>
        <p>For urgent queries, contact support@kneadandfrost.com</p>
      </div>
    </div>
  </div>
</body>
</html>`;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "Knead & Frost <onboarding@resend.dev>",
        to: [to],
        subject: "Thank you for your enquiry – Knead & Frost",
        html,
      }),
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error("Resend API error:", resendData);
      return new Response(JSON.stringify({ error: "Failed to send email", details: resendData }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Enquiry ack email sent:", resendData);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in send-enquiry-ack:", errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
