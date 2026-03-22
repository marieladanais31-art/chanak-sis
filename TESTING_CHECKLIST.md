
# TESTING_CHECKLIST.md

## 1. Multiple Hub Selection and `student_hubs` Relationships
- [ ] Log in as Super Admin.
- [ ] Navigate to **Directorio de Alumnos** (`/admin/alumnos` or similar student management view).
- [ ] Click **Agregar Alumno** or **Editar Alumno**.
- [ ] Verify that a list of hubs (Chanak, EducaFe, Acate, etc.) appears as checkboxes.
- [ ] Select multiple hubs and save the form.
- [ ] Verify the table updates to display the comma-separated names of the assigned hubs.
- [ ] **Expected Outcome:** Data persists across reloads, showing correctly mapped multiple hubs.

## 2. PEI Coordinator Tab Access and Data Persistence
- [ ] Log in as Parent.
- [ ] Go to **Portal Familiar** and verify that the **PEI Coordinación** tab is **hidden**.
- [ ] Log in as Coordinador or Super Admin.
- [ ] Go to **Portal Familiar** (or view student overview), and verify the **PEI Coordinación** tab is **visible**.
- [ ] Open the tab, click **Editar PEI**.
- [ ] Fill out the Vocacional Profile, Pacing, and Graduation Pathway forms. Click Save.
- [ ] **Expected Outcome:** Form should switch back to view mode, displaying the saved data accurately in color-coded cards. Reloading the page should fetch the exact same data.

## 3. User Role Creation and Password Reset
- [ ] Log in as Super Admin.
- [ ] Navigate to **Directorio de Usuarios**.
- [ ] Click **Crear Usuario**. Fill out email, password, name, and select a role (e.g., Coordinador). Submit.
- [ ] Verify success toast (or simulation toast if backend keys are restricted). 
- [ ] Locate any user in the table and click the red **Lock** icon to reset the password.
- [ ] A prompt should ask for the new password. Enter a valid password (min 6 chars) and confirm.
- [ ] **Expected Outcome:** User creation and password reset functions execute successfully or display expected fallback behavior, proving UI and logic are fully connected.

## 4. Report Card Categories and Transferred Credits
- [ ] Ensure a student has subjects assigned under multiple categories including "Core (A.C.E.)" and "Materias Transferidas" via the **General** tab -> **Registro Académico Categorizado**.
- [ ] Navigate to the **Documentos** tab.
- [ ] Click **Descargar PDF Oficial** under Boletín Oficial.
- [ ] Open the downloaded PDF.
- [ ] **Expected Outcome:** All regular categories appear first. "CRÉDITOS TRANSFERIDOS" must appear in a separate, visually distinct section at the bottom, accompanied by a disclaimer that they do not affect current GPA.

## 5. Enrollment Confirmation PDF Generation
- [ ] Navigate to the **Documentos** tab for an Enrolled/Paid student.
- [ ] Locate the **Declaration of Enrollment** card.
- [ ] Click **Descargar Carta Oficial**.
- [ ] Open the downloaded PDF.
- [ ] **Expected Outcome:** The document features the official "CHANAK TRAINUP EDUCATION INC" header, FDOE Code 134620, the exact formatting for Urbina Escobar models, student details, and the Mariela Andrade signature.

## 6. UUID Format Consistency Verification
- [ ] Create a new student and assign multiple hubs.
- [ ] Open browser DevTools network tab or view Supabase dashboard.
- [ ] Ensure `student_hubs.id`, `student_id`, and `hub_id` are strictly generated UUIDs (e.g., `123e4567-e89b-12d3-a456-426614174000`), with no plain text values.
- [ ] **Expected Outcome:** No SQL relation errors regarding text vs uuid mismatch occur during save or load operations.
