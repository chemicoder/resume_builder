import React from 'react';
import { ResumeData } from '../../types';
import { QRCodeSVG } from 'qrcode.react';

export default function HarvardResume({ data }: { data: ResumeData }) {
  const primaryColor = data.theme?.primary || '#000000';
  const accentColor = data.theme?.accent || '#333333';

  return (
    <div className="w-full max-w-[800px] mx-auto bg-white p-12 shadow-lg min-h-[1056px] text-black font-serif relative">
      {/* QR Code */}
      {data.showQrCode && data.qrCodeLink && (
        <div className="absolute top-12 right-12">
          <QRCodeSVG value={data.qrCodeLink} size={60} fgColor={data.theme.qrCodeColor || primaryColor} />
        </div>
      )}

      {/* Header */}
      <header className="text-center mb-6">
        <h1 className="text-3xl font-bold uppercase mb-2" style={{ color: primaryColor }}>{data.personalInfo.fullName}</h1>
        <div className="text-sm flex flex-wrap justify-center items-center gap-2" style={{ color: accentColor }}>
          {data.personalInfo.location && <span>{data.personalInfo.location}</span>}
          {data.personalInfo.location && (data.personalInfo.phone || data.personalInfo.email) && <span>|</span>}
          {data.personalInfo.phone && <span>{data.personalInfo.phone}</span>}
          {data.personalInfo.phone && data.personalInfo.email && <span>|</span>}
          {data.personalInfo.email && <span>{data.personalInfo.email}</span>}
          {data.personalInfo.linkedin && <span>| {data.personalInfo.linkedin}</span>}
        </div>
      </header>

      {/* Summary */}
      {data.personalInfo.summary && (
        <section className="mb-6">
          <p className="text-sm leading-relaxed">{data.personalInfo.summary}</p>
        </section>
      )}

      {/* Experience */}
      {data.experience.length > 0 && (
        <section className="mb-6">
          <h3 className="text-md font-bold uppercase border-b pb-1 mb-3" style={{ borderColor: primaryColor, color: primaryColor }}>Experience</h3>
          <div className="space-y-4">
            {data.experience.map((exp) => (
              <div key={exp.id}>
                <div className="flex justify-between items-baseline">
                  <h4 className="font-bold text-sm">{exp.company}</h4>
                  <span className="text-sm">{exp.startDate} - {exp.endDate}</span>
                </div>
                <div className="text-sm italic mb-1" style={{ color: accentColor }}>{exp.role}</div>
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

      {/* Education */}
      {data.education.length > 0 && (
        <section className="mb-6">
          <h3 className="text-md font-bold uppercase border-b pb-1 mb-3" style={{ borderColor: primaryColor, color: primaryColor }}>Education</h3>
          <div className="space-y-4">
            {data.education.map((edu) => (
              <div key={edu.id}>
                <div className="flex justify-between items-baseline">
                  <h4 className="font-bold text-sm">{edu.institution}</h4>
                  <span className="text-sm">{edu.startDate} - {edu.endDate}</span>
                </div>
                <div className="text-sm italic mb-1" style={{ color: accentColor }}>{edu.degree}</div>
                <p className="text-sm leading-relaxed">{edu.description}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Projects */}
      {data.projects.length > 0 && (
        <section className="mb-6">
          <h3 className="text-md font-bold uppercase border-b pb-1 mb-3" style={{ borderColor: primaryColor, color: primaryColor }}>Projects</h3>
          <div className="space-y-4">
            {data.projects.map((proj) => (
              <div key={proj.id}>
                <div className="flex justify-between items-baseline">
                  <h4 className="font-bold text-sm">{proj.name} {proj.link && <span className="font-normal italic">({proj.link})</span>}</h4>
                </div>
                <p className="text-sm leading-relaxed pl-4 relative before:content-['•'] before:absolute before:left-0 mb-1">{proj.description}</p>
                <p className="text-xs italic pl-4">Technologies: {proj.technologies.join(', ')}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {data.skills.length > 0 && (
        <section>
          <h3 className="text-md font-bold uppercase border-b pb-1 mb-3" style={{ borderColor: primaryColor, color: primaryColor }}>Skills</h3>
          <p className="text-sm leading-relaxed">
            <span className="font-bold">Technical Skills: </span>
            {data.skills.join(', ')}
          </p>
        </section>
      )}
    </div>
  );
}
