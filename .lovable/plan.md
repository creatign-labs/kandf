# Razorpay Webhooks: What Changes, What Doesn't

## Short answer to your question

Adding webhooks does **not** break anything that already works, as long as it is added as a *safety net* rather than a replacement. Nothing in the current flow is removed. The existing screens keep updating instantly like they do today; the webhook silently repairs the cases that currently fail.

## How payments work today (verified in the code)

Every payment type currently confirms itself **from the browser**, right after the Razorpay popup succeeds:

- Student course payment - `verify-razorpay-payment`
- Advance/registration payment - `verify-advance-payment`
- Installment / schedule payment - `verify-schedule-payment`
- Public payment link - `verify-public-payment`
- Resume add-on - `verify-resume-addon-payment`
- Vendor registration fee - `verify-vendor-payment`

Each of these checks the Razorpay HMAC signature and then flips the record to `paid`.

There is already exactly one true webhook in the system: `lead-payment-webhook`, which handles Razorpay payment links for leads.

## The gap this closes

Because confirmation is triggered by the browser, money can be captured by Razorpay while your database still says unpaid whenever:

- The student closes the tab or loses network right after paying
- The phone sleeps or the browser kills the tab mid-redirect
- The verify call itself errors out
- UPI payments that complete a few seconds late, after the popup already closed

Today those become manual reconciliation: the customer says "I paid", admin has to check Razorpay and fix the record by hand. With webhooks, Razorpay reports the payment server-to-server and the record self-corrects within seconds, with retries for up to 24 hours.

## What will be built

1. **One new endpoint** `razorpay-webhook` that accepts all Razorpay account events.
2. **Signature verification** using a dedicated webhook secret (not the API secret), so nobody can forge a paid status.
3. **Event routing** using the `notes` already attached at order-creation time (course ID, schedule ID, vendor profile ID, add-on type, etc.), so each event lands on the right table.
4. **Idempotency**: a webhook is only allowed to move a record from unpaid to paid. If the browser already confirmed it, the webhook detects that and exits without touching anything - no duplicate receipts, no double fulfilment, no duplicate emails.
5. **Failure events**: `payment.failed` marks the attempt as failed so failed attempts stop looking "pending" forever.
6. **A webhook event log table** so you can see every callback Razorpay sent, what it matched, and whether it was applied - useful when a customer disputes a payment.

## What stays exactly the same

- All six existing verify functions stay live and unchanged in behaviour. The success screens still appear immediately.
- No change to any payment page, checkout button, or price.
- No change to enrollment, approval, batch, slot, or vendor approval logic.
- Existing paid records are untouched; nothing is re-processed retroactively.
- `lead-payment-webhook` keeps working; the new endpoint will not compete with it.

## What you will need to do once

After the endpoint is deployed, you add it in your Razorpay dashboard under Settings - Webhooks: paste the endpoint URL, choose a strong random secret, and select the events (`payment.captured`, `payment.failed`, `order.paid`, `payment_link.paid`). You then save that same secret in the app so signatures match. I'll give you the exact URL and event list when we get there, and you can test it with Razorpay's "Send test webhook" button before any real customer pays.

## Risks and how they're handled

- **Wrong secret** - webhook returns 401 and nothing updates; visible in the event log, fixed by re-entering the secret. No customer impact because browser verification still works.
- **Double processing** - prevented by the unpaid-to-paid-only rule.
- **Unknown or unrelated events** - logged and ignored, never error out, so Razorpay doesn't disable the webhook for failures.

## Technical notes

- New function `supabase/functions/razorpay-webhook/index.ts`, `verify_jwt = false` (Razorpay cannot send a JWT), raw-body HMAC-SHA256 against `RAZORPAY_WEBHOOK_SECRET`.
- New secret `RAZORPAY_WEBHOOK_SECRET`, separate from `RAZORPAY_KEY_SECRET`. `lead-payment-webhook` currently signs against `RAZORPAY_KEY_SECRET`; it will be switched to the webhook secret with a fallback to the old value so it cannot break during the transition.
- New table `razorpay_webhook_events` (event ID unique, payload, matched entity, status, processed_at) with RLS restricted to admins/super admins and service-role writes plus explicit grants.
- Handlers reuse the same status transitions the verify functions already perform, guarded by `.neq('status','paid')` style conditions for idempotency.
