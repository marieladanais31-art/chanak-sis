
# User Creation Guide - Chanak International Academy

## Overview
User creation in the Chanak International Academy system involves up to four interconnected tables to ensure proper authentication, authorization, and data relationships. Understanding this flow is critical for system administrators and developers.

The core tables involved are:
1. `auth.users` (Supabase system table - handles login/passwords)
2. `public.profiles` (Extended user data and role assignment)
3. `public.students` (Specific academic data for student users)
4. `public.family_students` (Relationship mapping between parents and students)

---

## User Types & Creation Flow

### 1. PARENT User Creation

**Step 1: Create Auth User**
Create the user in the Supabase Authentication console using their email and a secure password. This generates the unique `user_id` (UUID).

**Step 2: Create Profile**
Insert a record into the `profiles` table to assign the `parent` role.

