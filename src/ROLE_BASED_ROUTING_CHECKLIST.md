
# Role-Based Routing Testing Checklist

This document outlines the testing requirements for the complete 5-role routing system.
**IMPORTANT:** After deployment, perform a hard refresh (`Ctrl + Shift + R` or `Cmd + Shift + R`) to ensure all new routes and contexts are loaded.

## Roles & Test Credentials

Use these credentials to test each specific role behavior. If passwords are unknown, use the `Reset Password` functionality or update them directly via the Super Admin's `AdminUserManagement` panel.

1.  **Super Admin**
    *   **Email:** `mariela@chanakacademy.org`
    *   **Expected Route:** `/portal/*` rendering `<AdminPanel />`
    *   **Access:** Full system access, all sidebars, user role management, PEI management.

2.  **Coordinator (Hub Manager)**
    *   **Email:** `coordinator@hub.org` *(Example - create if missing)*
    *   **Expected Route:** `/portal` rendering `<CoordinatorPanel />`
    *   **Access:** Only sees students linked to their `hub_id`. Can upload PEI files and enter grades specifying quarters (Q1/Q2/Q3).

3.  **Tutor (Grade Entry)**
    *   **Email:** `tutor@academy.org` *(Example - create if missing)*
    *   **Expected Route:** `/portal` rendering `<TutorDashboard />`
    *   **Access:** Only sees students linked to their `tutor_id`. Can only enter grades specifying quarters. No PEI upload access.

4.  **Student (Progress Viewer)**
    *   **Email:** `student@academy.org` *(Example - create if missing)*
    *   **Expected Route:** `/portal` rendering `<StudentDashboard />`
    *   **Access:** Views only their own grades, Report Card, and downloads their PEI. Sees Trimestral PACES alert status. Cannot edit anything.

5.  **Parent (Family Portal)**
    *   **Email:** `eliasvidal83@gmail.com`
    *   **Expected Route:** `/portal` rendering `<ParentDashboard />`
    *   **Access:** Views multiple children linked via `parent_id`. Signs contracts, views report cards, downloads PEI, sees Trimestral alert status per child. Cannot enter grades.

## Test Cases

### 1. Authentication Flow
- [ ] Unauthenticated user navigating to `/portal` redirects to `/login`.
- [ ] User logs in and is automatically routed to `/portal` rendering their specific dashboard.
- [ ] Logout button clears session and redirects to `/login`.

### 2. Super Admin Verification
- [ ] Verify left sidebar shows all modules (Students, Users, PEI, etc.).
- [ ] Navigate to "Usuarios" (`AdminUserManagement`) and verify the Role dropdown can successfully change a user's role.

### 3. Coordinator Verification
- [ ] Check that the student grid only shows students belonging to the Coordinator's Hub.
- [ ] Click "Subir PEI" and verify PDF upload works and saves URL to `students` table.
- [ ] Click "Notas" and enter a grade selecting "Q2". Verify it saves correctly.

### 4. Tutor Verification
- [ ] Check that student grid only shows students assigned to this specific Tutor.
- [ ] Verify UI is simplified (no PEI upload, no contract management).
- [ ] Enter a grade and verify it saves.

### 5. Student Verification
- [ ] Verify the header displays the Student's name.
- [ ] Check the Trimestral Alert Card (Red/Green based on expected PACES).
- [ ] Verify grades are split into Q1, Q2, and Q3 tables.
- [ ] Open the "Boletín" (Report Card) modal and verify total credits/average calculation.

### 6. Parent Verification
- [ ] Ensure the parent sees multiple children if applicable.
- [ ] Verify Trimestral Alert Card displays correct status (actual vs expected PACES).
- [ ] Test the "Firmar Contrato" modal and ensure it updates status.

### 7. Utility Functions
- [ ] Open console and verify `calculateTrimestralPACES` correctly calculates expected PACES based on the current month.
- [ ] Verify Fallback mechanisms (e.g., Q1 default for old grades without a quarter).

## Deployment Steps
1. Push code changes.
2. System automatically runs `npm run build`.
3. Clear browser cache (`Ctrl + Shift + R`).
4. Execute tests sequentially.
