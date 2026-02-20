

# Add Logout Button to Public Header (When Logged In)

## What Changes
When a logged-in user visits the public pages (Home, Courses, About, Contact), the header currently only shows a "Back to Dashboard" button. A "Log Out" button will be added next to it so users can sign out directly from any public page.

## Changes

### File: `src/components/Header.tsx`

**Desktop (line ~228-233):** Add a Log Out button next to "Back to Dashboard" when the user is logged in on a public page.

**Mobile (line ~331-339):** Add a Log Out button below "Back to Dashboard" in the mobile sheet menu footer.

Both buttons will use the existing `handleLogout` function already defined in the component.

