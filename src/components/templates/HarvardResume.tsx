import React from 'react';
import { ResumeData } from '../../types';
import { QRCodeSVG } from 'qrcode.react';

/**
 * Harvard CV convention:
 *  - Times New Roman (serif), monochrome (no accent colors).
 *  - No photo, no graphics.
 *  - Centered uppercase name.
 *  - Section order for students/early-career: Education FIRST, then Experience,
 *    then Projects/Research, then Skills/Interests/Languages, then References.
 *  - Within each entry: institution/company bold left, dates right; role italic below.
 *  - Bulleted accomplishments in past tense.
 */
export default function HarvardResume({ data }: { data: ResumeData }) {
  // Harvard convention: always black regardless of theme. Theme primary is ignored.
  const ink = '#000000';

  return (
    <div data-resume-page className="w-full max-w-[800px] mx-auto bg-white p-12 shadow-lg min-h-[1056px] text-black font-serif relative">
      {data.showQrCode && data.qrCodeLink && (
        <div className="absolute top-12 right-12">
          <QRCodeSVG value={data.qrCodeLink} size={60} fgColor={data.theme.qrCodeColor || ink} />
        </div>
      )}

      {/* Header — centered name + single contact line */}
      <header className="text-center mb-6">
        <h1 className="text-3xl font-bold uppercase mb-2 tracking-wide">{data.personalInfo.fullName}</h1>
        <div className="text-sm flex flex-wrap justify-center items-center gap-x-2">
          {data.personalInfo.location && <span>{data.personalInfo.location}</span>}
          {data.personalInfo.location && (data.personalInfo.phone || data.personalInfo.email) && <span>|</span>}
          {data.personalInfo.phone && <span>{data.personalInfo.phone}</span>}
          {data.personalInfo.phone && data.personalInfo.email && <span>|</span>}
          {data.personalInfo.email && <span>{data.personalInfo.email}</span>}
          {data.personalInfo.linkedin && <span>| {data.personalInfo.linkedin}</span>}
        </div>
      </header>

      {/* Summary — kept short, no heading; Harvard avoids "Summary" but a brief intro is common */}
      {data.personalInfo.summary && (
        <section className="mb-6">
          <p className="text-sm leading-relaxed">{data.personalInfo.summary}</p>
        </section>
      )}

      {/* Education — FIRST per Harvard convention */}
      {data.education.length > 0 && (
        <section className="mb-6">
          <h3 className="text-md font-bold uppercase border-b border-black pb-1 mb-3">Education</h3>
          <div className="space-y-4">
            {data.education.map((edu) => (
              <div key={edu.id}>
                <div className="flex justify-between items-baseline">
                  <h4 className="font-bold text-sm">{edu.institution}</h4>
                  <span className="text-sm">{edu.startDate} – {edu.endDate}</span>
                </div>
                <div className="text-sm italic mb-1">{edu.degree}</div>
                {edu.description && <p className="text-sm leading-relaxed">{edu.description}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Experience */}
      {data.experience.length > 0 && (
        <section className="mb-6">
          <h3 className="text-md font-bold uppercase border-b border-black pb-1 mb-3">Experience</h3>
          <div className="space-y-4">
            {data.experience.map((exp) => (
              <div key={exp.id}>
                <div className="flex justify-between items-baseline">
                  <h4 className="font-bold text-sm">{exp.company}</h4>
                  <span className="text-sm">{exp.startDate} – {exp.endDate}</span>
                </div>
                <div className="text-sm italic mb-1">{exp.role}</div>
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

      {/* Projects / Research */}
      {data.projects.length > 0 && (
        <section className="mb-6">
          <h3 className="text-md font-bold uppercase border-b border-black pb-1 mb-3">Projects &amp; Research</h3>
          <div className="space-y-4">
            {data.projects.map((proj) => (
              <div key={proj.id}>
                <h4 className="font-bold text-sm">{proj.name} {proj.link && <span className="font-normal italic">({proj.link})</span>}</h4>
                <p className="text-sm leading-relaxed mb-1">{proj.description}</p>
                {(proj.technologies || []).length > 0 && (
                  <p className="text-xs italic">Tools: {proj.technologies.join(', ')}</p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Skills & Interests */}
      {data.skills.length > 0 && (
        <section className="mb-6">
          <h3 className="text-md font-bold uppercase border-b border-black pb-1 mb-3">Skills &amp; Interests</h3>
          <p className="text-sm leading-relaxed">
            <span className="font-bold">Technical: </span>
            {data.skills.join(', ')}
          </p>
        </section>
      )}

      {/* Languages */}
      {(data.languages || []).length > 0 && (
        <section className="mb-6">
          <h3 className="text-md font-bold uppercase border-b border-black pb-1 mb-3">Languages</h3>
          <p className="text-sm leading-relaxed">
            {(data.languages || []).map((lang) => `${lang.name} (${lang.level})`).join(', ')}
          </p>
        </section>
      )}

      {/* References */}
      {data.references !== undefined && (
        <section>
          <h3 className="text-md font-bold uppercase border-b border-black pb-1 mb-3">References</h3>
          {(data.references || []).length === 0 ? (
            <p className="text-sm italic">Available upon request.</p>
          ) : (
            <div className="space-y-3 text-sm">
              {(data.references || []).map((ref) => (
                <div key={ref.id}>
                  <span className="font-bold">{ref.name}</span>
                  {(ref.role || ref.organization) && <span>, {[ref.role, ref.organization].filter(Boolean).join(', ')}</span>}
                  {(ref.email || ref.phone) && <span className="block text-xs">{[ref.email, ref.phone].filter(Boolean).join(' | ')}</span>}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
