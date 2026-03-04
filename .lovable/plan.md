

## Plan: Fix the "View" Button on Student Management Page

### Problem
The "View" button (line 521 in `Students.tsx`) has no `onClick` handler -- it's a dead button.

### What the View Dialog Should Show
A dialog displaying the student's full profile and enrollment details:

- **Student Info**: Name, Email, Phone, Student ID
- **Course Info**: Course title, Enrollment date, Status, Progress
- **Payment Info**: Payment schedule summary (from `payment_schedules` table)
- **Online Class Status**: Whether online classes are enabled
- **Batch Info**: Assigned batch (from enrollment record)

### Implementation

**File: `src/pages/admin/Students.tsx`**

1. Add a `viewStudent` state to track the selected student/enrollment for viewing
2. Add an `onClick` handler to the View button that sets this state
3. Add a Dialog component that displays:
   - Student profile section (name, email, phone, student ID)
   - Enrollment details section (course, batch, status, progress, enrollment date)
   - Payment overview (fetch from `payment_schedules` for this enrollment)
   - Online class access status (fetch from `student_online_access`)
4. Include action shortcuts in the dialog: "Manage Online Class", "View Payments" link

### Files Modified
| File | Change |
|------|--------|
| `src/pages/admin/Students.tsx` | Add view dialog state, onClick handler, and Dialog component with student details |

