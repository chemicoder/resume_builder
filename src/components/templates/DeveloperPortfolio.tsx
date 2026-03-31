import React from 'react';
import { ResumeData } from '../../types';
import { Mail, Phone, MapPin, Globe, Linkedin, Github, Terminal, Code2, Cpu } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

export default function DeveloperPortfolio({ data }: { data: ResumeData }) {
  const primaryColor = data.theme?.primary || '#10b981'; // emerald-500
  const accentColor = data.theme?.accent || '#34d399';

  return (
    <div className="w-full max-w-[800px] mx-auto bg-[#0f172a] shadow-2xl min-h-[1056px] text-slate-300 font-mono overflow-hidden border border-slate-800 rounded-lg">
      {/* Terminal Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-red-500"></div>
        <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
        <div className="w-3 h-3 rounded-full bg-green-500"></div>
        <span className="ml-4 text-xs text-slate-500">~/portfolio/{data.personalInfo.fullName.toLowerCase().replace(/\s+/g, '-')}</span>
      </div>

      <div className="p-10">
        {/* Hero */}
        <div className="flex items-start justify-between mb-12 border-b border-slate-800 pb-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Terminal size={24} style={{ color: primaryColor }} />
              <h1 className="text-4xl font-bold text-slate-100">{data.personalInfo.fullName}</h1>
            </div>
            <h2 className="text-xl mb-6" style={{ color: accentColor }}>&gt; {data.personalInfo.jobTitle}</h2>
            
            <div className="space-y-2 text-sm">
              {data.personalInfo.email && <div className="flex items-center gap-2"><span className="text-slate-500">email:</span> <span className="text-slate-300">{data.personalInfo.email}</span></div>}
              {data.personalInfo.location && <div className="flex items-center gap-2"><span className="text-slate-500">location:</span> <span className="text-slate-300">{data.personalInfo.location}</span></div>}
              {data.personalInfo.github && <div className="flex items-center gap-2"><span className="text-slate-500">github:</span> <a href={`https://${data.personalInfo.github}`} className="hover:underline" style={{ color: primaryColor }}>{data.personalInfo.github}</a></div>}
              {data.personalInfo.linkedin && <div className="flex items-center gap-2"><span className="text-slate-500">linkedin:</span> <a href={`https://${data.personalInfo.linkedin}`} className="hover:underline" style={{ color: primaryColor }}>{data.personalInfo.linkedin}</a></div>}
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-4">
            {data.personalInfo.profilePicture && (
              <img src={data.personalInfo.profilePicture} alt="Profile" className="w-28 h-28 rounded-lg object-cover border-2 border-slate-700 grayscale hover:grayscale-0 transition-all duration-500" />
            )}
            {data.showQrCode && data.qrCodeLink && (
              <div className="bg-slate-800 p-2 rounded-lg border border-slate-700">
                <QRCodeSVG value={data.qrCodeLink} size={64} bgColor="transparent" fgColor={data.theme.qrCodeColor || primaryColor} />
              </div>
            )}
          </div>
        </div>

        {/* About */}
        {data.personalInfo.summary && (
          <div className="mb-10">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-100">
              <span style={{ color: primaryColor }}>$</span> cat about.txt
            </h3>
            <p className="text-sm leading-relaxed text-slate-400 pl-4 border-l-2 border-slate-800">{data.personalInfo.summary}</p>
          </div>
        )}

        {/* Skills */}
        {data.skills.length > 0 && (
          <div className="mb-10">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2 text-slate-100">
              <span style={{ color: primaryColor }}>$</span> ls ./skills
            </h3>
            <div className="flex flex-wrap gap-3 pl-4">
              {data.skills.map((skill, index) => (
                <span key={index} className="text-xs px-3 py-1 bg-slate-800 border border-slate-700 rounded text-slate-300">
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Projects */}
        {data.projects.length > 0 && (
          <div className="mb-10">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-100">
              <span style={{ color: primaryColor }}>$</span> ./run_projects.sh
            </h3>
            <div className="grid grid-cols-1 gap-6 pl-4">
              {data.projects.map((proj) => (
                <div key={proj.id} className="bg-slate-800/50 border border-slate-700 p-5 rounded-lg hover:border-slate-500 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="text-lg font-bold text-slate-100 flex items-center gap-2">
                      <Code2 size={18} style={{ color: primaryColor }} />
                      {proj.name}
                    </h4>
                    {proj.link && (
                      <a href={`https://${proj.link}`} target="_blank" rel="noreferrer" className="text-xs hover:underline flex items-center gap-1" style={{ color: accentColor }}>
                        [source] <Globe size={12} />
                      </a>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 mb-4">{proj.description}</p>
                  {proj.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {proj.technologies.map((tech, i) => (
                        <span key={i} className="text-[10px] uppercase tracking-wider px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-slate-400">
                          {tech}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Experience */}
        {data.experience.length > 0 && (
          <div className="mb-10">
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-100">
              <span style={{ color: primaryColor }}>$</span> tail -f experience.log
            </h3>
            <div className="space-y-8 pl-4">
              {data.experience.map((exp) => (
                <div key={exp.id} className="relative pl-6 border-l border-slate-700">
                  <div className="absolute w-2 h-2 rounded-full -left-[4.5px] top-2" style={{ backgroundColor: primaryColor }}></div>
                  <div className="flex flex-wrap justify-between items-baseline mb-2">
                    <h4 className="font-bold text-slate-100 text-base">{exp.role}</h4>
                    <span className="text-xs text-slate-500 font-sans">[{exp.startDate} - {exp.endDate}]</span>
                  </div>
                  <div className="text-sm mb-3" style={{ color: accentColor }}>@ {exp.company}</div>
                  <ul className="list-none space-y-2 text-sm text-slate-400">
                    {exp.description.split('\n').filter(line => line.trim()).map((line, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-slate-600 mt-0.5">&gt;</span>
                        <span>{line.replace(/^[•\-\*]\s*/, '')}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {data.education.length > 0 && (
          <div>
            <h3 className="text-lg font-bold mb-6 flex items-center gap-2 text-slate-100">
              <span style={{ color: primaryColor }}>$</span> cat education.json
            </h3>
            <div className="space-y-4 pl-4">
              {data.education.map((edu) => (
                <div key={edu.id} className="bg-slate-800/30 border border-slate-700 p-4 rounded-lg">
                  <div className="text-slate-300 font-bold mb-1">{edu.degree}</div>
                  <div className="text-sm text-slate-500 mb-2">{edu.institution}</div>
                  <div className="text-xs text-slate-600">/* {edu.startDate} - {edu.endDate} */</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
