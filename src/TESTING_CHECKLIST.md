
# Testing Checklist: Chanak Academy Management System

This document provides a step-by-step checklist to verify the correct implementation of the new features.

## 1. Admin Students: Family & Hub Selectors
- [ ] Log in as a Super Admin or Admisiones.
- [ ] Navigate to the **Alumnos** (Students) tab.
- [ ] Click the **➕ Agregar Alumno** button.
- [ ] Verify that the **Familia** dropdown populates with existing families.
- [ ] Verify that the **Hub (Organización)** dropdown populates with available hubs.
- [ ] Fill in all fields, including the new `ID / Pasaporte` and `Fecha de Nacimiento`.
- [ ] Check the **Otorgar Beca Completa** checkbox. Observe that the Payment dropdown becomes disabled and defaults to "Beca / Exento".
- [ ] Submit the form and verify the student appears in the list with the correct Hub/Family name and the **Beca Completa** badge.

## 2. Family Portal: Digital Signature Module
- [ ] Log in as a Parent or use the Super Admin "Ver como Padre" view.
- [ ] Navigate to the **General (Overview)** tab.
- [ ] Scroll down to the **Firma de Contrato de Matrícula** section.
- [ ] Verify that the terms and conditions box is readable.
- [ ] Type a name into the "Nombre Completo del Padre/Tutor" field.
- [ ] Check the acceptance checkbox.
- [ ] Click **Firmar y Aceptar Contrato**.
- [ ] Ensure a success toast appears and the module switches to a green "COMPLETADA" state with the signature date and name.
- [ ] Verify that "2. Contrato Firmado" in the progress tracker now has a green checkmark.

## 3. Family Portal: PEI Editor Visualization
- [ ] Remain in the **General** tab of the Family Portal.
- [ ] Scroll to the **Individualized Educational Plan (PEI)** section.
- [ ] If no PEI exists, click **Crear PEI**.
- [ ] Fill in the fields: `Meta Vocacional`, `Estilo de Aprendizaje`, `Necesidades Especiales`, and `Acomodaciones`.
- [ ] Click **Guardar**.
- [ ] Verify a success message appears and the form enters read-only mode displaying the saved data.
- [ ] Refresh the page and verify the data persists and loads correctly (verifies database interaction and fallback cache logic).

## 4. Family Portal: Formal Enrollment Letter
- [ ] Navigate to the **Documentos** tab in the Family Portal.
- [ ] Locate the **Declaration of Enrollment** card.
- [ ] Ensure the button says **📥 Descargar Carta Oficial**. (It should be disabled if payment is pending and no scholarship is active).
- [ ] Click the download button.
- [ ] Open the generated PDF and verify the following elements:
  - [ ] Dark blue header with 🎓 Chanak International Academy.
  - [ ] Text: "FDOE Code: 134620 | Florida Not-For-Profit Corporation...".
  - [ ] "To Whom It May Concern," salutation.
  - [ ] Mention of "Accelerated Christian Education (A.C.E.)".
  - [ ] Mention of "Individualized Educational Plan (IEP)".
  - [ ] Head of School Signature line (Mariela Andrade).
  - [ ] Footer containing: `offcampus@chanakacademy.org` and address.
