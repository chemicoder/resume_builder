import React from 'react';
import { ResumeData } from '../../types';
import { Mail, Phone, MapPin, Globe, Linkedin, Github, Sparkles, Briefcase, GraduationCap, Code2 } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

type ExpressiveVariant =
  | 'editorial'
  | 'luxe'
  | 'spectrum'
  | 'timeline'
  | 'compact'
  | 'executive'
  | 'atelier'
  | 'architect'
  | 'consultant'
  | 'magazine'
  | 'neoclassic';

interface ExpressiveResumeProps {
  data: ResumeData;
  variant: ExpressiveVariant;
}

const variantConfig: Record<ExpressiveVariant, {
  name: string;
  pageClass: string;
  fontFamily: string;
  primary: string;
  accent: string;
  muted: string;
}> = {
  editorial: {
    name: 'Editorial',
    pageClass: 'bg-[#fffdf8] text-[#171717]',
    fontFamily: 'Georgia, Cambria, "Times New Roman", serif',
    primary: '#be123c',
    accent: '#0f766e',
    muted: '#6b7280',
  },
  luxe: {
    name: 'Luxe',
    pageClass: 'bg-[#111111] text-[#f8fafc]',
    fontFamily: '"Trebuchet MS", "Segoe UI", sans-serif',
    primary: '#d4af37',
    accent: '#38bdf8',
    muted: '#a3a3a3',
  },
  spectrum: {
    name: 'Spectrum',
    pageClass: 'bg-[#f7fbff] text-slate-900',
    fontFamily: '"Segoe UI", Inter, Arial, sans-serif',
    primary: '#7c3aed',
    accent: '#f97316',
    muted: '#475569',
  },
  timeline: {
    name: 'Timeline',
    pageClass: 'bg-white text-zinc-900',
    fontFamily: '"Arial Narrow", Arial, sans-serif',
    primary: '#0f766e',
    accent: '#ea580c',
    muted: '#52525b',
  },
  compact: {
    name: 'Compact',
    pageClass: 'bg-[#f4f4f5] text-zinc-950',
    fontFamily: 'Consolas, "Courier New", monospace',
    primary: '#18181b',
    accent: '#dc2626',
    muted: '#52525b',
  },
  executive: {
    name: 'Executive',
    pageClass: 'bg-[#fbfbf9] text-[#1f2933]',
    fontFamily: '"Segoe UI", Arial, sans-serif',
    primary: '#243b53',
    accent: '#b7791f',
    muted: '#52606d',
  },
  atelier: {
    name: 'Atelier',
    pageClass: 'bg-[#fff8f1] text-[#27211d]',
    fontFamily: '"Palatino Linotype", Palatino, Georgia, serif',
    primary: '#9f1239',
    accent: '#0369a1',
    muted: '#78716c',
  },
  architect: {
    name: 'Architect',
    pageClass: 'bg-[#f9fafb] text-[#111827]',
    fontFamily: '"Century Gothic", "Segoe UI", Arial, sans-serif',
    primary: '#334155',
    accent: '#059669',
    muted: '#64748b',
  },
  consultant: {
    name: 'Consultant',
    pageClass: 'bg-white text-[#172033]',
    fontFamily: '"Segoe UI", Arial, sans-serif',
    primary: '#1d4ed8',
    accent: '#0f766e',
    muted: '#475569',
  },
  magazine: {
    name: 'Magazine',
    pageClass: 'bg-[#fcfcfc] text-[#171717]',
    fontFamily: '"Arial Black", Arial, sans-serif',
    primary: '#111827',
    accent: '#e11d48',
    muted: '#525252',
  },
  neoclassic: {
    name: 'Neo Classic',
    pageClass: 'bg-[#fffefa] text-[#1c1917]',
    fontFamily: 'Garamond, Georgia, serif',
    primary: '#7f1d1d',
    accent: '#1e3a8a',
    muted: '#57534e',
  },
};

function lines(description: string) {
  return description
    .split('\n')
    .map((line) => line.replace(/^[\u2022\-*]\s*/, '').trim())
    .filter(Boolean);
}

function ContactRow({ data, color, compact = false }: { data: ResumeData; color: string; compact?: boolean }) {
  const contactItems = [
    data.personalInfo.email && { icon: Mail, value: data.personalInfo.email },
    data.personalInfo.phone && { icon: Phone, value: data.personalInfo.phone },
    data.personalInfo.location && { icon: MapPin, value: data.personalInfo.location },
    data.personalInfo.website && { icon: Globe, value: data.personalInfo.website },
    data.personalInfo.linkedin && { icon: Linkedin, value: data.personalInfo.linkedin },
    data.personalInfo.github && { icon: Github, value: data.personalInfo.github },
  ].filter(Boolean) as { icon: typeof Mail; value: string }[];

  return (
    <div className={`flex flex-wrap ${compact ? 'gap-x-4 gap-y-1 text-[11px]' : 'gap-3 text-xs'}`}>
      {contactItems.map(({ icon: Icon, value }) => (
        <div key={value} className="flex items-center gap-1.5 min-w-0">
          <Icon size={compact ? 12 : 14} style={{ color }} />
          <span className="break-all">{value}</span>
        </div>
      ))}
    </div>
  );
}

function SectionTitle({ children, color, icon: Icon }: { children: React.ReactNode; color: string; icon?: typeof Briefcase }) {
  return (
    <h3 className="text-sm font-black uppercase tracking-[0.18em] mb-4 flex items-center gap-2" style={{ color }}>
      {Icon && <Icon size={16} />}
      {children}
    </h3>
  );
}

function ExperienceList({ data, color, muted }: { data: ResumeData; color: string; muted: string }) {
  return (
    <div className="space-y-5">
      {data.experience.map((exp) => (
        <div key={exp.id} className="break-inside-avoid">
          <div className="flex justify-between gap-4 items-baseline">
            <h4 className="font-black text-base" style={{ color }}>{exp.role}</h4>
            <span className="text-xs whitespace-nowrap" style={{ color: muted }}>{exp.startDate} - {exp.endDate}</span>
          </div>
          <div className="text-sm font-semibold mb-2">{exp.company}</div>
          <ul className="space-y-1 text-sm leading-relaxed">
            {lines(exp.description).map((line, index) => (
              <li key={index} className="flex gap-2">
                <span style={{ color }}>-</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function ProjectGrid({ data, color, accent }: { data: ResumeData; color: string; accent: string }) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {data.projects.map((project) => (
        <div key={project.id} className="border p-4 bg-white/80 break-inside-avoid" style={{ borderColor: `${color}33` }}>
          <h4 className="font-black text-base mb-2" style={{ color }}>{project.name}</h4>
          <p className="text-xs leading-relaxed mb-3">{project.description}</p>
          {(project.technologies || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {project.technologies.map((tech) => (
                <span key={tech} className="text-[10px] uppercase px-2 py-0.5" style={{ backgroundColor: `${accent}22`, color }}>
                  {tech}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SideDetails({ data, color, accent, dark = false }: { data: ResumeData; color: string; accent: string; dark?: boolean }) {
  const textColor = dark ? '#e5e7eb' : '#27272a';
  const mutedColor = dark ? '#a3a3a3' : '#52525b';

  return (
    <div className="space-y-7 text-sm" style={{ color: textColor }}>
      {data.skills.length > 0 && (
        <section>
          <SectionTitle color={accent} icon={Code2}>Skills</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {data.skills.map((skill) => (
              <span key={skill} className="px-2.5 py-1 text-xs border" style={{ borderColor: `${accent}66`, color: textColor }}>
                {skill}
              </span>
            ))}
          </div>
        </section>
      )}

      {data.education.length > 0 && (
        <section>
          <SectionTitle color={accent} icon={GraduationCap}>Education</SectionTitle>
          <div className="space-y-3">
            {data.education.map((edu) => (
              <div key={edu.id}>
                <div className="font-bold">{edu.degree}</div>
                <div style={{ color: mutedColor }}>{edu.institution}</div>
                <div className="text-xs" style={{ color }}>{edu.startDate} - {edu.endDate}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {(data.languages || []).length > 0 && (
        <section>
          <SectionTitle color={accent}>Languages</SectionTitle>
          <div className="space-y-1">
            {(data.languages || []).map((language) => (
              <div key={language.id} className="flex justify-between gap-3">
                <span>{language.name}</span>
                <span style={{ color: mutedColor }}>{language.level}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function References({ data, color }: { data: ResumeData; color: string }) {
  if (data.references === undefined) return null;

  return (
    <section>
      <SectionTitle color={color}>References</SectionTitle>
      {(data.references || []).length === 0 ? (
        <p className="text-sm italic">References available on request.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 text-xs">
          {(data.references || []).map((ref) => (
            <div key={ref.id} className="border p-3" style={{ borderColor: `${color}33` }}>
              <div className="font-bold">{ref.name}</div>
              {(ref.role || ref.organization) && <div>{[ref.role, ref.organization].filter(Boolean).join(', ')}</div>}
              {ref.email && <div>{ref.email}</div>}
              {ref.phone && <div>{ref.phone}</div>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function EditorialResume({ data, config }: { data: ResumeData; config: typeof variantConfig.editorial }) {
  return (
    <div data-resume-page className={`w-full max-w-[800px] mx-auto shadow-lg min-h-[1131px] p-12 ${config.pageClass}`} style={{ fontFamily: config.fontFamily }}>
      <header className="grid grid-cols-[1fr_180px] gap-8 border-b pb-8 mb-8" style={{ borderColor: `${config.primary}55` }}>
        <div>
          <div className="text-xs uppercase tracking-[0.35em] mb-4" style={{ color: config.accent }}>{config.name} Resume</div>
          <h1 className="text-6xl leading-none font-black mb-4">{data.personalInfo.fullName}</h1>
          <h2 className="text-2xl italic" style={{ color: config.primary }}>{data.personalInfo.jobTitle}</h2>
        </div>
        <div className="space-y-4">
          {data.personalInfo.profilePicture && <img src={data.personalInfo.profilePicture} alt="Profile" className="w-32 h-40 object-cover grayscale" />}
          {data.showQrCode && data.qrCodeLink && <QRCodeSVG value={data.qrCodeLink} size={72} fgColor={data.theme.qrCodeColor || config.primary} />}
        </div>
      </header>

      <div className="grid grid-cols-[1fr_245px] gap-10">
        <main className="space-y-8">
          {data.personalInfo.summary && (
            <section>
              <p className="text-xl leading-relaxed first-letter:text-6xl first-letter:font-black first-letter:float-left first-letter:mr-2" style={{ color: '#262626' }}>
                {data.personalInfo.summary}
              </p>
            </section>
          )}
          {data.experience.length > 0 && <section><SectionTitle color={config.primary} icon={Briefcase}>Experience</SectionTitle><ExperienceList data={data} color={config.primary} muted={config.muted} /></section>}
          {data.projects.length > 0 && <section><SectionTitle color={config.primary} icon={Sparkles}>Selected Work</SectionTitle><ProjectGrid data={data} color={config.primary} accent={config.accent} /></section>}
          <References data={data} color={config.primary} />
        </main>
        <aside className="border-l pl-7" style={{ borderColor: `${config.accent}55` }}>
          <div className="mb-8"><ContactRow data={data} color={config.primary} /></div>
          <SideDetails data={data} color={config.primary} accent={config.accent} />
        </aside>
      </div>
    </div>
  );
}

function LuxeResume({ data, config }: { data: ResumeData; config: typeof variantConfig.luxe }) {
  return (
    <div data-resume-page className={`w-full max-w-[800px] mx-auto shadow-2xl min-h-[1131px] ${config.pageClass}`} style={{ fontFamily: config.fontFamily }}>
      <div className="p-10 border-[14px] min-h-[1131px]" style={{ borderColor: config.primary }}>
        <header className="flex justify-between gap-8 mb-10">
          <div>
            <div className="text-xs uppercase tracking-[0.45em] mb-4" style={{ color: config.primary }}>Signature Profile</div>
            <h1 className="text-5xl font-black uppercase leading-tight mb-3">{data.personalInfo.fullName}</h1>
            <h2 className="text-xl" style={{ color: config.accent }}>{data.personalInfo.jobTitle}</h2>
          </div>
          <div className="flex flex-col items-end gap-4">
            {data.personalInfo.profilePicture && <img src={data.personalInfo.profilePicture} alt="Profile" className="w-28 h-28 rounded-full object-cover border-2" style={{ borderColor: config.primary }} />}
            {data.showQrCode && data.qrCodeLink && <div className="bg-white p-2"><QRCodeSVG value={data.qrCodeLink} size={64} fgColor={data.theme.qrCodeColor || '#111111'} /></div>}
          </div>
        </header>

        <div className="mb-10 text-zinc-300"><ContactRow data={data} color={config.primary} /></div>
        {data.personalInfo.summary && <p className="text-lg leading-relaxed mb-10 text-zinc-200">{data.personalInfo.summary}</p>}

        <div className="grid grid-cols-[1fr_250px] gap-10">
          <main className="space-y-9">
            {data.experience.length > 0 && <section><SectionTitle color={config.primary} icon={Briefcase}>Experience</SectionTitle><ExperienceList data={data} color={config.primary} muted={config.muted} /></section>}
            {data.projects.length > 0 && <section><SectionTitle color={config.primary} icon={Sparkles}>Projects</SectionTitle><div className="space-y-4">{data.projects.map((project) => <div key={project.id} className="border-b pb-4" style={{ borderColor: '#333333' }}><h4 className="font-black" style={{ color: config.primary }}>{project.name}</h4><p className="text-sm text-zinc-300">{project.description}</p></div>)}</div></section>}
            <References data={data} color={config.primary} />
          </main>
          <aside className="bg-white/5 p-6">
            <SideDetails data={data} color={config.primary} accent={config.primary} dark />
          </aside>
        </div>
      </div>
    </div>
  );
}

function SpectrumResume({ data, config }: { data: ResumeData; config: typeof variantConfig.spectrum }) {
  return (
    <div data-resume-page className={`w-full max-w-[800px] mx-auto shadow-xl min-h-[1131px] overflow-hidden ${config.pageClass}`} style={{ fontFamily: config.fontFamily }}>
      <header className="grid grid-cols-[290px_1fr] min-h-[280px]">
        <div className="p-10 text-white flex flex-col justify-between" style={{ background: `linear-gradient(135deg, ${config.primary}, ${config.accent})` }}>
          <div className="text-xs uppercase tracking-[0.35em]">Spectrum</div>
          {data.showQrCode && data.qrCodeLink && <div className="bg-white p-2 w-fit"><QRCodeSVG value={data.qrCodeLink} size={68} fgColor={data.theme.qrCodeColor || config.primary} /></div>}
        </div>
        <div className="p-10">
          <div className="flex gap-6 items-start">
            {data.personalInfo.profilePicture && <img src={data.personalInfo.profilePicture} alt="Profile" className="w-24 h-24 object-cover rounded-sm" />}
            <div>
              <h1 className="text-5xl font-black leading-none mb-4">{data.personalInfo.fullName}</h1>
              <h2 className="text-xl font-semibold mb-5" style={{ color: config.primary }}>{data.personalInfo.jobTitle}</h2>
              <ContactRow data={data} color={config.accent} compact />
            </div>
          </div>
        </div>
      </header>

      <div className="p-10 grid grid-cols-[1fr_245px] gap-9">
        <main className="space-y-8">
          {data.personalInfo.summary && <section className="text-base leading-relaxed border-l-4 pl-5" style={{ borderColor: config.accent }}>{data.personalInfo.summary}</section>}
          {data.experience.length > 0 && <section><SectionTitle color={config.primary} icon={Briefcase}>Experience</SectionTitle><ExperienceList data={data} color={config.primary} muted={config.muted} /></section>}
          {data.projects.length > 0 && <section><SectionTitle color={config.primary} icon={Sparkles}>Projects</SectionTitle><ProjectGrid data={data} color={config.primary} accent={config.accent} /></section>}
          <References data={data} color={config.primary} />
        </main>
        <aside>
          <SideDetails data={data} color={config.primary} accent={config.accent} />
        </aside>
      </div>
    </div>
  );
}

function TimelineResume({ data, config }: { data: ResumeData; config: typeof variantConfig.timeline }) {
  return (
    <div data-resume-page className={`w-full max-w-[800px] mx-auto shadow-lg min-h-[1131px] p-10 ${config.pageClass}`} style={{ fontFamily: config.fontFamily }}>
      <header className="flex justify-between gap-8 mb-9">
        <div>
          <h1 className="text-5xl font-black uppercase leading-none mb-3">{data.personalInfo.fullName}</h1>
          <h2 className="text-xl font-semibold" style={{ color: config.primary }}>{data.personalInfo.jobTitle}</h2>
        </div>
        <div className="text-right max-w-[260px]">
          <ContactRow data={data} color={config.accent} compact />
          {data.showQrCode && data.qrCodeLink && <div className="mt-4 flex justify-end"><QRCodeSVG value={data.qrCodeLink} size={64} fgColor={data.theme.qrCodeColor || config.primary} /></div>}
        </div>
      </header>

      {data.personalInfo.summary && <p className="text-lg leading-relaxed border-y py-5 mb-9" style={{ borderColor: `${config.primary}44` }}>{data.personalInfo.summary}</p>}

      <div className="grid grid-cols-[1fr_245px] gap-10">
        <main className="space-y-8">
          {data.experience.length > 0 && (
            <section>
              <SectionTitle color={config.primary} icon={Briefcase}>Career Timeline</SectionTitle>
              <div className="space-y-7">
                {data.experience.map((exp) => (
                  <div key={exp.id} className="grid grid-cols-[92px_1fr] gap-5 break-inside-avoid">
                    <div className="text-xs font-bold pt-1" style={{ color: config.accent }}>{exp.startDate}<br />{exp.endDate}</div>
                    <div className="border-l-2 pl-5 relative" style={{ borderColor: `${config.primary}55` }}>
                      <span className="absolute -left-[7px] top-1.5 w-3 h-3 rounded-full" style={{ backgroundColor: config.primary }} />
                      <h4 className="font-black">{exp.role}</h4>
                      <div className="text-sm font-semibold mb-2" style={{ color: config.primary }}>{exp.company}</div>
                      <ul className="text-sm leading-relaxed space-y-1">{lines(exp.description).map((line, index) => <li key={index}>- {line}</li>)}</ul>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
          {data.projects.length > 0 && <section><SectionTitle color={config.primary}>Projects</SectionTitle><ProjectGrid data={data} color={config.primary} accent={config.accent} /></section>}
          <References data={data} color={config.primary} />
        </main>
        <aside>
          <SideDetails data={data} color={config.primary} accent={config.accent} />
        </aside>
      </div>
    </div>
  );
}

function CompactResume({ data, config }: { data: ResumeData; config: typeof variantConfig.compact }) {
  return (
    <div data-resume-page className={`w-full max-w-[800px] mx-auto shadow-lg min-h-[1131px] p-8 ${config.pageClass}`} style={{ fontFamily: config.fontFamily }}>
      <header className="border-2 p-5 mb-6" style={{ borderColor: config.primary }}>
        <div className="flex justify-between gap-6">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] mb-2" style={{ color: config.accent }}>Compact / ATS Visual</div>
            <h1 className="text-4xl font-black uppercase leading-tight">{data.personalInfo.fullName}</h1>
            <h2 className="text-lg mt-1" style={{ color: config.accent }}>{data.personalInfo.jobTitle}</h2>
          </div>
          {data.showQrCode && data.qrCodeLink && <QRCodeSVG value={data.qrCodeLink} size={64} fgColor={data.theme.qrCodeColor || config.primary} />}
        </div>
        <div className="mt-4"><ContactRow data={data} color={config.accent} compact /></div>
      </header>

      <div className="grid grid-cols-[1fr_220px] gap-7 text-sm">
        <main className="space-y-6">
          {data.personalInfo.summary && <section><SectionTitle color={config.accent}>Profile</SectionTitle><p className="leading-relaxed">{data.personalInfo.summary}</p></section>}
          {data.experience.length > 0 && <section><SectionTitle color={config.accent}>Experience</SectionTitle><ExperienceList data={data} color={config.primary} muted={config.muted} /></section>}
          {data.projects.length > 0 && <section><SectionTitle color={config.accent}>Projects</SectionTitle><div className="space-y-3">{data.projects.map((project) => <div key={project.id}><div className="font-black">{project.name}</div><p className="text-xs leading-relaxed">{project.description}</p></div>)}</div></section>}
          <References data={data} color={config.accent} />
        </main>
        <aside className="border-l pl-5" style={{ borderColor: `${config.accent}55` }}>
          <SideDetails data={data} color={config.primary} accent={config.accent} />
        </aside>
      </div>
    </div>
  );
}

export default function ExpressiveResume({ data, variant }: ExpressiveResumeProps) {
  const config = variantConfig[variant];

  switch (variant) {
    case 'editorial':
    case 'atelier':
    case 'neoclassic':
      return <EditorialResume data={data} config={config} />;
    case 'luxe':
      return <LuxeResume data={data} config={config} />;
    case 'spectrum':
    case 'consultant':
      return <SpectrumResume data={data} config={config} />;
    case 'timeline':
    case 'executive':
    case 'architect':
      return <TimelineResume data={data} config={config} />;
    case 'magazine':
      return <CompactResume data={data} config={config} />;
    case 'compact':
    default:
      return <CompactResume data={data} config={config} />;
  }
}
