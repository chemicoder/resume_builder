<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Resume Builder

This app lets users build a resume from a live form, preview multiple templates, share the resume with a link/QR code, and download the finished resume as PDF or editable Word `.docx`.

View your app in AI Studio: https://ai.studio/apps/0e65d7ef-be00-4100-9946-c019b78b1c2b

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies:
   `npm install`
2. Optional: set `VITE_GEMINI_API_KEY` in `.env.local` to enable Gemini AI document import, ATS tailoring, and writing suggestions. Basic resume editing plus PDF/DOCX downloads work without an API key.
3. Run the app:
   `npm run dev`

## Downloads

- PDF export uses the selected visual template.
- DOCX export creates an editable Word document from the resume data.

## Analytics And Sharing

Traffic, exports, AI usage, and share links are recorded through Vercel API routes into Supabase.

1. Run `supabase/resume_builder_analytics.sql` in the Supabase SQL editor.
2. Set these Vercel env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VITE_SUPABASE_URL`, and `VITE_SUPABASE_ANON_KEY`.
3. Check Supabase tables/views:
   - `rb_visitors`
   - `rb_events`
   - `rb_shared_resumes`
   - `rb_daily_stats`
   - `rb_event_summary`
   - `rb_template_summary`

## Supabase Login

The login screen supports three paths:

- Email/password account creation and sign-in.
- Email magic links as a fallback.
- Guest mode, which opens the editor immediately and saves the draft in the current browser.

Password account creation uses the `/api/auth` Vercel Function to create a confirmed Supabase Auth user with the server-side service-role key, then the browser signs in with email/password. This avoids blocking users on verification emails.

Required environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

For magic links and password reset emails, Supabase still needs the correct Authentication URL Configuration:

- Site URL: `https://resume-builder-softbranes-projects.vercel.app`
- Redirect URLs: `https://resume-builder-softbranes-projects.vercel.app/**`

After changing these settings, discard old email links and request a new login link.

In Supabase Authentication, keep the Email provider enabled with password sign-ins enabled. Guest mode does not require Supabase anonymous auth; if anonymous sign-ins are enabled, the app will use them, otherwise it falls back to local guest access.

Anonymous sign-in is disabled in the frontend unless `VITE_ENABLE_ANONYMOUS_AUTH=true` is set. Before enabling it:

1. Run `supabase/harden_anonymous_auth.sql` in the Supabase SQL editor.
2. Enable Anonymous sign-ins in Supabase Authentication.
3. Set `VITE_ENABLE_ANONYMOUS_AUTH=true` in Vercel.
