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
