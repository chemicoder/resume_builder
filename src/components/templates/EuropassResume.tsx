import React from 'react';
import { ResumeData } from '../../types';
import { Mail, Phone, MapPin, Globe, Linkedin, Github } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function EuropassResume({ data }: { data: ResumeData }) {
  const primaryColor = data.theme?.primary || '#004494';
  const accentColor = data.theme?.accent || '#0056b3';

  return (
    <div data-resume-page className="w-full max-w-[800px] mx-auto bg-white shadow-lg min-h-[1056px] font-sans text-gray-800">
      {/* Header */}
      <header className="text-white p-8 flex items-center justify-between gap-6" style={{ backgroundColor: primaryColor }}>
        <div className="flex items-center gap-6">
          {data.personalInfo.profilePicture && (
            <img src={data.personalInfo.profilePicture} alt="Profile" className="w-24 h-24 rounded-full border-2 border-white object-cover" />
          )}
          <div>
            <h1 className="text-3xl font-bold mb-1">{data.personalInfo.fullName}</h1>
            <h2 className="text-xl opacity-80">{data.personalInfo.jobTitle}</h2>
          </div>
        </div>
        {data.showQrCode && data.qrCodeLink && (
          <div className="bg-white p-2 rounded-lg">
            <QRCodeSVG value={data.qrCodeLink} size={64} fgColor={data.theme.qrCodeColor || primaryColor} />
          </div>
        )}
      </header>

      <div className="p-8">
        {/* Contact Info */}
        <div className="grid grid-cols-[1fr_3fr] gap-6 mb-6">
          <div className="font-bold text-right uppercase text-sm pt-1" style={{ color: primaryColor }}>Personal Info</div>
          <div className="text-sm space-y-1">
            {data.personalInfo.location && <div><span className="font-semibold">Address:</span> {data.personalInfo.location}</div>}
            {data.personalInfo.email && <div><span className="font-semibold">Email:</span> {data.personalInfo.email}</div>}
            {data.personalInfo.phone && <div><span className="font-semibold">Phone:</span> {data.personalInfo.phone}</div>}
            {data.personalInfo.linkedin && <div><span className="font-semibold">LinkedIn:</span> {data.personalInfo.linkedin}</div>}
            {data.personalInfo.github && <div><span className="font-semibold">GitHub:</span> {data.personalInfo.github}</div>}
            {data.personalInfo.website && <div><span className="font-semibold">Website:</span> {data.personalInfo.website}</div>}
          </div>
        </div>

        {/* Summary */}
        {data.personalInfo.summary && (
          <div className="grid grid-cols-[1fr_3fr] gap-6 mb-6">
            <div className="font-bold text-right uppercase text-sm pt-1" style={{ color: primaryColor }}>Summary</div>
            <div className="text-sm leading-relaxed">{data.personalInfo.summary}</div>
          </div>
        )}

        {/* Work Experience */}
        {data.experience.length > 0 && (
          <div className="grid grid-cols-[1fr_3fr] gap-6 mb-6">
            <div className="font-bold text-right uppercase text-sm pt-1" style={{ color: primaryColor }}>Work Experience</div>
            <div className="space-y-4">
              {data.experience.map((exp) => (
                <div key={exp.id}>
                  <div className="text-sm text-gray-500 mb-1">{exp.startDate} - {exp.endDate}</div>
                  <h4 className="font-bold text-base">{exp.role}</h4>
                  <div className="text-sm font-medium mb-1" style={{ color: accentColor }}>{exp.company}</div>
                  <ul className="list-disc list-outside ml-4 space-y-1 text-sm leading-relaxed">
                    {exp.description.split('\n').filter(line => line.trim()).map((line, i) => (
                      <li key={i}>{line.replace(/^[•\-\*]\s*/, '')}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {data.education.length > 0 && (
          <div className="grid grid-cols-[1fr_3fr] gap-6 mb-6">
            <div className="font-bold text-right uppercase text-sm pt-1" style={{ color: primaryColor }}>Education</div>
            <div className="space-y-4">
              {data.education.map((edu) => (
                <div key={edu.id}>
                  <div className="text-sm text-gray-500 mb-1">{edu.startDate} - {edu.endDate}</div>
                  <h4 className="font-bold text-base">{edu.degree}</h4>
                  <div className="text-sm font-medium mb-1" style={{ color: accentColor }}>{edu.institution}</div>
                  <p className="text-sm leading-relaxed">{edu.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Projects */}
        {data.projects.length > 0 && (
          <div className="grid grid-cols-[1fr_3fr] gap-6 mb-6">
            <div className="font-bold text-right uppercase text-sm pt-1" style={{ color: primaryColor }}>Projects</div>
            <div className="space-y-4">
              {data.projects.map((proj) => (
                <div key={proj.id}>
                  <h4 className="font-bold text-base">{proj.name} {proj.link && <span className="text-xs font-normal" style={{ color: accentColor }}>({proj.link})</span>}</h4>
                  <p className="text-sm leading-relaxed mb-1">{proj.description}</p>
                  <p className="text-xs text-gray-500 italic">Tech: {proj.technologies.join(', ')}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Skills */}
        {data.skills.length > 0 && (
          <div className="grid grid-cols-[1fr_3fr] gap-6 mb-6">
            <div className="font-bold text-right uppercase text-sm pt-1" style={{ color: primaryColor }}>Skills</div>
            <div className="text-sm leading-relaxed">
              {data.skills.join(', ')}
            </div>
          </div>
        )}

        {/* Languages — formal Europass self-assessment table.
            Real Europass splits each language into Understanding (Listening +
            Reading), Speaking (Interaction + Production), Writing. Per-skill
            CEFR levels (lang.skills.*) override the overall lang.level when
            set; otherwise overall level fills every cell. */}
        {(data.languages || []).length > 0 && (
          <div className="grid grid-cols-[1fr_3fr] gap-6 mb-6">
            <div className="font-bold text-right uppercase text-sm pt-1" style={{ color: primaryColor }}>Languages</div>
            <div className="text-sm">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="text-xs uppercase" style={{ color: primaryColor }}>
                    <th className="text-left py-1 pr-2 font-semibold">Mother tongue</th>
                    <th colSpan={2} className="text-center py-1 px-2 font-semibold border-l" style={{ borderColor: `${primaryColor}30` }}>Understanding</th>
                    <th colSpan={2} className="text-center py-1 px-2 font-semibold border-l" style={{ borderColor: `${primaryColor}30` }}>Speaking</th>
                    <th className="text-center py-1 px-2 font-semibold border-l" style={{ borderColor: `${primaryColor}30` }}>Writing</th>
                  </tr>
                  <tr className="text-[10px] text-gray-500">
                    <th />
                    <th className="text-center font-normal py-1 border-l" style={{ borderColor: `${primaryColor}30` }}>Listening</th>
                    <th className="text-center font-normal py-1">Reading</th>
                    <th className="text-center font-normal py-1 border-l" style={{ borderColor: `${primaryColor}30` }}>Interaction</th>
                    <th className="text-center font-normal py-1">Production</th>
                    <th className="text-center font-normal py-1 border-l" style={{ borderColor: `${primaryColor}30` }} />
                  </tr>
                </thead>
                <tbody>
                  {(data.languages || []).map((lang) => {
                    const s = lang.skills || {};
                    return (
                      <tr key={lang.id} className="border-t" style={{ borderColor: `${primaryColor}20` }}>
                        <td className="py-1 pr-2 font-semibold">{lang.name}</td>
                        <td className="text-center py-1 border-l" style={{ borderColor: `${primaryColor}30` }}>{s.listening || lang.level}</td>
                        <td className="text-center py-1">{s.reading || lang.level}</td>
                        <td className="text-center py-1 border-l" style={{ borderColor: `${primaryColor}30` }}>{s.spokenInteraction || lang.level}</td>
                        <td className="text-center py-1">{s.spokenProduction || lang.level}</td>
                        <td className="text-center py-1 border-l" style={{ borderColor: `${primaryColor}30` }}>{s.writing || lang.level}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="text-[10px] text-gray-500 mt-1 italic">Levels: A1/A2 Basic · B1/B2 Independent · C1/C2 Proficient (Common European Framework of Reference)</p>
            </div>
          </div>
        )}

        {/* References */}
        {data.references !== undefined && (
          <div className="grid grid-cols-[1fr_3fr] gap-6 mb-6">
            <div className="font-bold text-right uppercase text-sm pt-1" style={{ color: primaryColor }}>References</div>
            <div className="text-sm leading-relaxed">
              {(data.references || []).length === 0 ? (
                <p className="italic text-gray-600">Available on request.</p>
              ) : (
                <ul className="space-y-3">
                  {(data.references || []).map((ref) => (
                    <li key={ref.id}>
                      <div className="font-bold">{ref.name}</div>
                      {(ref.role || ref.organization) && <div>{[ref.role, ref.organization].filter(Boolean).join(', ')}</div>}
                      {(ref.email || ref.phone) && <div className="text-gray-600 text-xs">{[ref.email, ref.phone].filter(Boolean).join(' • ')}</div>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
