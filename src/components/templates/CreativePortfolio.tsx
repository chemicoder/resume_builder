import React from 'react';
import { ResumeData } from '../../types';
import { Mail, Phone, MapPin, Globe, Linkedin, Github } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function CreativePortfolio({ data }: { data: ResumeData }) {
  const primaryColor = data.theme?.primary || '#f43f5e'; // rose-500
  const accentColor = data.theme?.accent || '#fb7185';

  return (
    <div data-resume-page className="w-full max-w-[800px] mx-auto bg-[#fafafa] shadow-lg min-h-[1056px] text-gray-800 font-sans overflow-hidden">
      {/* Hero Section */}
      <div className="relative p-12 text-white overflow-hidden" style={{ backgroundColor: primaryColor }}>
        {/* Decorative circle */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full -translate-y-1/2 translate-x-1/3"></div>
        
        <div className="relative z-10 flex items-center gap-8">
          {data.personalInfo.profilePicture && (
            <img src={data.personalInfo.profilePicture} alt="Profile" className="w-32 h-32 rounded-2xl object-cover border-4 border-white/20 shadow-xl rotate-3" />
          )}
          <div className="flex-1">
            <h1 className="text-5xl font-black tracking-tight mb-2">{data.personalInfo.fullName}</h1>
            <h2 className="text-2xl font-medium opacity-90 mb-4">{data.personalInfo.jobTitle}</h2>
            <div className="flex flex-wrap gap-4 text-sm opacity-80">
              {data.personalInfo.location && <span className="flex items-center gap-1"><MapPin size={14} /> {data.personalInfo.location}</span>}
              {data.personalInfo.website && <span className="flex items-center gap-1"><Globe size={14} /> {data.personalInfo.website}</span>}
            </div>
          </div>
          {data.showQrCode && data.qrCodeLink && (
            <div className="bg-white p-2 rounded-xl shadow-lg rotate-[-2deg]">
              <QRCodeSVG value={data.qrCodeLink} size={80} fgColor={data.theme.qrCodeColor || '#000000'} />
            </div>
          )}
        </div>
      </div>

      <div className="p-12">
        {/* About & Contact */}
        <div className="grid grid-cols-3 gap-8 mb-12">
          <div className="col-span-2">
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2" style={{ color: primaryColor }}>
              About Me
            </h3>
            <p className="text-gray-600 leading-relaxed text-lg">{data.personalInfo.summary}</p>
          </div>
          <div className="space-y-3 text-sm text-gray-600 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h4 className="font-bold text-gray-900 mb-3 uppercase tracking-wider text-xs">Contact</h4>
            {data.personalInfo.email && <div className="flex items-center gap-2"><Mail size={16} style={{ color: primaryColor }} /> <span className="break-all">{data.personalInfo.email}</span></div>}
            {data.personalInfo.phone && <div className="flex items-center gap-2"><Phone size={16} style={{ color: primaryColor }} /> <span>{data.personalInfo.phone}</span></div>}
            {data.personalInfo.linkedin && <div className="flex items-center gap-2"><Linkedin size={16} style={{ color: primaryColor }} /> <span className="break-all">{data.personalInfo.linkedin}</span></div>}
            {data.personalInfo.github && <div className="flex items-center gap-2"><Github size={16} style={{ color: primaryColor }} /> <span className="break-all">{data.personalInfo.github}</span></div>}
          </div>
        </div>

        {/* Selected Projects */}
        {data.projects.length > 0 && (
          <div className="mb-12">
            <h3 className="text-3xl font-black mb-6" style={{ color: primaryColor }}>Selected Works</h3>
            <div className="grid grid-cols-2 gap-6">
              {data.projects.map((proj) => (
                <div key={proj.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <h4 className="text-xl font-bold mb-2 text-gray-900">{proj.name}</h4>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">{proj.description}</p>
                  {(proj.technologies || []).length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {(proj.technologies || []).map((tech, i) => (
                        <span key={i} className="text-xs px-2 py-1 rounded-md font-medium" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}>
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                  {proj.link && (
                    <a href={`https://${proj.link}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-bold hover:underline" style={{ color: accentColor }}>
                      View Project <Globe size={14} />
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Experience & Skills */}
        <div className="grid grid-cols-2 gap-12">
          {data.experience.length > 0 && (
            <div>
              <h3 className="text-2xl font-bold mb-6" style={{ color: primaryColor }}>Experience</h3>
              <div className="space-y-6">
                {data.experience.map((exp) => (
                  <div key={exp.id} className="relative pl-6 border-l-2" style={{ borderColor: `${primaryColor}30` }}>
                    <div className="absolute w-3 h-3 rounded-full -left-[7px] top-1.5" style={{ backgroundColor: primaryColor }}></div>
                    <h4 className="font-bold text-gray-900">{exp.role}</h4>
                    <div className="text-sm font-medium mb-2" style={{ color: accentColor }}>{exp.company} <span className="text-gray-400 font-normal ml-2">{exp.startDate} - {exp.endDate}</span></div>
                    <ul className="list-disc list-outside ml-4 space-y-1 text-sm text-gray-600">
                      {exp.description.split('\n').filter(line => line.trim()).map((line, i) => (
                        <li key={i}>{line.replace(/^[•\-\*]\s*/, '')}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            {data.skills.length > 0 && (
              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-6" style={{ color: primaryColor }}>Expertise</h3>
                <div className="flex flex-wrap gap-2">
                  {data.skills.map((skill, index) => (
                    <span key={index} className="px-4 py-2 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-700 shadow-sm">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {data.education.length > 0 && (
              <div className="mb-8">
                <h3 className="text-2xl font-bold mb-6" style={{ color: primaryColor }}>Education</h3>
                <div className="space-y-4">
                  {data.education.map((edu) => (
                    <div key={edu.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                      <h4 className="font-bold text-gray-900">{edu.degree}</h4>
                      <div className="text-sm text-gray-600 mb-1">{edu.institution}</div>
                      <div className="text-xs text-gray-400">{edu.startDate} - {edu.endDate}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {(data.languages || []).length > 0 && (
              <div>
                <h3 className="text-2xl font-bold mb-6" style={{ color: primaryColor }}>Languages</h3>
                <div className="space-y-2">
                  {(data.languages || []).map((lang) => (
                    <div key={lang.id} className="bg-white px-4 py-2 rounded-lg border border-gray-100 shadow-sm flex justify-between text-sm">
                      <span className="font-medium text-gray-800">{lang.name}</span>
                      <span className="text-gray-500">{lang.level}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {data.references !== undefined && (
          <div className="mt-12">
            <h3 className="text-2xl font-bold mb-6" style={{ color: primaryColor }}>References</h3>
            {(data.references || []).length === 0 ? (
              <p className="text-gray-600 italic">Available on request.</p>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                {(data.references || []).map((ref) => (
                  <div key={ref.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                    <div className="font-bold text-gray-900">{ref.name}</div>
                    {(ref.role || ref.organization) && <div className="text-sm" style={{ color: accentColor }}>{[ref.role, ref.organization].filter(Boolean).join(', ')}</div>}
                    {ref.email && <div className="text-xs text-gray-500 mt-1">{ref.email}</div>}
                    {ref.phone && <div className="text-xs text-gray-500">{ref.phone}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
