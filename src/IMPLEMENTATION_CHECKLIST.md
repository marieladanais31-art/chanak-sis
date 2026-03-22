
# Implementation Testing Checklist

This document provides step-by-step testing procedures for all newly implemented features.

## Prerequisites
- Ensure you have test accounts for each role: SUPER_ADMIN, COORDINATOR, PARENT, TUTOR, STUDENT
- Database has students table with pei_url column
- Supabase Storage bucket 'pei_files' exists
- student_grades table exists with required columns
- subjects table exists with sample data

---

## Test 1: Admin Create User Flow

### Steps:
1. Login as SUPER_ADMIN (mariela@chanakacademy.org)
2. Navigate to "Usuarios" section in sidebar
3. Click "Crear Usuario" button
4. Fill in the form:
   - First Name: "Test"
   - Last Name: "User"
   - Email: "testuser@chanakacademy.org"
   - Password: "Password123"
   - Role: Select "student"
5. Click "Crear" button

### Expected Results:
- ✅ Success toast appears: "Usuario testuser@chanakacademy.org creado exitosamente"
- ✅ New user appears in users table
- ✅ Modal closes automatically
- ✅ Console shows: "✅ Auth user created: [user-id]"

### Verification:
- Check profiles table in Supabase for new user record
- Verify role is set to 'student'
- Verify email is confirmed

---

## Test 2: Admin Password Reset Flow

### Steps (Option A - Send Email):
1. In "Usuarios" section, find existing user
2. Click key icon (🔑) next to user
3. Check "Enviar email de recuperación"
4. Click "Confirmar"

### Expected Results:
- ✅ Success toast: "Email enviado"
- ✅ User receives password reset email
- ✅ Modal closes

### Steps (Option B - Direct Password Update):
1. In "Usuarios" section, find existing user
2. Click key icon (🔑) next to user
3. Leave checkbox unchecked
4. Enter new password: "NewPassword456"
5. Click "Confirmar"

### Expected Results:
- ✅ Success toast: "Contraseña actualizada"
- ✅ User can login with new password
- ✅ Modal closes

---

## Test 3: Admin PEI Upload Flow

### Steps:
1. Login as SUPER_ADMIN
2. Navigate to "PEI" section in sidebar
3. Find student card showing "⏳ PEI Pendiente"
4. Click "Subir PEI" button
5. Select PDF file (< 10MB)
6. File preview appears
7. Click "Subir"

### Expected Results:
- ✅ Success toast: "PEI de [Student Name] subido correctamente"
- ✅ Student card updates to "✅ PEI Subido"
- ✅ "Ver" and delete buttons appear
- ✅ Console shows: "⬆️ Uploading file to pei_files bucket: [filename]"
- ✅ Console shows: "🔗 Public URL generated: [url]"

### Verification:
- Check Supabase Storage 'pei_files' bucket for uploaded file
- Check students table - pei_url field is populated
- Click "Ver" button - PDF opens in new tab

---

## Test 4: Parent View PEI Flow

### Steps:
1. Login as PARENT (eliasvidal83@gmail.com)
2. Locate child card on dashboard
3. Click "Descargar PEI" button (only if PEI was uploaded)

### Expected Results:
- ✅ PDF opens in new browser tab
- ✅ File downloads to device
- ✅ No errors in console

### If PEI Not Available:
- ✅ Button shows "PEI Pendiente" in gray
- ✅ Button is disabled/non-interactive

---

## Test 5: Parent PACES Projection Display

### Test Data Setup:
- Student created 6 months ago (Expected: 6 PACES)
- Student has 4 grades with score >= 70 (Actual: 4 PACES)
- Deficit: 2 PACES

### Steps:
1. Login as PARENT
2. View child card

### Expected Results:
- ✅ Red background alert section displays: "🔴 ALERTA: Rendimiento Bajo"
- ✅ Shows "4 / 6 PACES"
- ✅ Shows "(2 PACES de atraso)"
- ✅ Progress percentage displays: "67%"
- ✅ Console shows: "📊 PACES Projection: Expected=6, Actual=4, Deficit=2, Status=alert"

### Test On-Track Student:
- Student with 8 actual PACES, 6 expected
- ✅ Green background displays: "🟢 En Buen Camino"
- ✅ Shows "8 / 6 PACES"
- ✅ Status: "active"

---

## Test 6: Parent Grade Entry

### Steps:
1. Login as PARENT
2. Click "Ingresar Nota" on child card
3. Modal opens
4. Select subject: "Mathematics"
5. Enter score: "85"
6. Select date: [current date]
7. Click "Guardar"

### Expected Results:
- ✅ Success toast: "Nota Guardada"
- ✅ Modal closes
- ✅ Grade appears in Report Card
- ✅ PACES projection updates if score >= 70

### Verification:
- Check student_grades table for new record
- student_id matches child
- score = 85
- subject = "Mathematics"

---

## Test 7: Parent Report Card View

### Steps:
1. Login as PARENT
2. Click "Ver Boletín" on child card
3. Modal opens showing grades table

### Expected Results:
- ✅ Modal displays: "Boletín de Calificaciones - [Child Name]"
- ✅ Table shows columns: Materia, Score, Tipo, Fecha
- ✅ Scores >= 70 display in green badge
- ✅ Scores < 70 display in red badge
- ✅ Subject type shows (Core/Electiva)
- ✅ Dates formatted correctly

### If No Grades:
- ✅ Shows: "No hay calificaciones registradas"

---

## Test 8: Role-Based Routing

### Test Each Role:

**SUPER_ADMIN:**
- Login → Redirects to /portal → AdminPanel displays
- Sidebar shows: Dashboard, Usuarios, Estudiantes, Hubs, PEI, Pagos, Configuración

**COORDINATOR:**
- Login → Redirects to /portal → CoordinatorPanel displays
- Only sees students from their hub

**PARENT:**
- Login → Redirects to /portal → ParentDashboard displays
- Only sees their own children

**TUTOR:**
- Login → Redirects to /portal → TutorDashboard displays
- Only sees assigned students

**STUDENT:**
- Login → Redirects to /portal → StudentDashboard displays
- Only sees own grades

### Console Verification:
For each login, console should show:
