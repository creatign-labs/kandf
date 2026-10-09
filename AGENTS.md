# Project Notes

## Architecture
- Email sending (send-email, send-enquiry-ack, send-branded-email) calls the Resend API directly at `https://api.resend.com/emails` using the `RESEND_API_KEY` secret — NOT the connector gateway. Why: the Resend connector connection was removed, which made the gateway fail with "Credential not found".
- Sender address defaults to `Knead & Frost <noreply@kneadandfrost.com>` (env `RESEND_FROM_EMAIL`); `kneadandfrost.com` must stay verified in the Resend dashboard for user-facing emails to deliver.
- `import-real-users` also calls Resend directly with the same key.
