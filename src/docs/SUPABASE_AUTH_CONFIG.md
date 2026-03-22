# Supabase Authentication Configuration Guide

## 1. Production Setup (Required)

Before deploying to production, you MUST configure the Authentication settings in your Supabase Project Dashboard.

### Site URL
1. Go to **Authentication > URL Configuration**.
2. Set **Site URL** to your production domain:
   `https://sis.chanakacademy.org`

### Redirect URLs
Add the following to **Redirect URLs**:
- `https://sis.chanakacademy.org/`
- `https://sis.chanakacademy.org/admin/dashboard`
- `https://sis.chanakacademy.org/auth/callback` (if using callback route)

**Note:** If you are testing locally, ensure `http://localhost:3000` is also in the list, but strictly avoid using localhost in production builds.

## 2. Environment Variables

Your `.env` or Vercel/Netlify environment variables must follow this format: