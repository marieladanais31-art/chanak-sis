
# Supabase Authentication Setup & Configuration Guide

This document outlines the required configuration settings for Supabase Authentication to work flawlessly across development and production environments.

## 1. URL Configuration (Authentication -> URL Configuration)

**Site URL:**
- `https://sis.chanakacademy.org`

**Redirect URLs:**
Add all allowable callback URLs so Supabase knows where to redirect users after email confirmations or password resets.
- `http://localhost:5173/auth/callback` (Local Development)
- `http://localhost:3000/auth/callback` (Alternative Local)
- `https://sis.chanakacademy.org/auth/callback` (Production)
- `https://*.chanakacademy.org/**` (Wildcard for subdomains)

## 2. Email Provider Settings (Authentication -> Providers -> Email)

Ensure the **Email** provider is Enabled.
- **Confirm email:** ENABLED (Users must click a link in their email to verify before logging in).
- **Secure password reset:** ENABLED (Prevents automated reuse of reset links).
- Minimum Password Length: Set to 8.

## 3. Email Templates (Authentication -> Email Templates)

It is **CRITICAL** that your email templates pass the exact URL containing the auth token to the frontend.

### Confirm Signup Template
