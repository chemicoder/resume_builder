import { GoogleGenAI, Type } from '@google/genai';
import { ResumeData } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateSummaryAI(jobTitle: string, skills: string[], experience: any[]) {
  const prompt = `Write a professional resume summary for a ${jobTitle}. Skills: ${skills.join(', ')}. Experience highlights: ${experience.map(e => e.role + ' at ' + e.company).join(', ')}. Keep it concise, impactful, and under 4 sentences.`;
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
  });
  return response.text;
}

export async function generateProjectDescriptionAI(name: string, tech: string[]) {
  const prompt = `Write a professional resume project description for a project named "${name}" using technologies: ${tech.join(', ')}. Keep it concise, action-oriented, and under 3 sentences.`;
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
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
    model: 'gemini-3-flash-preview',
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
