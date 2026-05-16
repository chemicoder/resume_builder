import React from 'react';
import { ResumeData } from '../../types';
import { Mail, Phone, MapPin, Globe, Linkedin, Github } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function ModernResume({ data }: { data: ResumeData }) {
  const primaryColor = data.theme?.primary || '#1e293b'; // slate-800 default
  const accentColor = data.theme?.accent || '#3b82f6';

  return (
    <div data-resume-page className="w-full max-w-[800px] mx-auto bg-white shadow-lg min-h-[1056px] flex font-sans text-gray-800">
      {/* Left Column */}
      <div className="w-1/3 text-white p-8" style={{ backgroundColor: primaryColor }}>
        {data.personalInfo.profilePicture && (
          <div className="mb-6 flex justify-center">
            <img src={data.personalInfo.profilePicture} alt="Profile" className="w-32 h-32 rounded-full object-cover border-4" style={{ borderColor: 'rgba(255,255,255,0.2)' }} />
          </div>
        )}
        <div className="mb-8">
          <h1 className="text-3xl font-bold leading-tight mb-2">{data.personalInfo.fullName}</h1>
          <h2 className="text-lg font-light" style={{ color: accentColor }}>{data.personalInfo.jobTitle}</h2>
        </div>

        <div className="space-y-4 mb-8 text-sm text-slate-300">
          {data.personalInfo.email && (
            <div className="flex items-center gap-3"><Mail size={16} className="opacity-70" /> <span className="break-all">{data.personalInfo.email}</span></div>
          )}
          {data.personalInfo.phone && (
            <div className="flex items-center gap-3"><Phone size={16} className="opacity-70" /> <span>{data.personalInfo.phone}</span></div>
          )}
          {data.personalInfo.location && (
            <div className="flex items-center gap-3"><MapPin size={16} className="opacity-70" /> <span>{data.personalInfo.location}</span></div>
          )}
          {data.personalInfo.website && (
            <div className="flex items-center gap-3"><Globe size={16} className="opacity-70" /> <span className="break-all">{data.personalInfo.website}</span></div>
          )}
          {data.personalInfo.linkedin && (
            <div className="flex items-center gap-3"><Linkedin size={16} className="opacity-70" /> <span className="break-all">{data.personalInfo.linkedin}</span></div>
          )}
          {data.personalInfo.github && (
            <div className="flex items-center gap-3"><Github size={16} className="opacity-70" /> <span className="break-all">{data.personalInfo.github}</span></div>
          )}
        </div>

        {data.showQrCode && data.qrCodeLink && (
          <div className="mb-8 flex flex-col items-center bg-white/10 p-4 rounded-lg">
            <QRCodeSVG value={data.qrCodeLink} size={80} bgColor="transparent" fgColor={data.theme.qrCodeColor || '#ffffff'} />
            <span className="text-[10px] text-white/70 mt-2 uppercase tracking-wider">Scan Me</span>
          </div>
        )}

        {data.skills.length > 0 && (
          <div className="mb-8">
            <h3 className="text-lg font-semibold uppercase tracking-wider mb-4 border-b pb-2" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>Skills</h3>
            <div className="flex flex-wrap gap-2">
              {data.skills.map((skill, index) => (
                <span key={index} className="text-xs px-2 py-1 rounded" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {data.education.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold uppercase tracking-wider mb-4 border-b pb-2" style={{ borderColor: 'rgba(255,255,255,0.2)' }}>Education</h3>
            <div className="space-y-4">
              {data.education.map((edu) => (
                <div key={edu.id}>
                  <h4 className="font-medium text-sm">{edu.degree}</h4>
                  <div className="text-xs opacity-70 mb-1">{edu.institution}</div>
                  <div className="text-xs opacity-50">{edu.startDate} - {edu.endDate}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Column */}
      <div className="w-2/3 p-8 bg-slate-50">
        {data.personalInfo.summary && (
          <section className="mb-8">
            <h3 className="text-xl font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: primaryColor }}>
              <span className="w-8 h-px" style={{ backgroundColor: primaryColor }}></span> Profile
            </h3>
            <p className="text-sm leading-relaxed text-slate-600">{data.personalInfo.summary}</p>
          </section>
        )}

        {data.experience.length > 0 && (
          <section className="mb-8">
            <h3 className="text-xl font-bold uppercase tracking-wider mb-6 flex items-center gap-2" style={{ color: primaryColor }}>
              <span className="w-8 h-px" style={{ backgroundColor: primaryColor }}></span> Experience
            </h3>
            <div className="space-y-6">
              {data.experience.map((exp) => (
                <div key={exp.id} className="relative pl-4 border-l-2 border-slate-200">
                  <div className="absolute w-3 h-3 rounded-full -left-[7px] top-1.5 border-2 border-white" style={{ backgroundColor: primaryColor }}></div>
                  <h4 className="font-bold text-lg" style={{ color: primaryColor }}>{exp.role}</h4>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-slate-600">{exp.company}</span>
                    <span className="text-xs text-slate-500 bg-slate-200 px-2 py-1 rounded-full">{exp.startDate} - {exp.endDate}</span>
                  </div>
                  <ul className="list-disc list-outside ml-4 space-y-1 text-sm leading-relaxed text-slate-600">
                    {exp.description.split('\n').filter(line => line.trim()).map((line, i) => (
                      <li key={i}>{line.replace(/^[•\-\*]\s*/, '')}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {data.projects.length > 0 && (
          <section>
            <h3 className="text-xl font-bold uppercase tracking-wider mb-6 flex items-center gap-2" style={{ color: primaryColor }}>
              <span className="w-8 h-px" style={{ backgroundColor: primaryColor }}></span> Projects
            </h3>
            <div className="space-y-6">
              {data.projects.map((proj) => (
                <div key={proj.id}>
                  <h4 className="font-bold text-base mb-1" style={{ color: primaryColor }}>
                    {proj.name}
                    {proj.link && <a href={`https://${proj.link}`} target="_blank" rel="noreferrer" className="text-xs font-normal ml-2 hover:underline" style={{ color: accentColor }}>Link ↗</a>}
                  </h4>
                  <p className="text-sm leading-relaxed text-slate-600 mb-2">{proj.description}</p>
                  {(proj.technologies || []).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {(proj.technologies || []).map((tech, i) => (
                        <span key={i} className="text-xs text-slate-500 bg-white border border-slate-200 px-2 py-0.5 rounded-full">
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
