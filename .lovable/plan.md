

## Plan: "Mark as Paid" Button + Post-Enrollment-Payment Lead Conversion

### What This Does

1. **"Mark as Paid" button** on each unpaid installment so admins can manually confirm payment received outside the system (cash, bank transfer, etc.)
2. **Auto-conversion after enrollment fee is paid**: When the first installment (enrollment fee) is marked as paid, the lead's stage automatically updates to "Converted"

---

### Changes

#### 1. Add `markAsPaid` function in `LeadPaymentSetup.tsx`

- New async function that updates the `lead_installments` row: sets `status = 'paid'` and `paid_at = now()`
- After marking installment #1 (enrollment fee) as paid, also update `leads.stage` to `'converted'`
- Refresh the query cache so the UI updates immediately
- Show a confirmation toast

#### 2. Add "Mark as Paid" button in the installments table

- A new `CheckCircle` icon button next to the existing "Generate Link" and "Remove" buttons
- Only visible for saved installments (`inst.id` exists) with `status !== 'paid'`
- Includes a tooltip saying "Mark as Paid"
- Confirmation dialog (using `window.confirm`) before marking to prevent accidental clicks

#### 3. Auto-update lead stage on enrollment fee payment

- When installment #1 is marked as paid, the function will also run:
  ```sql
  UPDATE leads SET stage = 'converted' WHERE id = leadId
  ```
- This moves the lead from "Contacted/Interested" to "Converted" on the Kanban board

---

### Technical Details

**File modified:** `src/pages/admin/LeadPaymentSetup.tsx`

**New function - `markAsPaid(installmentId, installmentNumber)`:**
- Updates `lead_installments` set `status = 'paid'`, `paid_at = new Date().toISOString()` where `id = installmentId`
- If `installmentNumber === 1`, also updates `leads.stage = 'converted'` for the current lead
- Updates local `installments` state to reflect the change
- Invalidates the `lead-payment-plan` query

**UI addition in the table actions column:**
- New `CheckCircle` icon button with green styling, placed before the "Generate Link" button
- Guarded by `window.confirm("Mark this installment as paid?")` to prevent accidental clicks

**No database schema changes needed** - the `lead_installments` table already has `status` and `paid_at` columns, and `leads` already has a `stage` column.

