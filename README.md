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

## Supabase Email Login

Email login uses Supabase magic links. In Supabase Authentication URL Configuration, set:

- Site URL: `https://resume-builder-softbranes-projects.vercel.app`
- Redirect URLs: `https://resume-builder-softbranes-projects.vercel.app/**`

After changing these settings, discard old email links and request a new login link.

The login screen also supports email/password sign-in, which avoids magic-link rate limits after the account exists. For password-only account creation without confirmation email, disable email confirmations in Supabase Authentication.

- Email provider with password sign-ins enabled

Anonymous sign-in is disabled in the frontend unless `VITE_ENABLE_ANONYMOUS_AUTH=true` is set. Before enabling it:

1. Run `supabase/harden_anonymous_auth.sql` in the Supabase SQL editor.
2. Enable Anonymous sign-ins in Supabase Authentication.
3. Set `VITE_ENABLE_ANONYMOUS_AUTH=true` in Vercel.
