# CHANAK SIS - SYSTEM INSTRUCTIONS

## SYSTEM OVERVIEW
This is a School Information System (SIS) for Chanak International Academy.

It supports:
- Homeschool (Off Campus)
- Dual Diploma
- Hub-based learning centers

Roles:
- super_admin
- coordinator
- parent
- student

---

## CORE PRINCIPLES

1. ALL academic data MUST come from:
   public.student_subjects

2. DO NOT use hardcoded subject lists

3. Subjects are created per student (dynamic system)

4. A subject can have MULTIPLE grades per quarter

---

## GRADING SYSTEM (CRITICAL)

- A subject can have MANY grades (not just one)
- Grades are stored as individual records
- The system MUST calculate:

    FINAL GRADE = AVERAGE(all grades for that subject, quarter, year)

---

## RULES BY CATEGORY

CORE (ACE):
- Can have unlimited grades
- Final grade = average
- Uses percentage (0–100)

LOCAL SUBJECTS:
- Same logic (average of all grades)

LIFE SKILLS:
- Can show:
  - average
  OR
  - "In Progress"

---

## DATA FILTERING

Every query MUST filter by:

- student_id
- school_year
- quarter

Example:
Q1, Q2, Q3, Q4

---

## PARENT DASHBOARD RULES

- Parents ONLY see their children
- Subjects MUST come ONLY from:
  student_subjects

- NO duplicates
- NO fallback subjects
- NO mixing names like:
  "W.B." and "Word Building"

---

## ADMIN / COORDINATOR RULES

- Can create subjects per student
- Can add multiple grades
- Can update status (approved, pending)

---

## DATABASE EXPECTATION

Table: student_subjects

Fields used:
- id
- student_id
- subject_name
- academic_block
- pillar_type
- grade
- quarter
- school_year
- approval_status
- credit_value

---

## IMPORTANT

This system MUST behave like a real academic system:

- No fake data
- No duplicated subjects
- No hardcoded arrays
- Everything comes from database

---

## PRIORITY TASKS

1. Fix Parent Dashboard subjects
2. Implement multiple grades per subject
3. Calculate averages correctly
4. Clean subject naming consistency
5. Ensure Admin / Parent sync
Add AGENTS.md system instructions
