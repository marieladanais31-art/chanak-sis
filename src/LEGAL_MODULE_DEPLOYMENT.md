
# Deployment Checklist: Legal Module & Digital Signatures 📝

This checklist ensures that the new Legal Documents module, digital signatures, Enrollment PDF generation, Hub Coordinator editing, and Student Programs are working correctly in production.

## 1. Refresh & Setup 🔄
- [ ] Perform a Hard Refresh (Ctrl+Shift+R or Cmd+Shift+R) to clear old cache.
- [ ] Ensure `npm run build` completes without errors.

## 2. Admin Hub Management (Coordinators) 🏢
- [ ] Login as a Super Admin (e.g., `administration@chanakacademy.org`).
- [ ] Navigate to **Gestión de Hubs**.
- [ ] Verify the Edit modal opens when clicking "Editar" on a Hub.
- [ ] Verify the dropdown "Coordinador Asignado" lists users with the `coordinator` role.
- [ ] Select a coordinator, click **Guardar**, and verify the Hub updates correctly in the table.

## 3. Student Programs Verification 🎓
- [ ] Navigate to **Estudiantes**.
- [ ] Click **Crear Estudiante** and verify the "Programa" dropdown shows: `Off Campus`, `Dual Diploma`, and `Presencial/Hub`.
- [ ] Click "Editar" on an existing student and verify the program can be changed and saved successfully.
- [ ] Verify the "Programa" column appears correctly in the student table.

## 4. Legal Documents & 14-Clause Contract ⚖️
- [ ] Login as a Parent (e.g., `eliasvidal83@gmail.com`).
- [ ] Navigate to **Documentos Legales**.
- [ ] Verify all **14 Clauses** are explicitly visible.
- [ ] Verify highlighting on Cláusula 6 (Red), Cláusula 10 (Orange), and Cláusula 13 (Purple).
- [ ] Enter a signature name and click **Firmar Contrato**.
- [ ] Verify success toast notification, and check `signatures` table to confirm `contract_version` is set to **2025**.

## 5. Enrollment PDF Generation 📥
- [ ] Once the contract is signed, click **📥 Descargar Confirmación de Matrícula**.
- [ ] Open the downloaded PDF.
- [ ] Verify the header is Light Gray.
- [ ] Verify **FDOE Code: 134620** is visible at the top.
- [ ] Verify the Title is "DECLARATION OF ENROLMENT" in dark blue.
- [ ] Verify student details are correctly populated inside the light blue box.
- [ ] Verify Mariela Andrade's signature line is at the bottom.

## 6. Coordinator Routing Validation 🚦
- [ ] Login as `offcampus@chanakacademy.org` (Password required).
- [ ] Verify automatic redirection directly to `/coordinator`.
- [ ] Ensure no credential errors or permission denied screens appear.
- [ ] Login as `dualdiploma@chanakacademy.org`.
- [ ] Verify automatic redirection directly to `/coordinator`.

## 7. Data Preservation & Safety Check 🛡️
- [ ] Confirm Elías Vidal still sees his children (Daniel and Anais) on the Parent Dashboard.
- [ ] Confirm Mariela Andrade (`administration@chanakacademy.org`) still possesses `super_admin` access.
- [ ] Confirm the white/blue default styling is intact globally.
- [ ] Confirm Financial/Payment features are still operational for Admins and Parents.

## Rollback Procedures 🔄
If errors occur during testing:
1. Revert `AdminEstudiantes.jsx` and `AdminHubs.jsx` logic to omit `program` or `coordinator_id` dependencies.
2. Ensure RLS policies on `signatures` and `hubs` aren't preventing INSERTS/UPDATES.
3. Check browser console logs (especially those prefixed with `✅` or `❌`) for exact error traces.
