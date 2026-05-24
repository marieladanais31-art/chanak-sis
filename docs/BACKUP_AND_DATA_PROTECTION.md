# Backup y Protección de Datos — Chanak SIS

**Versión:** 1.0  
**Fecha de creación:** 2026-05-24  
**Mantenedor:** Equipo Técnico Chanak Academy  
**Clasificación:** Interno — Uso Operativo

---

## 1. Resumen Ejecutivo

Este documento establece la estrategia de respaldo, recuperación y protección de datos del Sistema de Información Estudiantil (SIS) de Chanak Academy. Aplica a los Hubs de Jávea y Torrevieja, y cubre el ciclo completo de años académicos: **histórico (2024-2025)**, **activo (2025-2026)** y **futuro (2026-2027)**.

> **Principio rector:** Ninguna operación destructiva (`DROP TABLE`, `TRUNCATE`, `DELETE` masivo) se ejecuta sin respaldo verificado previo.

---

## 2. Arquitectura de Datos

### 2.1 Base de datos principal
| Componente        | Tecnología      | Responsable de backup |
|-------------------|-----------------|-----------------------|
| Base de datos     | Supabase (PostgreSQL 15) | Supabase Platform |
| Almacenamiento    | Supabase Storage (S3)    | Supabase Platform |
| Autenticación     | Supabase Auth            | Supabase Platform |
| Frontend          | Vite + React (static)    | Hostinger / CDN      |

### 2.2 Tablas críticas con datos irreemplazables

```
students                    — Directorio estudiantil
student_subjects            — Registro académico por materia
student_grades              — Notas individuales
student_grade_entries       — Entradas de notas desagregadas
pei_pace_projections        — Proyecciones PEI/PACEs
individualized_education_plans  — Planes educativos individualizados
transcript_records          — Boletines oficiales
transcript_courses          — Materias por boletín
enrollment_contracts        — Contratos de matrícula firmados
enrollment_letters          — Cartas de confirmación publicadas
student_payments            — Registro de pagos
enrollment_records          — Estado de matrícula por pipeline
academic_calendars          — Calendarios académicos
profiles                    — Perfiles de usuarios (padres, coordinadores, tutores)
```

---

## 3. Estrategia de Backup

### 3.1 Supabase Automatic Backups (tier Pro+)

Supabase realiza backups automáticos diarios con retención según el plan:

| Plan        | Retención | Point-in-Time Recovery |
|-------------|-----------|------------------------|
| Free        | 7 días    | No                     |
| Pro         | 7 días    | Sí (7 días)            |
| Team        | 14 días   | Sí (14 días)           |
| Enterprise  | 30 días   | Sí (30 días)           |

**Acción requerida:** Verificar el plan actual en https://supabase.com/dashboard → Settings → Billing y asegurar que sea al menos **Pro** antes del cierre del año escolar 2025-2026 (julio 2026).

### 3.2 Backup manual mensual (procedimiento)

Ejecutar el último fin de semana de cada mes:

```bash
# 1. Exportar schema + datos (desde Supabase Dashboard > Database > Backups)
#    O mediante CLI:
supabase db dump --project-ref <PROJECT_REF> -f backup_$(date +%Y%m%d).sql

# 2. Comprimir y almacenar
gzip backup_$(date +%Y%m%d).sql
# Subir a Google Drive: Chanak > IT > Backups > SIS > YYYY-MM/

# 3. Verificar integridad (count de filas clave)
# Ejecutar en Supabase SQL Editor:
SELECT 'students'  AS tabla, COUNT(*) FROM students
UNION ALL SELECT 'grades',  COUNT(*) FROM student_grades
UNION ALL SELECT 'pei_proj', COUNT(*) FROM pei_pace_projections
UNION ALL SELECT 'payments', COUNT(*) FROM student_payments;
```

### 3.3 Backup de archivos (Supabase Storage)

Los buckets `pei_files`, `evidence_files`, `contract_pdfs` deben respaldarse mensualmente:

```bash
# Usando Supabase CLI o script de descarga via API:
# GET /storage/v1/object/list/{bucket}
# Descargar cada objeto y comprimir en ZIP etiquetado por mes.
```

Destino: `Google Drive > Chanak > IT > Backups > Storage > YYYY-MM/`

---

## 4. Clasificación de Datos por Año Escolar

### 4.1 Año histórico: 2024-2025
- **Estado:** Cerrado. Solo lectura.
- **Acceso en SIS:** Sección "Historial Académico" en portal de padres; Admin puede consultar.
- **Política:** No modificar datos. Si se detecta error, documentar en `issues` del repositorio antes de cualquier corrección.
- **Archivo físico:** Boletines y contratos impresos en Hub correspondiente.

### 4.2 Año activo: 2025-2026
- **Estado:** En curso.
- **Operaciones permitidas:** CRUD completo bajo RLS vigente.
- **Backup obligatorio:** Antes de cualquier migración.

### 4.3 Año futuro: 2026-2027
- **Estado:** Pre-configuración disponible (calendarios, selectors).
- **Restricción:** No crear registros de alumnos, materias, pagos ni contratos hasta agosto 2026.
- **Activación:** Cambiar `ACTIVE_SCHOOL_YEAR` en `src/lib/academicUtils.js` al inicio del ciclo.

---

## 5. Procedimiento de Recuperación ante Desastres

### 5.1 Pérdida parcial de datos (filas eliminadas accidentalmente)

1. Acceder a Supabase Dashboard → Database → Backups.
2. Si hay PITR activo: usar "Restore to point in time" al momento anterior al incidente.
3. Si no hay PITR: restaurar desde el último backup `.sql` manual.
4. Validar con el conteo de filas del paso 3.2.

### 5.2 Corrupción de schema (migración fallida)

1. **No ejecutar más migraciones** hasta resolver.
2. Revisar logs en Supabase Dashboard → Database → Logs.
3. Si la migración es idempotente (`IF NOT EXISTS`, `IF EXISTS`), re-ejecutarla.
4. Si no: restaurar desde backup y re-aplicar migraciones una por una.

### 5.3 Pérdida total (incident Supabase)

1. Contactar soporte Supabase (support@supabase.io) con el `project-ref`.
2. Si hay backup local `.sql.gz`: crear nuevo proyecto Supabase y restaurar.
3. Actualizar `.env` / variables de entorno con nuevo `SUPABASE_URL` y `SUPABASE_ANON_KEY`.
4. Re-desplegar frontend en Hostinger.

---

## 6. Protección de Información Personal (PII)

Chanak SIS almacena datos de menores de edad sujetos al RGPD (UE) y COPPA (EE. UU.).

### 6.1 Principios
- **Minimización:** Solo recopilar datos necesarios para la función académica.
- **Acceso por rol:** RLS en Supabase garantiza que cada usuario solo ve sus propios datos.
- **No exposición:** Nunca incluir nombres, IDs ni datos de alumnos en logs de consola, reportes de error enviados a terceros, o en este repositorio.

### 6.2 Reglas de código
```js
// ✅ Correcto — usar student_id (UUID)
console.error('Grade save failed for student_id:', studentId);

// ❌ Incorrecto — exponer nombre
console.error('Grade save failed for', student.first_name, student.last_name);
```

### 6.3 Retención y eliminación
| Tipo de dato          | Retención | Proceso de baja |
|-----------------------|-----------|-----------------|
| Expediente académico  | 10 años   | Solicitud formal escrita al director |
| Datos de pago         | 7 años    | Obligación fiscal |
| Contratos firmados    | 5 años    | Archivo físico + digital |
| Fotos / archivos PEI  | Ciclo + 3 años | Eliminación desde Supabase Storage |

---

## 7. Checklist de Cierre de Año Escolar

Ejecutar en julio de cada año (antes del 31 de julio):

- [ ] Publicar todos los boletines Q3 pendientes
- [ ] Exportar backup completo de la base de datos (`.sql.gz`)
- [ ] Exportar backup de Supabase Storage (archivos PEI, evidencias)
- [ ] Subir ambos backups a Google Drive `IT/Backups/SIS/YYYY-YYYY/`
- [ ] Verificar que `pei_pace_projections` tiene `status = 'evaluated'` para PACEs cerrados
- [ ] Verificar que `enrollment_records` tiene `status = 'active'` para todos los alumnos del año
- [ ] Actualizar `ACTIVE_SCHOOL_YEAR` en `src/lib/academicUtils.js` al nuevo año
- [ ] Crear el calendario académico del nuevo año en `AcademicCalendarManager`
- [ ] Notificar a coordinadores el cambio de año activo

---

## 8. Contactos de Emergencia

| Rol                    | Responsabilidad                        |
|------------------------|----------------------------------------|
| Director Académico     | Autorizar restauración de datos        |
| Coordinador IT Chanak  | Ejecutar backup/restauración           |
| Soporte Supabase       | support@supabase.io / Dashboard chat   |
| Soporte Hostinger      | Panel de hosting / chat en vivo        |

---

## 9. Historial de Cambios

| Fecha      | Versión | Cambio                        | Autor         |
|------------|---------|-------------------------------|---------------|
| 2026-05-24 | 1.0     | Creación inicial del documento | Equipo Técnico |

---

*Este documento debe revisarse al inicio de cada año escolar y actualizarse con cualquier cambio en la infraestructura o normativa aplicable.*
