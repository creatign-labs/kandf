

# Knead & Frost Academy — User Flow PDF for Client Presentation

## What will be delivered

A professionally designed, multi-page PDF document covering:

1. **Platform Overview** — brief intro to the academy platform
2. **Student Flow** — end-to-end journey from enrollment to certification, plus all capabilities
3. **Chef Flow** — daily operations, attendance, inventory
4. **Admin Flow** — operational management, leads, bookings, recipes, inventory
5. **Super Admin Flow** — elevated privileges (approvals, staff, financials, audit)
6. **Vendor Flow** — job posting and application management (exists in the platform)
7. **Role Capability Matrix** — a table summarizing what each role can do

## Technical approach

- Generate PDF using **ReportLab** (Python) with professional styling
- Color palette aligned with the platform's primary brand (purple/violet tones)
- Structured sections with flow diagrams described as numbered steps
- Visual QA via `pdftoppm` before delivery
- Output to `/mnt/documents/Knead_Frost_User_Flows.pdf`

## Key content (from codebase analysis)

**Student capabilities**: Dashboard, My Course, Recipe Details, Slot Booking (1-day lead), My Bookings (with assigned chef/recipe/table), Feedback, Certificates (3-gate eligibility), Resume Builder, Jobs Portal, Online Classes, Notifications, Profile, Change Password

**Chef capabilities**: Dashboard (today's recipe groups), Attendance marking (present/absent with 3-strike lockout), Daily Ingredients, Inventory Usage logging, Recipe Library, Schedule

**Admin capabilities**: Dashboard with KPIs, Lead Management (Kanban), Student Management, Enrollments, Course/Batch Management, Recipe Library + Ingredients, Booking Recipe/Chef/Table Assignment, Inventory (stock, daily requirements, checklist), Notifications, Staff Management, Job Application Review, Vendor Approvals, Payment Status, Batch Calendar, Data Centre

**Super Admin (Admin + extras)**: Student Approvals with credential issuance, Inventory Approval, Super Admin Management (promote/demote), Executive Dashboard, Financials, Audit Logs, Purchase Orders, Payment Schedule editing/deletion

**Vendor**: Signup, Dashboard, Post Jobs, View Applications, Released Applications, Profile

