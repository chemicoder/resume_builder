import React from 'react';
import { ResumeData } from '../../types';
import { Mail, Phone, MapPin, Globe, Linkedin, Github, ExternalLink } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { cssFontStack } from '../../lib/fonts';

export default function GridPortfolio({ data }: { data: ResumeData }) {
  const primaryColor = data.theme?.primary || '#2563eb'; // blue-600
  const accentColor = data.theme?.accent || '#3b82f6'; // blue-500

  return (
    <div data-resume-page className="w-full max-w-[1000px] mx-auto bg-[#f8f9fa] shadow-xl min-h-[1056px] font-sans text-gray-800 p-8 md:p-12 relative" style={{ color: data.theme?.bodyText || undefined, fontFamily: cssFontStack(data.theme?.fontFamily) || undefined }}>
      {/* QR Code */}
      {data.showQrCode && data.qrCodeLink && (
        <div className="absolute top-8 right-8 bg-white p-2 rounded-lg shadow-md border border-gray-100 z-20">
          <QRCodeSVG value={data.qrCodeLink} size={64} fgColor={data.theme.qrCodeColor || primaryColor} />
        </div>
      )}

      {/* Hero Section */}
      <header className="text-center mb-16 relative z-10">
        {data.personalInfo.profilePicture && (
          <img src={data.personalInfo.profilePicture} alt="Profile" className="w-32 h-32 rounded-full object-cover mx-auto mb-6 shadow-md border-4 border-white" />
        )}
        <h1 className="text-5xl font-black tracking-tight text-gray-900 mb-4">{data.personalInfo.fullName}</h1>
        <h2 className="text-2xl font-medium mb-6" style={{ color: primaryColor }}>{data.personalInfo.jobTitle}</h2>
        <p className="max-w-2xl mx-auto text-lg text-gray-600 leading-relaxed mb-8">
          {data.personalInfo.summary}
        </p>
        <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-500">
          {data.personalInfo.email && (
            <a href={`mailto:${data.personalInfo.email}`} className="flex items-center gap-2 hover:opacity-80 transition-opacity" style={{ color: primaryColor }}><Mail size={18} /> {data.personalInfo.email}</a>
          )}
          {data.personalInfo.location && (
            <div className="flex items-center gap-2"><MapPin size={18} /> {data.personalInfo.location}</div>
          )}
          {data.personalInfo.github && (
            <a href={`https://${data.personalInfo.github}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:opacity-80 transition-opacity" style={{ color: primaryColor }}><Github size={18} /> GitHub</a>
          )}
          {data.personalInfo.linkedin && (
            <a href={`https://${data.personalInfo.linkedin}`} target="_blank" rel="noreferrer" className="flex items-center gap-2 hover:opacity-80 transition-opacity" style={{ color: primaryColor }}><Linkedin size={18} /> LinkedIn</a>
          )}
        </div>
      </header>

      {/* Projects Grid */}
      {data.projects.length > 0 && (
        <section className="mb-16">
          <h3 className="text-3xl font-bold mb-8 text-gray-900">Featured Work</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 print:grid-cols-2 gap-6">
            {data.projects.map((proj) => (
              <div key={proj.id} className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow flex flex-col h-full">
                <div className="flex justify-between items-start mb-4">
                  <h4 className="text-xl font-bold text-gray-900">{proj.name}</h4>
                  {proj.link && (
                    <a href={`https://${proj.link}`} target="_blank" rel="noreferrer" className="p-2 rounded-full hover:opacity-80 transition-opacity" style={{ color: primaryColor, backgroundColor: `${primaryColor}15` }}>
                      <ExternalLink size={16} />
                    </a>
                  )}
                </div>
                <p className="text-gray-600 mb-6 flex-grow">{proj.description}</p>
                <div className="flex flex-wrap gap-2 mt-auto">
                  {(proj.technologies || []).map((tech, i) => (
                    <span key={i} className="text-xs font-medium px-3 py-1 rounded-full" style={{ color: primaryColor, backgroundColor: `${primaryColor}10` }}>
                      {tech}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Experience & Skills Split */}
      <div className="grid grid-cols-1 md:grid-cols-3 print:grid-cols-3 gap-12 mb-16">
        <div className="md:col-span-2 print:col-span-2">
          {data.experience.length > 0 && (
            <section>
              <h3 className="text-2xl font-bold mb-6 text-gray-900">Experience</h3>
              <div className="space-y-8">
                {data.experience.map((exp) => (
                  <div key={exp.id} className="relative">
                    <h4 className="text-lg font-bold text-gray-900">{exp.role}</h4>
                    <div className="font-medium mb-2" style={{ color: primaryColor }}>{exp.company} <span className="text-gray-400 mx-2">|</span> <span className="text-gray-500 text-sm">{exp.startDate} - {exp.endDate}</span></div>
                    <ul className="list-disc list-outside ml-4 space-y-1 text-gray-600 leading-relaxed">
                      {exp.description.split('\n').filter(line => line.trim()).map((line, i) => (
                        <li key={i}>{line.replace(/^[•\-\*]\s*/, '')}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
        
        <div>
          {data.skills.length > 0 && (
            <section className="mb-12">
              <h3 className="text-2xl font-bold mb-6 text-gray-900">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {data.skills.map((skill, index) => (
                  <span key={index} className="bg-white border text-gray-700 px-4 py-2 rounded-lg text-sm font-medium shadow-sm" style={{ borderColor: `${primaryColor}30` }}>
                    {skill}
                  </span>
                ))}
              </div>
            </section>
          )}

          {data.education.length > 0 && (
            <section className="mb-12">
              <h3 className="text-2xl font-bold mb-6 text-gray-900">Education</h3>
              <div className="space-y-6">
                {data.education.map((edu) => (
                  <div key={edu.id} className="bg-white p-5 rounded-xl border shadow-sm" style={{ borderColor: `${primaryColor}20` }}>
                    <h4 className="font-bold text-gray-900 mb-1">{edu.degree}</h4>
                    <div className="text-gray-600 text-sm mb-2">{edu.institution}</div>
                    <div className="text-gray-400 text-xs">{edu.startDate} - {edu.endDate}</div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {(data.languages || []).length > 0 && (
            <section>
              <h3 className="text-2xl font-bold mb-6 text-gray-900">Languages</h3>
              <div className="space-y-2">
                {(data.languages || []).map((lang) => (
                  <div key={lang.id} className="bg-white px-4 py-2 rounded-lg border shadow-sm flex justify-between text-sm" style={{ borderColor: `${primaryColor}20` }}>
                    <span className="font-medium text-gray-800">{lang.name}</span>
                    <span className="text-gray-500">{lang.level}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {data.references !== undefined && (
        <section className="mt-4">
          <h3 className="text-2xl font-bold mb-6 text-gray-900">References</h3>
          {(data.references || []).length === 0 ? (
            <p className="text-gray-600 italic">Available on request.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(data.references || []).map((ref) => (
                <div key={ref.id} className="bg-white p-5 rounded-xl border shadow-sm" style={{ borderColor: `${primaryColor}20` }}>
                  <div className="font-bold text-gray-900">{ref.name}</div>
                  {(ref.role || ref.organization) && <div className="text-sm text-gray-600 mb-1">{[ref.role, ref.organization].filter(Boolean).join(', ')}</div>}
                  {ref.email && <div className="text-xs text-gray-500">{ref.email}</div>}
                  {ref.phone && <div className="text-xs text-gray-500">{ref.phone}</div>}
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
