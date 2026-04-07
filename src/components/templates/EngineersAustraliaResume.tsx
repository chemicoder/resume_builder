import React from 'react';
import { ResumeData } from '../../types';
import { QRCodeSVG } from 'qrcode.react';

export default function EngineersAustraliaResume({ data }: { data: ResumeData }) {
  const primaryColor = data.theme?.primary || '#111827';
  const accentColor = data.theme?.accent || '#374151';

  return (
    <div className="w-full max-w-[800px] mx-auto bg-white p-12 shadow-lg min-h-[1056px] text-gray-900 font-sans text-sm leading-relaxed">
      {/* Header */}
      <header className="mb-8 border-b-2 pb-4 flex justify-between items-start" style={{ borderColor: primaryColor }}>
        <div className="flex-1">
          <h1 className="text-3xl font-bold uppercase mb-4 text-center" style={{ color: primaryColor }}>{data.personalInfo.fullName}</h1>
          
          <div className="grid grid-cols-2 gap-2 text-sm max-w-lg mx-auto">
            {data.personalInfo.location && (
              <>
                <div className="font-bold text-right pr-4" style={{ color: accentColor }}>Address:</div>
                <div>{data.personalInfo.location}</div>
              </>
            )}
            {data.personalInfo.phone && (
              <>
                <div className="font-bold text-right pr-4" style={{ color: accentColor }}>Phone:</div>
                <div>{data.personalInfo.phone}</div>
              </>
            )}
            {data.personalInfo.email && (
              <>
                <div className="font-bold text-right pr-4" style={{ color: accentColor }}>Email:</div>
                <div>{data.personalInfo.email}</div>
              </>
            )}
            {data.personalInfo.linkedin && (
              <>
                <div className="font-bold text-right pr-4" style={{ color: accentColor }}>LinkedIn:</div>
                <div>{data.personalInfo.linkedin}</div>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-4 ml-4">
          {data.showQrCode && data.qrCodeLink && (
            <div className="flex flex-col items-center gap-1">
              <QRCodeSVG value={data.qrCodeLink} size={70} fgColor={data.theme.qrCodeColor || '#000000'} />
              <span className="text-[10px] text-gray-500">Scan Me</span>
            </div>
          )}
          {data.personalInfo.profilePicture && (
            <img src={data.personalInfo.profilePicture} alt="Profile" className="w-20 h-20 rounded object-cover border border-gray-300" />
          )}
        </div>
      </header>

      {/* Summary / Career Objective */}
      {data.personalInfo.summary && (
        <section className="mb-8">
          <h2 className="text-lg font-bold uppercase border-b mb-3 pb-1" style={{ borderColor: primaryColor, color: primaryColor }}>Career Objective</h2>
          <p className="text-justify">{data.personalInfo.summary}</p>
        </section>
      )}

      {/* Education */}
      {data.education.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold uppercase border-b mb-3 pb-1" style={{ borderColor: primaryColor, color: primaryColor }}>Academic Qualifications</h2>
          <div className="space-y-4">
            {data.education.map((edu) => (
              <div key={edu.id} className="grid grid-cols-[1fr_3fr] gap-4">
                <div className="font-semibold" style={{ color: accentColor }}>{edu.startDate} - {edu.endDate}</div>
                <div>
                  <div className="font-bold">{edu.degree}</div>
                  <div className="italic">{edu.institution}</div>
                  {edu.description && <p className="mt-1">{edu.description}</p>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills */}
      {data.skills.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold uppercase border-b mb-3 pb-1" style={{ borderColor: primaryColor, color: primaryColor }}>Software & Technical Skills</h2>
          <ul className="list-disc list-inside columns-2 gap-8">
            {data.skills.map((skill, index) => (
              <li key={index} className="mb-1">{skill}</li>
            ))}
          </ul>
        </section>
      )}

      {/* Experience */}
      {data.experience.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold uppercase border-b mb-3 pb-1" style={{ borderColor: primaryColor, color: primaryColor }}>Employment History</h2>
          <div className="space-y-8">
            {data.experience.map((exp) => (
              <div key={exp.id}>
                <div className="grid grid-cols-[1fr_3fr] gap-4 mb-3">
                  <div className="font-semibold" style={{ color: accentColor }}>{exp.startDate} - {exp.endDate}</div>
                  <div>
                    <div className="font-bold text-base">{exp.company}</div>
                    <div className="italic font-semibold">{exp.role}</div>
                  </div>
                </div>
                <div className="pl-[25%]">
                  <h4 className="font-semibold mb-2 underline">Duties & Responsibilities:</h4>
                  <ul className="list-disc list-outside ml-4 space-y-1">
                    {exp.description.split('\n').filter(line => line.trim()).map((line, i) => (
                      <li key={i}>{line.replace(/^[•\-\*]\s*/, '')}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Projects */}
      {data.projects.length > 0 && (
        <section className="mb-8">
          <h2 className="text-lg font-bold uppercase border-b mb-3 pb-1" style={{ borderColor: primaryColor, color: primaryColor }}>Key Projects</h2>
          <div className="space-y-6">
            {data.projects.map((proj) => (
              <div key={proj.id} className="pl-[25%]">
                <div className="font-bold mb-1">{proj.name} {proj.link && <span className="font-normal italic text-xs">({proj.link})</span>}</div>
                <p className="mb-2">{proj.description}</p>
                {(proj.technologies || []).length > 0 && (
                  <p className="text-xs italic">
                    <span className="font-semibold">Technologies used:</span> {proj.technologies.join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
