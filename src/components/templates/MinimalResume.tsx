import React from 'react';
import { ResumeData } from '../../types';
import { Mail, Phone, MapPin, Globe, Linkedin, Github } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function MinimalResume({ data }: { data: ResumeData }) {
  const primaryColor = data.theme?.primary || '#2563eb';
  const accentColor = data.theme?.accent || '#3b82f6';

  return (
    <div data-resume-page className="w-full max-w-[800px] mx-auto bg-white p-10 shadow-lg min-h-[1056px] text-gray-800 font-sans">
      {/* Header */}
      <header className="border-b-2 pb-6 mb-6 flex justify-between items-start" style={{ borderColor: primaryColor }}>
        <div>
          <h1 className="text-4xl font-bold uppercase tracking-wider mb-2" style={{ color: primaryColor }}>{data.personalInfo.fullName}</h1>
          <h2 className="text-xl mb-4" style={{ color: accentColor }}>{data.personalInfo.jobTitle}</h2>
          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
            {data.personalInfo.email && (
              <div className="flex items-center gap-1"><Mail size={14} /> {data.personalInfo.email}</div>
            )}
            {data.personalInfo.phone && (
              <div className="flex items-center gap-1"><Phone size={14} /> {data.personalInfo.phone}</div>
            )}
            {data.personalInfo.location && (
              <div className="flex items-center gap-1"><MapPin size={14} /> {data.personalInfo.location}</div>
            )}
            {data.personalInfo.website && (
              <div className="flex items-center gap-1"><Globe size={14} /> {data.personalInfo.website}</div>
            )}
            {data.personalInfo.linkedin && (
              <div className="flex items-center gap-1"><Linkedin size={14} /> {data.personalInfo.linkedin}</div>
            )}
            {data.personalInfo.github && (
              <div className="flex items-center gap-1"><Github size={14} /> {data.personalInfo.github}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {data.showQrCode && data.qrCodeLink && (
            <div className="flex flex-col items-center gap-1">
              <QRCodeSVG value={data.qrCodeLink} size={80} fgColor={data.theme.qrCodeColor || '#000000'} />
              <span className="text-[10px] text-gray-500">Scan Me</span>
            </div>
          )}
          {data.personalInfo.profilePicture && (
            <img src={data.personalInfo.profilePicture} alt="Profile" className="w-24 h-24 rounded-full object-cover border border-gray-300" />
          )}
        </div>
      </header>

      {/* Summary */}
      {data.personalInfo.summary && (
        <section className="mb-8">
          <h3 className="text-lg font-bold uppercase tracking-wider border-b pb-1 mb-3" style={{ borderColor: primaryColor, color: primaryColor }}>Summary</h3>
          <p className="text-sm leading-relaxed">{data.personalInfo.summary}</p>
        </section>
      )}

      {/* Experience */}
      {data.experience.length > 0 && (
        <section className="mb-8">
          <h3 className="text-lg font-bold uppercase tracking-wider border-b pb-1 mb-4" style={{ borderColor: primaryColor, color: primaryColor }}>Experience</h3>
          <div className="space-y-5">
            {data.experience.map((exp) => (
              <div key={exp.id}>
                <div className="flex justify-between items-baseline mb-1">
                  <h4 className="font-bold text-base" style={{ color: accentColor }}>{exp.role}</h4>
                  <span className="text-sm text-gray-600">{exp.startDate} - {exp.endDate}</span>
                </div>
                <div className="text-sm font-medium text-gray-700 mb-2">{exp.company}</div>
                <ul className="list-disc list-outside ml-4 space-y-1 text-sm leading-relaxed">
                  {exp.description.split('\n').filter(line => line.trim()).map((line, i) => (
                    <li key={i}>{line.replace(/^[•\-\*]\s*/, '')}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Projects */}
      {data.projects.length > 0 && (
        <section className="mb-8">
          <h3 className="text-lg font-bold uppercase tracking-wider border-b pb-1 mb-4" style={{ borderColor: primaryColor, color: primaryColor }}>Projects</h3>
          <div className="space-y-4">
            {data.projects.map((proj) => (
              <div key={proj.id}>
                <div className="flex justify-between items-baseline mb-1">
                  <h4 className="font-bold text-base" style={{ color: accentColor }}>
                    {proj.name}
                    {proj.link && <span className="text-sm font-normal text-blue-600 ml-2">({proj.link})</span>}
                  </h4>
                </div>
                <p className="text-sm leading-relaxed mb-1">{proj.description}</p>
                {(proj.technologies || []).length > 0 && (
                  <p className="text-xs text-gray-600 italic">Technologies: {proj.technologies.join(', ')}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Education */}
      {data.education.length > 0 && (
        <section className="mb-8">
          <h3 className="text-lg font-bold uppercase tracking-wider border-b pb-1 mb-4" style={{ borderColor: primaryColor, color: primaryColor }}>Education</h3>
          <div className="space-y-4">
            {data.education.map((edu) => (
              <div key={edu.id}>
                <div className="flex justify-between items-baseline mb-1">
                  <h4 className="font-bold text-base" style={{ color: accentColor }}>{edu.degree}</h4>
                  <span className="text-sm text-gray-600">{edu.startDate} - {edu.endDate}</span>
                </div>
                <div className="text-sm font-medium text-gray-700 mb-1">{edu.institution}</div>
                <p className="text-sm leading-relaxed">{edu.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {data.skills.length > 0 && (
        <section>
          <h3 className="text-lg font-bold uppercase tracking-wider border-b pb-1 mb-3" style={{ borderColor: primaryColor, color: primaryColor }}>Skills</h3>
          <p className="text-sm leading-relaxed">{data.skills.join(' • ')}</p>
        </section>
      )}
    </div>
  );
}
