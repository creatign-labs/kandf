

# Knead & Frost — ERP-Level Upgrade Roadmap

## Current State Summary

Your system already has strong foundations across 5 portals with 48 database tables, 38 server-side functions, 17 edge functions, and comprehensive RLS policies. Here is what is missing or needs hardening to reach ERP-grade.

---

## PHASE 1 — Inventory Ledger (Append-Only)

**Gap**: Inventory currently uses a mutable `current_stock` column. There is no append-only ledger tracking every stock movement (stock-in, deduction, adjustment, wastage).

**Plan**:
- Create an `inventory_ledger` table with columns: `id`, `inventory_id`, `movement_type` (stock_in, deduction, adjustment, wastage, return), `quantity`, `reference_type` (batch_confirmation, manual_adjustment, purchase), `reference_id`, `notes`, `performed_by`, `created_at`.
- RLS: Admins/Super Admins can INSERT and SELECT. No UPDATE or DELETE allowed.
- Replace all direct `current_stock` mutations with ledger inserts + a trigger that recalculates `inventory.current_stock` as the running sum from the ledger.
- This ensures full traceability and prevents silent stock tampering.

---

## PHASE 2 — Financial Ledger Hardening

**Gap**: The `payments` table blocks UPDATE/DELETE (good), but there is no dedicated financial ledger for refunds, manual adjustments, and write-offs. Super Admin refund/adjustment actions need append-only entries.

**Plan**:
- Create a `financial_ledger` table: `id`, `student_id`, `enrollment_id`, `entry_type` (payment, refund, adjustment, write_off), `amount`, `reference_id`, `notes`, `performed_by`, `created_at`.
- No UPDATE or DELETE policies.
- Super Admin financial actions (mark paid manually, issue refund) write to this ledger instead of mutating existing records.
- Update the Super Admin Financial Management page to read from this ledger.

---

## PHASE 3 — Data Export & Reporting Engine

**Gap**: No export capability exists anywhere. ERP systems need CSV/Excel exports for students, payments, inventory, attendance, and audit logs.

**Plan**:
- Build a reusable `ExportButton` component that converts table data to CSV and triggers browser download.
- Add export buttons to: Student list, Payment ledger, Inventory stock, Attendance records, Audit logs, Leads pipeline, Job applications.
- Super Admin gets a dedicated "Reports" page with date-range filtered exports.

---

## PHASE 4 — Notification Center Overhaul

**Gap**: Notifications exist but lack structured delivery tracking, read/unread management, and cross-portal consistency.

**Plan**:
- Ensure every automated event (no-show lock, payment overdue, course expiry, batch confirmation, approval status change) generates a notification row.
- Add a notification bell with unread count badge in the Header for all portal roles.
- Add "mark all read" functionality.
- Enable realtime updates via Supabase Realtime on the `notifications` table.

---

## PHASE 5 — Admin Financial Management Page

**Gap**: Super Admin dashboard links to a financial ledger, but there is no dedicated page for: viewing full payment history, manually marking installments paid, issuing refunds, or viewing revenue by date/course.

**Plan**:
- Build `/admin/financials` page (Super Admin only).
- Sections: Revenue summary with date filters, installment aging report, manual payment marking (creates financial ledger entry + audit log), refund issuance (append-only), revenue breakdown by course.
- All mutations create audit log entries automatically.

---

## PHASE 6 — Inventory Purchase Order Workflow

**Gap**: Daily inventory requirements and checklists exist, but there is no formal purchase order (PO) flow linking approved requirements to actual stock-in entries.

**Plan**:
- Add `purchase_orders` table: `id`, `requirement_id`, `vendor_name`, `total_amount`, `status` (draft, approved, received, cancelled), `created_by`, `approved_by`, `created_at`.
- Add `purchase_order_items` table linking to inventory items with ordered/received quantities.
- When a PO is marked "received", auto-create `inventory_ledger` entries for stock-in.
- Admin creates POs; Super Admin approves.

---

## PHASE 7 — Dashboard Analytics & Charts

**Gap**: Super Admin dashboard shows summary numbers but no trend charts. ERP systems need visual analytics.

**Plan**:
- Add Recharts-based visualizations to the Super Admin Executive Dashboard:
  - Monthly revenue trend (bar chart)
  - Enrollment funnel (leads to converted to active)
  - Attendance rate over time (line chart)
  - Inventory consumption trend
  - No-show trend (last 90 days)
- All data sourced from existing tables with date-range aggregation queries.

---

## PHASE 8 — Activity Timeline & Communication Log

**Gap**: No centralized activity log per student. Admins must check multiple tables to understand a student's history.

**Plan**:
- Build a "Student Timeline" component visible on the Admin student detail view.
- Aggregate from: enrollment_status_logs, attendance, bookings, payments, payment_schedules, feedback, job_applications, approval_requests.
- Display as a chronological timeline with icons per event type.
- This gives admins a 360-degree view of any student.

---

## PHASE 9 — Batch Calendar View for Admin

**Gap**: Admin sees a list of batches but no calendar visualization showing daily/weekly batch scheduling with chef assignments, capacity, and recipe details.

**Plan**:
- Build a calendar component on `/admin/batch-calendar` using a date-grid layout.
- Each day cell shows scheduled recipe batches with time, recipe name, chef, and capacity fill.
- Click to drill into batch details.
- Color-coding: green (confirmed), yellow (partially filled), red (no chef assigned).

---

## PHASE 10 — System Health & Operational Integrity

**Gap**: Several edge cases from the stress test specification are not yet enforced:

**Plan**:
- **Duplicate payment webhook protection**: Add unique index on `razorpay_payment_id` in `payment_schedules` (already done for `payments` table, extend to schedules).
- **Concurrency on last slot booking**: The `book_recipe_slot` RPC should use `SELECT FOR UPDATE` on the recipe_batch row to prevent race conditions.
- **Auto-attendance fallback**: The `attendance-auto-closure` edge function exists but needs a cron schedule in `config.toml` to run every hour and mark unmarked students as no-show after 6 hours post-batch-end.
- **Fee template snapshot**: When enrolling a student, freeze the course `base_fee` into the enrollment record so future fee template changes do not affect existing students.
- **Recipe versioning**: Add a `version` column to recipes. Editing a recipe creates a new version; historical batches reference the old version.

---

## Summary of New Database Objects

| Object | Type | Purpose |
|--------|------|---------|
| inventory_ledger | Table | Append-only stock movement log |
| financial_ledger | Table | Append-only payment/refund/adjustment log |
| purchase_orders | Table | Formal PO workflow |
| purchase_order_items | Table | PO line items |
| recalc_inventory_stock | Trigger | Auto-update current_stock from ledger |
| recipes.version | Column | Recipe versioning |
| enrollments.fee_snapshot | Column | Frozen fee at enrollment time |

---

## Implementation Priority

1. **Inventory Ledger** and **Financial Ledger** (core ERP integrity)
2. **Data Export** (operational necessity)
3. **Admin Financials Page** and **Student Timeline** (visibility)
4. **Notification Overhaul** and **Realtime** (operational responsiveness)
5. **Dashboard Charts** and **Batch Calendar** (executive visibility)
6. **Purchase Order Workflow** (procurement maturity)
7. **System Health Fixes** (edge case hardening)

---

## Technical Notes

- All new tables will have RLS enabled with role-appropriate policies.
- All ledger tables will have NO UPDATE and NO DELETE policies.
- Export uses client-side CSV generation (no new edge functions needed).
- Charts use the already-installed `recharts` library.
- Realtime requires enabling `supabase_realtime` publication on the `notifications` table.
- No changes to `config.toml`, `client.ts`, `types.ts`, or `.env` (auto-managed files).
- Estimated ~15 new/modified files across migrations, pages, and components.

