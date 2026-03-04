

## Plan: Consolidate Student Approvals into Student Management

### Current State
- **StudentApprovals page** (`/admin/student-approvals`): Full-featured approval workflow with status tabs (All/Pending/Approved/Rejected), stats cards, Approve & Enroll / Reject buttons, View Credentials, Edit approval record, Delete record, rejection confirmation dialog.
- **Students page** (`/admin/students`): Has an "Awaiting Activation" tab with a simpler UI -- only "Generate Credentials" button, no reject option, no status filtering, no edit/delete of approval records.

### What Changes

**1. Upgrade the "Awaiting Activation" tab in Students.tsx**
Replace the current simple awaiting tab with the full StudentApprovals logic:
- Add sub-filter tabs: All / Pending / Approved / Rejected (with counts)
- Add stats cards for Pending, Approved, Rejected counts within the tab
- Add table columns matching StudentApprovals: Student, Course, Payment status, Approval Status, Date, Actions
- Add all action buttons:
  - **Pending**: "Approve & Enroll" + "Reject" (Super Admin only)
  - **Approved**: "View Credentials"
  - **Rejected**: "Application Rejected" badge
  - **Edit** (pencil icon) for Super Admin on non-rejected records
- Add all dialogs from StudentApprovals:
  - Rejection confirmation dialog with notification preview
  - Edit approval record dialog (change status, delete record)
  - Delete confirmation AlertDialog
- Data source: query `student_access_approvals` with joined `advance_payments` and `profiles` (same as StudentApprovals)
- Add reject mutation that updates approval status + profile enrollment_status + sends notification

**2. Remove the standalone StudentApprovals page**
- Remove `/admin/student-approvals` route from App.tsx
- Remove import of StudentApprovals from App.tsx
- Update AdminDashboard quick action link: change "Student Approvals" to navigate to `/admin/students` (and auto-select the awaiting tab via query param or state)
- Update FlowWalkthrough reference
- Optionally keep `StudentApprovals.tsx` file but it will be unused (or delete it)

**3. Update AdminDashboard quick action**
- Change the "Student Approvals" quick action button to link to `/admin/students?tab=awaiting` so it opens the Students page directly on the awaiting tab
- Students page will read the URL param to set the initial active tab

### Output Preview

The **Student Management** page will have two tabs:
- **Enrolled Students (N)** -- unchanged, same as today
- **Awaiting Activation (N)** -- now contains the full approval workflow:

```text
┌─────────────────────────────────────────────────────┐
│ Student Management                                   │
│ View and manage all students                         │
├─────────────────────────────────────────────────────┤
│ [Total] [Active] [Completed] [On Hold] [Awaiting]   │
├─────────────────────────────────────────────────────┤
│ [Enrolled Students (12)]  [Awaiting Activation (5)] │
├─────────────────────────────────────────────────────┤
│                                                      │
│  [Pending: 3] [Approved: 1] [Rejected: 1]           │
│                                                      │
│  [All] [Pending(3)] [Approved(1)] [Rejected(1)]     │
│  [🔍 Search by name or phone...]                     │
│                                                      │
│  Student | Course | Payment | Status  | Date | Acts  │
│  ─────────────────────────────────────────────────── │
│  John D  | Found  | ₹2000✓  | Pending | Mar 1│ [Ap] │
│  Jane S  | Adv.P  | ₹2000✓  | Approved| Feb28│ [Cr] │
│  Sam K   | Found  | ₹2000✓  | Rejected| Feb25│ [Rj] │
└─────────────────────────────────────────────────────┘
```

Actions per status (Super Admin):
- **Pending**: "Approve & Enroll" (green) + "Reject" (red) + Edit (pencil)
- **Approved**: "View Credentials" + Edit (pencil)
- **Rejected**: "Application Rejected" badge

Non-Super-Admins see "Super Admin only" text and view-only access.

### Files Modified
| File | Change |
|------|--------|
| `src/pages/admin/Students.tsx` | Major rewrite of "Awaiting Activation" tab with full approval logic, reject mutation, edit/delete dialogs |
| `src/App.tsx` | Remove StudentApprovals route and import |
| `src/pages/AdminDashboard.tsx` | Update quick action link to `/admin/students?tab=awaiting` |
| `src/pages/FlowWalkthrough.tsx` | Update route reference |

