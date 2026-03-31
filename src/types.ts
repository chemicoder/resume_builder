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

export interface Theme {
  primary: string;
  accent: string;
  qrCodeColor?: string;
}

export interface ResumeData {
  personalInfo: PersonalInfo;
  experience: Experience[];
  education: Education[];
  skills: string[];
  projects: Project[];
  theme: Theme;
  showQrCode: boolean;
  qrCodeLink: string;
}
