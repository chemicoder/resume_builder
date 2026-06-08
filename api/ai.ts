// Server-side AI proxy. The Gemini API key lives ONLY here (never shipped to
// the browser), and every request is gated on a verified Supabase session +
// an `entitlements` row granting `ai_access`. This is the security boundary
// that the client-side entitlement check (src/lib/entitlements.ts) cannot be:
// the browser check is UX only; this is what actually protects the key and
// the paid feature.
//
// Operations (POST body `{ op, ... }`):
//   - summary  : { jobTitle, skills[], experience[] } -> { text }
//   - project  : { name, technologies[] }             -> { text }
//   - parse    : { currentData, files[], url? }        -> { resume }
//   - tailor   : { currentData, jobDescription, jobUrl? } -> { resume, atsScore }

import { GoogleGenAI, Type } from '@google/genai';
import { allowCors, getRequestBody } from './_supabase';

export const config = {
  runtime: 'nodejs',
};

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const anonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Emails that always get AI access, regardless of the entitlements table.
// Mirrors VITE_AI_ALLOW_EMAILS but resolved server-side so it cannot be spoofed.
const allowEmails = new Set(
  (process.env.AI_ALLOW_EMAILS || process.env.VITE_AI_ALLOW_EMAILS || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
);

// Reject obviously oversized AI payloads early (base64 files, giant JSON).
const MAX_BODY_BYTES = 12 * 1024 * 1024; // 12 MB

interface AuthedUser {
  id: string;
  email?: string;
}

/** Verify the bearer token against Supabase Auth and return the user. */
async function getUser(request: any): Promise<AuthedUser | null> {
  const header = String(request.headers['authorization'] || request.headers['Authorization'] || '');
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token || !supabaseUrl || !anonKey) return null;

  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    const user = (await response.json()) as { id?: string; email?: string };
    return user?.id ? { id: user.id, email: user.email } : null;
  } catch {
    return null;
  }
}

/** Read the user's entitlement row with the service-role key (bypasses RLS). */
async function hasAiAccess(user: AuthedUser): Promise<boolean> {
  if (user.email && allowEmails.has(user.email.toLowerCase())) return true;
  if (!supabaseUrl || !serviceRoleKey) return false;

  try {
    const response = await fetch(
      `${supabaseUrl}/rest/v1/entitlements?user_id=eq.${encodeURIComponent(user.id)}&select=ai_access`,
      { headers: { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` } },
    );
    if (!response.ok) return false;
    const rows = (await response.json()) as Array<{ ai_access?: boolean }>;
    return Boolean(rows?.[0]?.ai_access);
  } catch {
    return false;
  }
}

const personalInfoSchema = {
  type: Type.OBJECT,
  properties: {
    fullName: { type: Type.STRING },
    jobTitle: { type: Type.STRING },
    email: { type: Type.STRING },
    phone: { type: Type.STRING },
    location: { type: Type.STRING },
    summary: { type: Type.STRING },
    website: { type: Type.STRING },
    linkedin: { type: Type.STRING },
    github: { type: Type.STRING },
  },
};

const resumeSchema = {
  type: Type.OBJECT,
  properties: {
    personalInfo: personalInfoSchema,
    experience: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          company: { type: Type.STRING },
          role: { type: Type.STRING },
          startDate: { type: Type.STRING },
          endDate: { type: Type.STRING },
          description: { type: Type.STRING },
        },
      },
    },
    education: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          institution: { type: Type.STRING },
          degree: { type: Type.STRING },
          startDate: { type: Type.STRING },
          endDate: { type: Type.STRING },
          description: { type: Type.STRING },
        },
      },
    },
    skills: { type: Type.ARRAY, items: { type: Type.STRING } },
    projects: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          name: { type: Type.STRING },
          description: { type: Type.STRING },
          link: { type: Type.STRING },
          technologies: { type: Type.ARRAY, items: { type: Type.STRING } },
        },
      },
    },
  },
};

function ai() {
  return new GoogleGenAI({ apiKey: GEMINI_API_KEY });
}

async function runSummary(body: any) {
  const jobTitle = String(body.jobTitle || '');
  const skills: string[] = Array.isArray(body.skills) ? body.skills.map(String) : [];
  const experience: any[] = Array.isArray(body.experience) ? body.experience : [];
  const prompt = `Write a professional resume summary for a ${jobTitle}. Skills: ${skills.join(', ')}. Experience highlights: ${experience
    .map((e) => `${e.role} at ${e.company}`)
    .join(', ')}. Keep it concise, impactful, and under 4 sentences.`;
  const response = await ai().models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
  return { text: response.text || '' };
}

async function runProject(body: any) {
  const name = String(body.name || '');
  const tech: string[] = Array.isArray(body.technologies) ? body.technologies.map(String) : [];
  const prompt = `Write a professional resume project description for a project named "${name}" using technologies: ${tech.join(', ')}. Keep it concise, action-oriented, and under 3 sentences.`;
  const response = await ai().models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
  return { text: response.text || '' };
}

async function runParse(body: any) {
  const currentData = body.currentData || {};
  const files: Array<{ base64: string; mimeType: string }> = Array.isArray(body.files) ? body.files : [];
  const url: string | undefined = body.url ? String(body.url) : undefined;

  const dataForPrompt = { ...currentData };
  if (dataForPrompt.personalInfo) {
    dataForPrompt.personalInfo = { ...dataForPrompt.personalInfo };
    delete dataForPrompt.personalInfo.profilePicture;
  }

  const prompt = `You are an AI assistant that extracts information from various documents (resumes, degrees, transcripts, certificates, job letters, passports, etc.) or web profiles to build a comprehensive resume/portfolio profile.

Here is the user's current profile data in JSON format:
${JSON.stringify(dataForPrompt)}

Extract any relevant new information from the provided document(s)/link and return a COMPLETE, UPDATED structured JSON object.
- If the document contains new experience, education, skills, or projects, APPEND them to the existing arrays.
- If the document contains personal information that is currently missing or more accurate, UPDATE those fields.
- DO NOT remove existing information unless it is clearly contradicted and superseded by the new document.
- Generate unique string IDs for any new array items.
- Return the complete, updated structured JSON object matching the schema.`;

  const parts: any[] = [{ text: prompt }];
  files.forEach((file) => {
    if (file?.base64 && file?.mimeType) {
      parts.push({ inlineData: { data: file.base64, mimeType: file.mimeType } });
    }
  });
  if (url) {
    parts.push({
      text: `Extract information from this link: ${url}. If it is a LinkedIn profile or similar, please use Google Search to find the person's public profile details, work experience, education, and skills.`,
    });
  }

  const response = await ai().models.generateContent({
    model: 'gemini-2.5-pro',
    contents: { parts },
    config: {
      tools: url ? [{ googleSearch: {} }] : undefined,
      responseMimeType: 'application/json',
      responseSchema: resumeSchema,
    },
  });

  return { resume: JSON.parse(response.text || '{}') };
}

async function runTailor(body: any) {
  const currentData = body.currentData || {};
  const jobDescription = String(body.jobDescription || '');
  const jobUrl: string | undefined = body.jobUrl ? String(body.jobUrl) : undefined;

  const dataForPrompt = { ...currentData };
  if (dataForPrompt.personalInfo) {
    dataForPrompt.personalInfo = { ...dataForPrompt.personalInfo };
    delete dataForPrompt.personalInfo.profilePicture;
  }

  const prompt = `You are an expert ATS (Applicant Tracking System) optimizer and resume writer.

Here is the user's current resume data in JSON format:
${JSON.stringify(dataForPrompt)}

Here is the target job description:
${jobDescription}

${jobUrl ? `Target job URL: ${jobUrl}` : ''}

Your task:
1. Analyze the resume against the job description.
2. Calculate an ATS match score from 0 to 100 based on keyword match, skills, and experience alignment.
3. Tailor the resume to better match the job description:
   - Rewrite the 'summary' to align perfectly with the role.
   - Slightly tweak experience and project descriptions to highlight relevant skills and keywords (DO NOT invent new experience or lie).
   - Reorder or emphasize skills if necessary.
4. Return a JSON object containing the 'updatedResume' (matching the provided schema) and the 'atsScore'.`;

  const response = await ai().models.generateContent({
    model: 'gemini-2.5-pro',
    contents: { parts: [{ text: prompt }] },
    config: {
      tools: jobUrl ? [{ googleSearch: {} }] : undefined,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          atsScore: { type: Type.NUMBER, description: 'ATS match score from 0 to 100' },
          updatedResume: resumeSchema,
        },
        required: ['atsScore', 'updatedResume'],
      },
    },
  });

  const result = JSON.parse(response.text || '{}');
  return { resume: result.updatedResume || {}, atsScore: Number(result.atsScore) || 0 };
}

export default async function handler(request: any, response: any) {
  allowCors(response);

  if (request.method === 'OPTIONS') {
    response.status(204).end();
    return;
  }
  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!GEMINI_API_KEY) {
    response.status(503).json({ error: 'AI is not configured on the server.' });
    return;
  }

  const contentLength = Number(request.headers['content-length'] || 0);
  if (contentLength && contentLength > MAX_BODY_BYTES) {
    response.status(413).json({ error: 'Upload is too large for AI processing.' });
    return;
  }

  const user = await getUser(request);
  if (!user) {
    response.status(401).json({ error: 'Sign in to use AI features.' });
    return;
  }
  if (!(await hasAiAccess(user))) {
    response.status(403).json({ error: 'AI features are not enabled on your account.' });
    return;
  }

  let body: any;
  try {
    body = await getRequestBody(request);
  } catch {
    response.status(400).json({ error: 'Invalid request body.' });
    return;
  }

  const op = String(body.op || '');
  try {
    let result: unknown;
    switch (op) {
      case 'summary':
        result = await runSummary(body);
        break;
      case 'project':
        result = await runProject(body);
        break;
      case 'parse':
        result = await runParse(body);
        break;
      case 'tailor':
        result = await runTailor(body);
        break;
      default:
        response.status(400).json({ error: 'Unknown AI operation.' });
        return;
    }
    response.status(200).json(result);
  } catch (error) {
    console.error('ai error', op, error);
    response.status(502).json({
      error: 'The AI request failed. Please try again.',
      detail: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
