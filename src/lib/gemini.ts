import { GoogleGenAI, Type } from '@google/genai';
import { ResumeData } from '../types';

export interface ATSScoreResult {
  overall: number;
  breakdown: {
    completeness: number;
    keywords: number;
    summary: number;
    experience: number;
    formatting: number;
  };
  suggestions: string[];
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateSummaryAI(jobTitle: string, skills: string[], experience: any[]) {
  const prompt = `Write a professional resume summary for a ${jobTitle}. Skills: ${skills.join(', ')}. Experience highlights: ${experience.map(e => e.role + ' at ' + e.company).join(', ')}. Keep it concise, impactful, and under 4 sentences.`;
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
  });
  return response.text;
}

export async function generateProjectDescriptionAI(name: string, tech: string[]) {
  const prompt = `Write a professional resume project description for a project named "${name}" using technologies: ${tech.join(', ')}. Keep it concise, action-oriented, and under 3 sentences.`;
  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
  });
  return response.text;
}

export async function parseDocumentAI(currentData: ResumeData, files?: { base64: string, mimeType: string }[], url?: string): Promise<ResumeData> {
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
    parts.push({ text: `Extract information from this link: ${url}` });
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
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
    return JSON.parse(response.text || "{}") as ResumeData;
  } catch (e) {
    console.error("Failed to parse AI response as JSON", e);
    console.log("Raw response:", response.text);
    throw new Error("Failed to parse AI response. The document might be too large or complex.");
  }
}

export async function calculateATSScore(data: ResumeData, jobDescription?: string): Promise<ATSScoreResult> {
  const dataForPrompt = { ...data };
  if (dataForPrompt.personalInfo) {
    dataForPrompt.personalInfo = { ...dataForPrompt.personalInfo };
    delete dataForPrompt.personalInfo.profilePicture;
  }

  const prompt = `You are an ATS (Applicant Tracking System) expert. Analyze this resume and provide a detailed ATS compatibility score.

Resume Data:
${JSON.stringify(dataForPrompt, null, 2)}

${jobDescription ? `Target Job Description:\n${jobDescription}` : ''}

Score the resume on these criteria (0-100 each):
1. completeness: Are all key sections filled? (name, email, phone, location, summary, skills, experience with descriptions, education)
2. keywords: ${jobDescription ? 'How well do the resume keywords and skills match the job description keywords?' : 'Use of industry-standard action verbs, measurable achievements, and relevant keywords'}
3. summary: Quality, relevance, and impact of the professional summary
4. experience: Clarity, detail, and use of action verbs in work experience descriptions
5. formatting: Structure suitability for ATS parsing (consistent date formats, clear section separation, no tables/columns that confuse ATS)

Calculate the overall score as a weighted average: completeness 20%, keywords 30%, summary 20%, experience 20%, formatting 10%.

Also provide 3-5 specific, actionable improvement suggestions targeting the weakest areas.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          overall: { type: Type.NUMBER },
          breakdown: {
            type: Type.OBJECT,
            properties: {
              completeness: { type: Type.NUMBER },
              keywords: { type: Type.NUMBER },
              summary: { type: Type.NUMBER },
              experience: { type: Type.NUMBER },
              formatting: { type: Type.NUMBER },
            }
          },
          suggestions: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          }
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}") as ATSScoreResult;
  } catch (e) {
    console.error("Failed to parse ATS score response", e);
    throw new Error("Failed to calculate ATS score.");
  }
}

export async function alignResumeToJob(
  data: ResumeData,
  jobDescription: string
): Promise<{ summary: string; experience: { id: string; description: string }[] }> {
  const dataForPrompt = { ...data };
  if (dataForPrompt.personalInfo) {
    dataForPrompt.personalInfo = { ...dataForPrompt.personalInfo };
    delete dataForPrompt.personalInfo.profilePicture;
  }

  const prompt = `You are a professional resume writer and career coach. Optimize the resume below to align with the provided job description for better ATS scoring and recruiter appeal.

Current Resume Data:
${JSON.stringify(dataForPrompt, null, 2)}

Target Job Description:
${jobDescription}

Tasks:
1. Rewrite the professional summary to directly address the job requirements, highlight relevant skills and experience, and incorporate keywords from the job description. Keep it concise and under 4 sentences.
2. For each work experience entry, enhance the description to better highlight skills and responsibilities relevant to this specific job. Use action verbs and quantify impact where possible. Do NOT fabricate or exaggerate experience — only reframe existing facts.

Return a JSON object with the updated summary and the updated experience descriptions (keyed by their original IDs).`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.0-flash',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          experience: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.STRING },
                description: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse align-to-job response", e);
    throw new Error("Failed to align resume to job description.");
  }
}
