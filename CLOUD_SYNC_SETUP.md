# Powerbuild cloud sync setup

## 1. Create the table and secure save function
In your Supabase project, open SQL Editor > New query. Paste and run
the contents of supabase/migrations/20261029_cloud_sync.sql.
It enables row-level security so a signed-in user can only access their own state.

## 2. Configure Vercel
In Vercel > powerbuild-flexible-goals > Settings > Environment Variables,
add for Production and Preview:
- VITE_SUPABASE_URL: the project URL from Supabase dashboard.
- VITE_SUPABASE_PUBLISHABLE_KEY: the publishable key from
  Supabase > Project Settings > API Keys.

Never put a secret/service_role key into a VITE_ variable: Vite exposes
these values in the browser. Redeploy after adding environment variables.

## 3. Authentication
Supabase > Authentication > Providers > Email: enable Email.
If email confirmation is enabled, confirm the signup email before login.
Supabase > Authentication > URL Configuration: set Site URL to the
production Powerbuild URL. Add the preview origin to Redirect URLs if
using email links on preview deployments.

## 4. Migrate your existing Mac data without losing it
1. On the Mac browser that has your existing workout history, export
   a JSON backup from Settings & backup before proceeding.
2. Sign in (or create an account) in the Cloud Sync sidebar.
3. If the cloud is empty, click Upload this device. Wait for
   Cloud sync active.
4. Open the same Powerbuild site on your phone. Sign in with the same
   email and password. Click Use cloud data when asked.
5. Verify a session, weight, and calorie entry on both devices.

The app continues to save locally and retries failed cloud uploads.
When simultaneous changes conflict, it asks you to choose the version.
It does not merge two conflicting copies automatically. Keep backups.
Signing out does not erase the device's local browser cache.
