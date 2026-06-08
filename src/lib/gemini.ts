// Client-side AI helpers. These NO LONGER hold or call the Gemini key
// directly — that key lives only on the server (see api/ai.ts). Each function
// posts to the `/api/ai` proxy with the user's Supabase access token; the
// server verifies the session + entitlement before spending any AI budget.
//
// Summary/project generation keep a local, AI-free fallback so users without
// AI access still get a usable first draft offline.

import { ResumeData } from '../types';
import { supabase } from './supabaseClient';

function localSummary(jobTitle: string, skills: string[], experience: any[]) {
  const topSkills = skills.filter(Boolean).slice(0, 5).join(', ');
  const latestRole = experience?.[0]?.role ? `${experience[0].role}${experience[0].company ? ` at ${experience[0].company}` : ''}` : jobTitle;
  return `${jobTitle || 'Professional'} with experience as ${latestRole}. Skilled in ${topSkills || 'cross-functional collaboration, problem solving, and delivery'}. Focused on measurable outcomes, clear communication, and building reliable solutions.`;
}

function localProjectDescription(name: string, tech: string[]) {
  const stack = tech.filter(Boolean).join(', ');
  return `Built ${name || 'a project'}${stack ? ` using ${stack}` : ''}, focusing on practical user workflows, maintainable implementation, and reliable delivery.`;
}

function mergeResumeData(base: ResumeData, parsed: Partial<ResumeData>): ResumeData {
  return {
    ...base,
    ...parsed,
    personalInfo: {
      ...base.personalInfo,
      ...(parsed.personalInfo || {}),
    },
    experience: parsed.experience || base.experience || [],
    education: parsed.education || base.education || [],
    skills: parsed.skills || base.skills || [],
    projects: parsed.projects || base.projects || [],
    theme: {
      ...base.theme,
      ...(parsed.theme || {}),
    },
    showQrCode: parsed.showQrCode ?? base.showQrCode,
    qrCodeLink: parsed.qrCodeLink ?? base.qrCodeLink,
  };
}

/** POST to the server AI proxy with the current user's access token. */
async function callAi<T>(op: string, payload: Record<string, unknown>): Promise<T> {
  const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
  const token = data.session?.access_token;
  if (!token) {
    throw new Error('Please sign in to use AI features.');
  }

  const response = await fetch('/api/ai', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ op, ...payload }),
  });

  let body: any = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    throw new Error(body?.error || 'The AI request failed. Please try again.');
  }
  return body as T;
}

export async function generateSummaryAI(jobTitle: string, skills: string[], experience: any[]) {
  try {
    const { text } = await callAi<{ text: string }>('summary', { jobTitle, skills, experience });
    return text || localSummary(jobTitle, skills, experience);
  } catch (error) {
    // If AI is unavailable (no access, offline), fall back to a local draft
    // rather than leaving the field empty.
    if (error instanceof Error && /sign in/i.test(error.message)) throw error;
    return localSummary(jobTitle, skills, experience);
  }
}

export async function generateProjectDescriptionAI(name: string, tech: string[]) {
  try {
    const { text } = await callAi<{ text: string }>('project', { name, technologies: tech });
    return text || localProjectDescription(name, tech);
  } catch (error) {
    if (error instanceof Error && /sign in/i.test(error.message)) throw error;
    return localProjectDescription(name, tech);
  }
}

export async function parseDocumentAI(
  currentData: ResumeData,
  files?: { base64: string; mimeType: string }[],
  url?: string,
): Promise<ResumeData> {
  const { resume } = await callAi<{ resume: Partial<ResumeData> }>('parse', {
    currentData,
    files: files || [],
    url,
  });
  return mergeResumeData(currentData, resume || {});
}

export async function tailorResumeAI(
  currentData: ResumeData,
  jobDescription: string,
  jobUrl?: string,
): Promise<{ updatedResume: ResumeData; atsScore: number }> {
  const { resume, atsScore } = await callAi<{ resume: Partial<ResumeData>; atsScore: number }>('tailor', {
    currentData,
    jobDescription,
    jobUrl,
  });
  return {
    updatedResume: mergeResumeData(currentData, resume || {}),
    atsScore: atsScore || 0,
  };
}
