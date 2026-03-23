

# Fix: Batch Dialog Input Bug + Replace Dollar Signs with INR Rupee Symbol

## Problem 1: Can only type one character in Create Batch dialog

**Root cause**: The batch list query fetches enrollment counts via `Promise.all`, causing frequent re-renders of the parent component. Each re-render causes the Dialog to lose input focus. Additionally, the `onChange` handlers use stale closure references (`...formData`) instead of functional updates (`prev => ({...prev})`).

**Fix**:
- Use functional state updates in all `setFormData` calls: `setFormData(prev => ({ ...prev, field: value }))`
- Extract the dialog form into a separate child component so parent re-renders (from query refetches) don't unmount/remount the form inputs

**File**: `src/pages/admin/Batches.tsx`

---

## Problem 2: Replace `DollarSign` icon and `$` currency symbols with INR `₹`

Most of the platform already uses `₹`. The remaining `DollarSign` icon usages need to be replaced with `IndianRupee` from lucide-react.

**Files to update** (4 files):

| File | Change |
|------|--------|
| `src/pages/admin/SuperAdminDashboard.tsx` | `DollarSign` → `IndianRupee` icon (3 usages) |
| `src/pages/admin/Courses.tsx` | `DollarSign` → `IndianRupee` icon (1 usage) |
| `src/pages/admin/Financials.tsx` | `DollarSign` → `IndianRupee` icon (1 usage) |
| `src/pages/student/Jobs.tsx` | `DollarSign` → `IndianRupee` icon (1 usage) |

No text `$` symbols found — currency text already uses `₹` throughout.

