import { ResumeData } from '../types';

export const initialData: ResumeData = {
  personalInfo: {
    fullName: "Jane Doe",
    jobTitle: "Full Stack Developer",
    email: "jane.doe@example.com",
    phone: "(555) 123-4567",
    location: "San Francisco, CA",
    summary: "Passionate software engineer with 5+ years of experience building scalable web applications. Strong focus on React, Node.js, and cloud architecture. Proven track record of delivering high-quality software solutions on time and within budget.",
    website: "janedoe.dev",
    linkedin: "linkedin.com/in/janedoe",
    github: "github.com/janedoe"
  },
  experience: [
    {
      id: "1",
      company: "Tech Innovators Inc.",
      role: "Senior Frontend Engineer",
      startDate: "Jan 2021",
      endDate: "Present",
      description: "Led the migration of a legacy monolithic application to a modern React-based micro-frontend architecture. Improved performance by 40% and reduced deployment times by implementing automated CI/CD pipelines."
    },
    {
      id: "2",
      company: "Web Solutions LLC",
      role: "Web Developer",
      startDate: "Jun 2018",
      endDate: "Dec 2020",
      description: "Developed and maintained multiple client websites using React and Node.js. Implemented responsive designs and integrated third-party APIs. Collaborated closely with designers and product managers to deliver user-centric features."
    }
  ],
  education: [
    {
      id: "1",
      institution: "University of Technology",
      degree: "B.S. Computer Science",
      startDate: "Sep 2014",
      endDate: "May 2018",
      description: "Graduated with Honors. Relevant coursework: Data Structures, Algorithms, Web Development, Database Systems."
    }
  ],
  skills: ["JavaScript", "TypeScript", "React", "Node.js", "Python", "SQL", "AWS", "Docker", "Git", "GraphQL", "Tailwind CSS"],
  projects: [
    {
      id: "1",
      name: "E-commerce Platform",
      description: "A full-stack e-commerce solution with real-time inventory management and Stripe payment integration.",
      link: "github.com/janedoe/ecommerce",
      technologies: ["React", "Node.js", "MongoDB", "Stripe"]
    },
    {
      id: "2",
      name: "Task Management App",
      description: "A collaborative task management tool with real-time updates using WebSockets.",
      link: "janedoe.dev/tasks",
      technologies: ["Vue.js", "Firebase", "Tailwind CSS"]
    }
  ],
  languages: [
    { id: '1', name: 'English', level: 'Native' },
    { id: '2', name: 'Spanish', level: 'B2' },
  ],
  // references is intentionally omitted — section hidden by default;
  // user opts in via the sidebar checkbox.
  theme: {
    primary: '#2563eb',
    accent: '#3b82f6',
  },
  showQrCode: false,
  qrCodeLink: 'https://linkedin.com/in/janedoe',
};
