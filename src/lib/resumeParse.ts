// Local, AI-free resume autofill. Pulls plain text out of a PDF or DOCX
// using `pdfjs-dist` / `mammoth`, then applies heuristics to find the
// candidate's name, contact info, and section blocks (summary, experience,
// education, skills, projects). It will not match an AI-grade parser for
// nuanced fields, but it gives a solid first pass that the user then edits.
//
// Scope: this runs only on resume-shaped files (PDF / DOCX). Other formats
// (images, certificates, transcripts) require AI extraction and are not
// supported here — the caller is responsible for that gating.

import * as mammoth from 'mammoth';
import { ResumeData, Experience, Education, Project } from '../types';

/**
 * Extract plain text out of the file using the appropriate library. The
 * caller has already verified the file is PDF or DOCX.
 */
async function extractText(file: File): Promise<string> {
  const lowerName = file.name.toLowerCase();
  if (file.type === 'application/pdf' || lowerName.endsWith('.pdf')) {
    return extractPdfText(file);
  }
  if (
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lowerName.endsWith('.docx')
  ) {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value || '';
  }
  throw new Error('Free import supports PDF or DOCX resumes only.');
}

async function extractPdfText(file: File): Promise<string> {
  // pdfjs-dist requires a worker. We use the bundled worker URL strategy that
  // works with Vite — `pdf.worker.min.mjs` is shipped inside the package.
  const pdfjs = await import('pdfjs-dist');
  // Vite's `?url` import syntax returns the asset URL string at build time.
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore — Vite-specific virtual import
  const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const arrayBuffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  const pageTexts: string[] = [];
  for (let pageIndex = 1; pageIndex <= doc.numPages; pageIndex += 1) {
    const page = await doc.getPage(pageIndex);
    const textContent = await page.getTextContent();
    // Sort items into rough lines using y position so paragraphs survive.
    const items = textContent.items as Array<{ str: string; transform: number[] }>;
    type Line = { y: number; parts: string[] };
    const lines: Line[] = [];
    for (const item of items) {
      const y = Math.round(item.transform[5] ?? 0);
      const existing = lines.find((line) => Math.abs(line.y - y) < 3);
      if (existing) {
        existing.parts.push(item.str);
      } else {
        lines.push({ y, parts: [item.str] });
      }
    }
    lines.sort((a, b) => b.y - a.y);
    pageTexts.push(lines.map((line) => line.parts.join(' ').trim()).filter(Boolean).join('\n'));
  }
  return pageTexts.join('\n');
}

/** Regexes used to pluck contact details out of free-form text. */
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;
const PHONE_RE = /(\+?\d[\d\s().-]{7,}\d)/;
const URL_RE = /\b((?:https?:\/\/)?(?:www\.)?[a-zA-Z0-9-]+\.[a-zA-Z]{2,}(?:\/[^\s]*)?)\b/g;

/** Detects whether a line marks the start of a known section. */
const SECTION_PATTERNS: Array<{ key: 'summary' | 'experience' | 'education' | 'skills' | 'projects' | 'languages' | 'references'; re: RegExp }> = [
  { key: 'summary', re: /^(professional\s+)?(summary|profile|objective|about\s+me)\b/i },
  { key: 'experience', re: /^(work\s+)?(experience|employment(\s+history)?|professional\s+experience|career)\b/i },
  { key: 'education', re: /^(education|academic(s|\s+qualifications)?|qualifications)\b/i },
  { key: 'skills', re: /^(technical\s+)?(skills|core\s+competencies|expertise|technologies)\b/i },
  { key: 'projects', re: /^(projects|selected\s+work|portfolio|case\s+work)\b/i },
  { key: 'languages', re: /^languages?\b/i },
  { key: 'references', re: /^references?\b/i },
];

interface ParsedSections {
  summary: string;
  experience: string[];
  education: string[];
  skills: string[];
  projects: string[];
}

/**
 * Split the raw lines into named sections by looking for section headings.
 * Lines before the first heading are treated as the header block (where the
 * name, title, and contact info usually live).
 */
function splitSections(lines: string[]): { header: string[]; sections: ParsedSections } {
  const sections: ParsedSections = { summary: '', experience: [], education: [], skills: [], projects: [] };
  const header: string[] = [];
  let current: keyof ParsedSections | 'header' = 'header';
  let buffer: string[] = [];

  const flush = () => {
    const text = buffer.join('\n').trim();
    if (!text) return;
    if (current === 'header') {
      header.push(...buffer.map((line) => line.trim()).filter(Boolean));
    } else if (current === 'summary') {
      sections.summary = sections.summary ? `${sections.summary}\n${text}` : text;
    } else if (current === 'skills') {
      sections.skills.push(text);
    } else if (current === 'experience') {
      sections.experience.push(text);
    } else if (current === 'education') {
      sections.education.push(text);
    } else if (current === 'projects') {
      sections.projects.push(text);
    }
    buffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      // Treat blank line as a soft break for experience/education/projects so
      // each entry becomes its own block.
      if (current === 'experience' || current === 'education' || current === 'projects') {
        flush();
      }
      continue;
    }
    const match = SECTION_PATTERNS.find((p) => p.re.test(line));
    if (match) {
      flush();
      current = match.key === 'languages' || match.key === 'references' ? 'header' : match.key;
      continue;
    }
    buffer.push(line);
  }
  flush();
  return { header, sections };
}

/**
 * Guess the candidate's name from the header block. We pick the first line
 * that looks like a Title-Case sequence of 2-4 words and doesn't contain
 * an `@` or digits.
 */
function guessName(header: string[]): string {
  for (const line of header) {
    if (!line) continue;
    if (EMAIL_RE.test(line) || /\d/.test(line)) continue;
    const words = line.split(/\s+/).filter(Boolean);
    if (words.length < 2 || words.length > 5) continue;
    const looksLikeName = words.every((w) => /^[A-Z][a-zA-Z'’.-]+$/.test(w) || /^[A-Z.]+$/.test(w));
    if (looksLikeName) return line;
  }
  return header[0] || '';
}

/** A title is usually the line right after the name in the header. */
function guessJobTitle(header: string[], name: string): string {
  const nameIdx = header.indexOf(name);
  for (let i = nameIdx + 1; i < header.length; i += 1) {
    const line = header[i];
    if (!line) continue;
    if (EMAIL_RE.test(line) || PHONE_RE.test(line)) continue;
    if (/\d{2,}/.test(line)) continue; // skip lines with phone/zip-like digits
    return line;
  }
  return '';
}

function findFirst(re: RegExp, text: string): string | null {
  const m = re.exec(text);
  return m ? m[0] : null;
}

function findUrl(text: string, contains: string): string | null {
  const matches = text.match(URL_RE) || [];
  return matches.find((url) => url.toLowerCase().includes(contains.toLowerCase())) || null;
}

/** Split a skills block on common delimiters into a clean string array. */
function parseSkills(text: string): string[] {
  return text
    .split(/[,;•\n|/]+/)
    .map((s) => s.replace(/^[•\-*\s]+/, '').replace(/[•\-*\s]+$/, '').trim())
    .filter((s) => s.length > 0 && s.length < 60)
    .slice(0, 40);
}

const DATE_RANGE_RE = /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}|\d{1,2}\/\d{4}|\d{4})\s*(?:[-–—to]+\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)[a-z]*\.?\s*\d{4}|Present|Current|Now|\d{1,2}\/\d{4}|\d{4}))?/i;

function parseDateRange(text: string): { start: string; end: string } | null {
  const match = DATE_RANGE_RE.exec(text);
  if (!match) return null;
  return { start: match[1] || '', end: match[2] || '' };
}

let idCounter = 0;
function makeId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

function parseExperienceBlock(block: string): Experience | null {
  const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;

  const dates = parseDateRange(block);
  // Lines without dates form the header (role/company); subsequent lines form
  // the description.
  const titleLines: string[] = [];
  const descLines: string[] = [];
  let inDesc = false;
  for (const line of lines) {
    if (!inDesc && (line.startsWith('•') || line.startsWith('-') || line.startsWith('*') || line.length > 90)) {
      inDesc = true;
    }
    if (inDesc) {
      descLines.push(line.replace(/^[•\-*]\s*/, ''));
    } else {
      titleLines.push(line);
    }
  }
  // Split first title line into "Role at Company" or "Role | Company".
  const headerLine = titleLines[0] || '';
  const splitter = /\s+(?:at|@|\||,|–|—|-)\s+/i;
  let role = headerLine;
  let company = titleLines[1] || '';
  if (splitter.test(headerLine)) {
    const parts = headerLine.split(splitter).map((p) => p.trim()).filter(Boolean);
    role = parts[0] || '';
    company = parts.slice(1).join(', ') || company;
  }
  // Strip date fragments from role/company.
  role = role.replace(DATE_RANGE_RE, '').trim().replace(/[,–—-]+$/, '').trim();
  company = company.replace(DATE_RANGE_RE, '').trim().replace(/[,–—-]+$/, '').trim();
  if (!role && !company && titleLines.length === 0) return null;

  return {
    id: makeId('exp'),
    role: role || titleLines[0] || '',
    company,
    startDate: dates?.start || '',
    endDate: dates?.end || '',
    description: descLines.join('\n'),
  };
}

function parseEducationBlock(block: string): Education | null {
  const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  const dates = parseDateRange(block);
  const headerLine = lines[0] || '';
  const splitter = /\s+(?:at|@|\||,|–|—|-)\s+/i;
  let degree = headerLine;
  let institution = lines[1] || '';
  if (splitter.test(headerLine)) {
    const parts = headerLine.split(splitter).map((p) => p.trim()).filter(Boolean);
    degree = parts[0] || '';
    institution = parts.slice(1).join(', ') || institution;
  }
  degree = degree.replace(DATE_RANGE_RE, '').trim().replace(/[,–—-]+$/, '').trim();
  institution = institution.replace(DATE_RANGE_RE, '').trim().replace(/[,–—-]+$/, '').trim();
  const description = lines.slice(2).join('\n').replace(DATE_RANGE_RE, '').trim();
  return {
    id: makeId('edu'),
    degree: degree || lines[0],
    institution,
    startDate: dates?.start || '',
    endDate: dates?.end || '',
    description,
  };
}

function parseProjectBlock(block: string): Project | null {
  const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return null;
  const name = lines[0].replace(/^[•\-*]\s*/, '');
  const description = lines.slice(1).filter((l) => !/^tech(nologies)?\s*[:\-]/i.test(l)).join(' ').trim();
  const techLine = lines.find((l) => /^tech(nologies)?\s*[:\-]/i.test(l));
  const technologies = techLine
    ? techLine.replace(/^tech(nologies)?\s*[:\-]\s*/i, '').split(/[,;|]/).map((t) => t.trim()).filter(Boolean)
    : [];
  return { id: makeId('proj'), name, description, technologies };
}

/**
 * Run the heuristic parser on the file and merge the result into the user's
 * current data — replacing fields that we have high confidence about, and
 * leaving the rest alone.
 */
export async function parseResumeLocally(file: File, current: ResumeData): Promise<ResumeData> {
  const text = await extractText(file);
  if (!text.trim()) {
    throw new Error('Could not extract text from the file. The PDF may be scanned/image-only — try a Word version, or contact sales to enable AI extraction.');
  }

  const lines = text.split(/\r?\n/);
  const { header, sections } = splitSections(lines);
  const headerText = header.join('\n');
  const fullText = lines.join('\n');

  const name = guessName(header) || current.personalInfo.fullName;
  const jobTitle = guessJobTitle(header, name) || current.personalInfo.jobTitle;
  const email = findFirst(EMAIL_RE, fullText) || current.personalInfo.email;
  const phone = findFirst(PHONE_RE, headerText) || findFirst(PHONE_RE, fullText) || current.personalInfo.phone;
  const linkedin = findUrl(fullText, 'linkedin.com') || current.personalInfo.linkedin;
  const github = findUrl(fullText, 'github.com') || current.personalInfo.github;
  const website = (() => {
    const all = (fullText.match(URL_RE) || []).filter((url) => !/linkedin\.com|github\.com/i.test(url));
    return all[0] || current.personalInfo.website;
  })();
  // Location heuristic: a header line that contains a comma, no @, no digits
  // before the comma, and isn't the name.
  const location = header.find((line) =>
    line && line !== name && line !== jobTitle && /,/.test(line) && !EMAIL_RE.test(line) && !PHONE_RE.test(line)
  ) || current.personalInfo.location;

  const summary = sections.summary || current.personalInfo.summary;
  const skills = sections.skills.length
    ? Array.from(new Set(sections.skills.flatMap((block) => parseSkills(block))))
    : current.skills;
  const experience = sections.experience.length
    ? sections.experience.map(parseExperienceBlock).filter((entry): entry is Experience => Boolean(entry))
    : current.experience;
  const education = sections.education.length
    ? sections.education.map(parseEducationBlock).filter((entry): entry is Education => Boolean(entry))
    : current.education;
  const projects = sections.projects.length
    ? sections.projects.map(parseProjectBlock).filter((entry): entry is Project => Boolean(entry))
    : current.projects;

  return {
    ...current,
    personalInfo: {
      ...current.personalInfo,
      fullName: name,
      jobTitle,
      email,
      phone,
      location,
      summary,
      website,
      linkedin,
      github,
    },
    skills,
    experience,
    education,
    projects,
  };
}
