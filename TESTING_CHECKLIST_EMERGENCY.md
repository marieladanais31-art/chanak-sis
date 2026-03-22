
# Emergency Testing Checklist

## Flow 1: Independent Roles Selection
- [ ] Navigate to User Creation Form (Admin Panel -> Users).
- [ ] Verify `RoleSelector` displays 5 completely independent roles without combinations.
- [ ] Check categories are labeled: Administrativo, Académico, Familia, Estudiante.
- [ ] Select a role, ensure radio button indicates selection properly.
- [ ] Ensure validation triggers if no role is selected before form submission.

## Flow 2: Dynamic Hub Loading Verification
- [ ] Navigate to a section requiring Hub selection (e.g. creating user with Director role, or Admin Hubs).
- [ ] Verify `HubSelectorDynamic` shows loading spinner (⏳).
- [ ] Verify hubs are queried from `organizations` (type = 'hub') and displayed in a grid.
- [ ] Ensure NO hardcoded text "EducaFe" or "Sede Acate" exists in the source logic.
- [ ] Test multiple selection vs single selection handling (checkbox vs radio).
- [ ] Check behavior when database has 0 hubs (friendly message "No hay Hubs registrados").

## Flow 3: Family Portal with No Students
- [ ] Login as a Parent user with NO assigned students.
- [ ] Verify the portal does not crash or loop infinitely.
- [ ] Verify the appearance of the central card with the 👨‍👩‍👧 emoji and "Sin Estudiantes Vinculados".
- [ ] Ensure the Student Search and Link UI is visible.
- [ ] Verify the presence of the "Recargar Portal" button.

## Flow 4: Family Portal with Students
- [ ] Login as a Parent user WITH assigned students.
- [ ] Verify students appear in the top sliding horizontal list.
- [ ] Verify general dashboard info (Status Cards: Estudiante, Pago, Contrato).
- [ ] Verify access to "Académico" and "Documentos" tabs based on role permissions.

## Flow 5: PEI Module Creation/Editing
- [ ] Login as Coordinador (or SuperAdmin).
- [ ] Navigate to the "PEI Coordinación" tab inside a student's profile.
- [ ] If no PEI exists, verify the empty state and "Crear PEI" button.
- [ ] Click Edit/Crear and fill out: Meta Vocacional, Pacing (Pages/Day, Hours/Week), Graduation Pathway, Ages, and Credits.
- [ ] Save the form and verify the toast success notification.
- [ ] Ensure data saves successfully to `student_pei` table.

## Flow 6: Declaration PDF Generation
- [ ] Navigate to "Documentos" tab in Family Portal or Admin Student view.
- [ ] Click on "Generar Declaración PDF" in the new Declaration of Enrolment card.
- [ ] Verify PDF downloads successfully.
- [ ] Open PDF and verify Header explicitly says "CHANAK INTERNATIONAL ACADEMY".
- [ ] Verify NO presence of the word "Homeschool".
- [ ] Check for student dynamic details (Name, Passport, Grade Level).
- [ ] Check for signature line "Mariela Andrade - Head of School".

## Flow 7: Subject Categories System
- [ ] Verify `subject_categories` table exists via Supabase SQL execution.
- [ ] Check that valid categories are precisely: 'Core', 'LifeSkills', 'SecondLanguage', 'LocalSocialStudies', 'Electivas'.
- [ ] Test the normalization via `src/lib/categoryUtils.js`.
- [ ] Verify any new student subjects strictly adhere to the enforced `category` check constraint.

