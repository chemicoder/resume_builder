export interface PersonalInfo {
  fullName: string;
  jobTitle: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  website?: string;
  linkedin?: string;
  github?: string;
  profilePicture?: string;
}

export interface Experience {
  id: string;
  company: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  link?: string;
  technologies: string[];
}

export type LanguageLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2' | 'Native';

/**
 * Per-skill CEFR levels (optional). When unset, each skill falls back to
 * the overall `level` field. Used by the Europass self-assessment grid;
 * other templates display only the overall level.
 */
export interface LanguageSkills {
  listening?: LanguageLevel;
  reading?: LanguageLevel;
  spokenInteraction?: LanguageLevel;
  spokenProduction?: LanguageLevel;
  writing?: LanguageLevel;
}

export interface Language {
  id: string;
  name: string;
  level: LanguageLevel;
  skills?: LanguageSkills;
}

export interface Reference {
  id: string;
  name: string;
  role: string;
  organization: string;
  email: string;
  phone: string;
}

export interface Theme {
  primary: string;
  accent: string;
  qrCodeColor?: string;
  // Optional override for body text color. When unset, each template uses its
  // own sensible default (e.g. near-black on light pages, light gray on dark
  // pages). Applies to PDF/preview and DOCX export.
  bodyText?: string;
  // Optional font family override. The value is one of FONT_OPTIONS in the
  // sidebar. When unset, each template uses its own default fontFamily.
  // Applied as CSS `font-family` in the preview and as the DOCX run `font`.
  fontFamily?: string;
}

export interface TargetJob {
  description: string;
  url?: string;
}

export interface ResumeData {
  personalInfo: PersonalInfo;
  experience: Experience[];
  education: Education[];
  skills: string[];
  projects: Project[];
  languages?: Language[];
  references?: Reference[];
  theme: Theme;
  showQrCode: boolean;
  qrCodeLink: string;
  atsScore?: number;
  targetJob?: TargetJob;
}
