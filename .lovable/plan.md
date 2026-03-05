

## Email Sending Across the Application — Analysis & Plan

### Current State

The application has **no email sending capability** implemented. Here is where emails are expected but not functional:

1. **Student Approval** (`StudentApprovals.tsx`): "Send Credentials via Email" button exists but does nothing — credentials (password, student ID) are only shown on-screen.
2. **Vendor Approval** (`VendorApprovals.tsx`): Same "Send Credentials via Email" button, non-functional.
3. **Payment Confirmations** (`PaymentSuccess.tsx`): UI text promises "confirmation email with login credentials" but no email is sent.
4. **In-app Notifications** (`admin/Notifications.tsx`): These are database-only notifications (stored in `notifications` table), not emails.
5. **Auth emails** (signup verification, password reset): Handled by Lovable Cloud's built-in auth system — these already work by default.

The `FeatureReport.tsx` page explicitly lists "Email Delivery" as pending.

### What Needs to Be Done

These are **transactional emails** (credential delivery, payment receipts), not auth emails. They require an email sending service.

#### Recommended Approach: Resend Integration

Resend is the standard transactional email service. The setup involves:

1. **Connect Resend** — You'll need a Resend account and API key. This will be stored as a backend secret (`RESEND_API_KEY`).

2. **Create a `send-email` backend function** — A single reusable function that accepts recipient, subject, and HTML body, then sends via Resend's API.

3. **Integrate into existing flows**:
   - **Student approval** (`approve-student-with-password`): After generating credentials, call the email function to send login details to the student.
   - **Vendor approval** (`approve-vendor-with-password`): Same pattern for vendor credentials.
   - **Payment confirmation**: After successful payment verification, send a receipt email.
   - **Admin notification broadcast** (optional): Extend the notification system to optionally send email copies.

4. **Wire up the "Send Credentials via Email" buttons** in `StudentApprovals.tsx` and `VendorApprovals.tsx` to trigger the email function.

### What You Need to Provide

- A **Resend account** (free tier at [resend.com](https://resend.com) supports 100 emails/day)
- Your **Resend API key**
- A **verified sender domain** or use Resend's default `onboarding@resend.dev` for testing

### Summary

| Item | Status |
|------|--------|
| Auth emails (verification, password reset) | Already working via Lovable Cloud |
| Student credential emails | Needs Resend + backend function |
| Vendor credential emails | Needs Resend + backend function |
| Payment confirmation emails | Needs Resend + backend function |
| Notification broadcast emails | Optional enhancement |

Shall I proceed with setting up the Resend integration? I'll walk you through getting the API key and then build the email infrastructure.

