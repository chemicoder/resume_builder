import { GoogleGenAI, Type } from '@google/genai';
import { ResumeData } from '../types';

const viteEnv = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
const geminiApiKey = viteEnv?.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;

function getAiClient() {
  if (!geminiApiKey) {
    throw new Error('Gemini API key is not configured. Add VITE_GEMINI_API_KEY to .env.local to enable AI features.');
  }

  return new GoogleGenAI({ apiKey: geminiApiKey });
}

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

export async function generateSummaryAI(jobTitle: string, skills: string[], experience: any[]) {
  if (!geminiApiKey) {
    return localSummary(jobTitle, skills, experience);
  }

  const prompt = `Write a professional resume summary for a ${jobTitle}. Skills: ${skills.join(', ')}. Experience highlights: ${experience.map(e => e.role + ' at ' + e.company).join(', ')}. Keep it concise, impactful, and under 4 sentences.`;
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });
  return response.text;
}

export async function generateProjectDescriptionAI(name: string, tech: string[]) {
  if (!geminiApiKey) {
    return localProjectDescription(name, tech);
  }

  const prompt = `Write a professional resume project description for a project named "${name}" using technologies: ${tech.join(', ')}. Keep it concise, action-oriented, and under 3 sentences.`;
  const ai = getAiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });
  return response.text;
}

export async function parseDocumentAI(currentData: ResumeData, files?: { base64: string, mimeType: string }[], url?: string): Promise<ResumeData> {
  const ai = getAiClient();
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
  
  if (files && files.length > 0) {
    files.forEach(file => {
      parts.push({
        inlineData: {
          data: file.base64,
          mimeType: file.mimeType,
        }
      });
    });
  }
  if (url) {
    parts.push({ text: `Extract information from this link: ${url}. If it is a LinkedIn profile or similar, please use Google Search to find the person's public profile details, work experience, education, and skills.` });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: { parts },
    config: {
      tools: url ? [{ googleSearch: {} }] : undefined,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          personalInfo: {
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
              github: { type: Type.STRING }
            }
          },
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
                description: { type: Type.STRING }
              }
            }
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
                description: { type: Type.STRING }
              }
            }
          },
          skills: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          projects: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                link: { type: Type.STRING },
                technologies: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    }
  });
  
  try {
    const parsed = JSON.parse(response.text || "{}") as Partial<ResumeData>;
    return mergeResumeData(currentData, parsed);
  } catch (e) {
    console.error("Failed to parse AI response as JSON", e);
    console.log("Raw response:", response.text);
    throw new Error("Failed to parse AI response. The document might be too large or complex.");
  }
}

export async function tailorResumeAI(currentData: ResumeData, jobDescription: string, jobUrl?: string): Promise<{ updatedResume: ResumeData, atsScore: number }> {
  const ai = getAiClient();
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

  const parts: any[] = [{ text: prompt }];

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: { parts },
    config: {
      tools: jobUrl ? [{ googleSearch: {} }] : undefined,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          atsScore: { type: Type.NUMBER, description: "ATS match score from 0 to 100" },
          updatedResume: {
            type: Type.OBJECT,
            properties: {
              personalInfo: {
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
                  github: { type: Type.STRING }
                }
              },
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
                    description: { type: Type.STRING }
                  }
                }
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
                    description: { type: Type.STRING }
                  }
                }
              },
              skills: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              },
              projects: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    name: { type: Type.STRING },
                    description: { type: Type.STRING },
                    link: { type: Type.STRING },
                    technologies: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING }
                    }
                  }
                }
              }
            }
          }
        },
        required: ["atsScore", "updatedResume"]
      }
    }
  });
  
  try {
    const result = JSON.parse(response.text || "{}");
    const parsedResume = result.updatedResume || {};
    return {
      updatedResume: mergeResumeData(currentData, parsedResume),
      atsScore: result.atsScore || 0
    };
  } catch (e) {
    console.error("Failed to parse AI response as JSON", e);
    throw new Error("Failed to tailor resume.");
  }
}
