import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  VerticalAlign,
  WidthType,
  convertInchesToTwip,
} from 'docx';
import { saveAs } from 'file-saver';
import { ResumeData } from '../types';
import { getResumeFileBaseName } from './fileNames';

type DocxTemplate = 'minimal' | 'modern' | 'portfolio' | 'europass' | 'harvard' | 'engineersaustralia' | 'creative' | 'developer';
type DocxNode = Paragraph | Table;

interface TemplateContext {
  data: ResumeData;
  primary: string;
  accent: string;
  font: string;
}

const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const noBorders = {
  top: noBorder,
  bottom: noBorder,
  left: noBorder,
  right: noBorder,
  insideHorizontal: noBorder,
  insideVertical: noBorder,
};

function hexColor(color?: string, fallback = '2563EB') {
  const value = (color || fallback).replace('#', '').trim();
  return /^[0-9a-fA-F]{6}$/.test(value) ? value.toUpperCase() : fallback;
}

function tint(color: string, fallback: string) {
  return color === '000000' ? fallback : color;
}

function lines(description?: string) {
  return (description || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\u2022\-*]\s*/, '').trim())
    .filter(Boolean);
}

function text(value: string, options: {
  bold?: boolean;
  italics?: boolean;
  color?: string;
  size?: number;
  font?: string;
  allCaps?: boolean;
} = {}) {
  return new TextRun({
    text: options.allCaps ? value.toUpperCase() : value,
    bold: options.bold,
    italics: options.italics,
    color: options.color,
    size: options.size,
    font: options.font,
  });
}

function para(children: Array<TextRun | string>, options: {
  align?: keyof typeof AlignmentType;
  before?: number;
  after?: number;
  spacing?: number;
} = {}) {
  return new Paragraph({
    alignment: options.align ? AlignmentType[options.align] : undefined,
    spacing: {
      before: options.before ?? 0,
      after: options.after ?? 90,
      line: options.spacing ?? 260,
    },
    children: children.map((child) => (typeof child === 'string' ? text(child) : child)),
  });
}

function bullet(value: string, ctx: TemplateContext, color = '1F2937') {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 55, line: 250 },
    children: [text(value, { size: 20, color, font: ctx.font })],
  });
}

function sectionHeading(label: string, ctx: TemplateContext, options: { compact?: boolean; color?: string; border?: boolean } = {}) {
  const color = options.color || ctx.primary;
  return new Paragraph({
    spacing: { before: options.compact ? 160 : 260, after: 110 },
    border: options.border === false ? undefined : {
      bottom: { style: BorderStyle.SINGLE, size: 8, color, space: 2 },
    },
    children: [text(label, { bold: true, color, size: options.compact ? 22 : 24, font: ctx.font, allCaps: true })],
  });
}

function contactItems(data: ResumeData) {
  const info = data.personalInfo;
  return [
    info.email,
    info.phone,
    info.location,
    info.website,
    info.linkedin,
    info.github,
  ].filter(Boolean) as string[];
}

function cell(children: DocxNode[], options: {
  width?: number;
  fill?: string;
  margins?: number;
} = {}) {
  return new TableCell({
    width: options.width ? { size: options.width, type: WidthType.PERCENTAGE } : undefined,
    shading: options.fill ? { type: ShadingType.CLEAR, fill: options.fill } : undefined,
    margins: {
      top: options.margins ?? 120,
      bottom: options.margins ?? 120,
      left: options.margins ?? 160,
      right: options.margins ?? 160,
    },
    verticalAlign: VerticalAlign.TOP,
    children: children.length ? children : [para([''])],
  });
}

function table(rows: TableRow[], width = 100) {
  return new Table({
    width: { size: width, type: WidthType.PERCENTAGE },
    borders: noBorders,
    rows,
  });
}

function datedLine(title: string, date: string, ctx: TemplateContext, options: { companyFirst?: boolean; serif?: boolean } = {}) {
  return table([
    new TableRow({
      children: [
        cell([
          para([text(title, { bold: true, color: options.companyFirst ? '111827' : ctx.accent, size: 21, font: ctx.font })], { after: 20 }),
        ], { width: 68, margins: 0 }),
        cell([
          para([text(date, { color: '4B5563', size: 19, font: ctx.font })], { align: 'RIGHT', after: 20 }),
        ], { width: 32, margins: 0 }),
      ],
    }),
  ]);
}

function experienceBlocks(ctx: TemplateContext, mode: 'role-first' | 'company-first' = 'role-first') {
  return ctx.data.experience.flatMap((exp) => {
    const title = mode === 'company-first' ? exp.company : exp.role;
    const subtitle = mode === 'company-first' ? exp.role : exp.company;
    return [
      datedLine(title, [exp.startDate, exp.endDate].filter(Boolean).join(' - '), ctx, { companyFirst: mode === 'company-first' }),
      para([text(subtitle, { italics: mode === 'company-first', bold: mode !== 'company-first', color: '374151', size: 20, font: ctx.font })], { after: 45 }),
      ...lines(exp.description).map((line) => bullet(line, ctx)),
      para([''], { after: 80 }),
    ];
  });
}

function projectBlocks(ctx: TemplateContext, compact = false) {
  return ctx.data.projects.flatMap((project) => [
    para([
      text(project.name, { bold: true, color: ctx.accent, size: compact ? 20 : 22, font: ctx.font }),
      ...(project.link ? [text(` (${project.link})`, { italics: true, color: '4B5563', size: 18, font: ctx.font })] : []),
    ], { after: 45 }),
    ...lines(project.description).map((line) => (compact ? para([text(line, { size: 20, font: ctx.font })], { after: 45 }) : bullet(line, ctx))),
    ...(project.technologies?.length ? [para([text(`Technologies: ${project.technologies.join(', ')}`, { italics: true, color: '4B5563', size: 18, font: ctx.font })], { after: 100 })] : []),
  ]);
}

function educationBlocks(ctx: TemplateContext, compact = false) {
  return ctx.data.education.flatMap((edu) => [
    datedLine(compact ? edu.institution : edu.degree, [edu.startDate, edu.endDate].filter(Boolean).join(' - '), ctx, { companyFirst: compact }),
    para([text(compact ? edu.degree : edu.institution, { italics: compact, bold: !compact, color: '374151', size: 20, font: ctx.font })], { after: 35 }),
    ...(edu.description ? [para([text(edu.description, { size: 20, font: ctx.font })], { after: 100 })] : []),
  ]);
}

function buildMinimal(ctx: TemplateContext) {
  const data = ctx.data;
  const nodes: DocxNode[] = [
    para([text(data.personalInfo.fullName, { bold: true, color: ctx.primary, size: 38, font: ctx.font, allCaps: true })], { align: 'CENTER', after: 45 }),
    para([text(data.personalInfo.jobTitle, { color: ctx.accent, size: 24, font: ctx.font })], { align: 'CENTER', after: 80 }),
    para([text(contactItems(data).join(' | '), { color: '4B5563', size: 18, font: ctx.font })], { align: 'CENTER', after: 190 }),
  ];

  if (data.personalInfo.summary) nodes.push(sectionHeading('Summary', ctx), para([text(data.personalInfo.summary, { size: 20, font: ctx.font })]));
  if (data.experience.length) nodes.push(sectionHeading('Experience', ctx), ...experienceBlocks(ctx));
  if (data.projects.length) nodes.push(sectionHeading('Projects', ctx), ...projectBlocks(ctx, true));
  if (data.education.length) nodes.push(sectionHeading('Education', ctx), ...educationBlocks(ctx));
  if (data.skills.length) nodes.push(sectionHeading('Skills', ctx), para([text(data.skills.join(' | '), { size: 20, font: ctx.font })]));

  return nodes;
}

function buildHarvard(ctx: TemplateContext) {
  const data = ctx.data;
  const nodes: DocxNode[] = [
    para([text(data.personalInfo.fullName, { bold: true, color: ctx.primary, size: 34, font: ctx.font, allCaps: true })], { align: 'CENTER', after: 50 }),
    para([text([data.personalInfo.location, data.personalInfo.phone, data.personalInfo.email, data.personalInfo.linkedin].filter(Boolean).join(' | '), { color: ctx.accent, size: 18, font: ctx.font })], { align: 'CENTER', after: 170 }),
  ];

  if (data.personalInfo.summary) nodes.push(para([text(data.personalInfo.summary, { size: 20, font: ctx.font })], { after: 180 }));
  if (data.experience.length) nodes.push(sectionHeading('Experience', ctx, { compact: true }), ...experienceBlocks(ctx, 'company-first'));
  if (data.education.length) nodes.push(sectionHeading('Education', ctx, { compact: true }), ...educationBlocks(ctx, true));
  if (data.projects.length) nodes.push(sectionHeading('Projects', ctx, { compact: true }), ...projectBlocks(ctx, true));
  if (data.skills.length) nodes.push(sectionHeading('Skills', ctx, { compact: true }), para([text('Technical Skills: ', { bold: true, font: ctx.font, size: 20 }), text(data.skills.join(', '), { font: ctx.font, size: 20 })]));

  return nodes;
}

function buildModern(ctx: TemplateContext) {
  const data = ctx.data;
  const left: DocxNode[] = [
    para([text(data.personalInfo.fullName, { bold: true, color: 'FFFFFF', size: 32, font: ctx.font })], { after: 40 }),
    para([text(data.personalInfo.jobTitle, { color: ctx.accent, size: 21, font: ctx.font })], { after: 180 }),
    sectionHeading('Contact', { ...ctx, primary: 'FFFFFF' }, { compact: true, color: 'FFFFFF', border: false }),
    ...contactItems(data).map((item) => para([text(item, { color: 'CBD5E1', size: 18, font: ctx.font })], { after: 65 })),
  ];

  if (data.skills.length) {
    left.push(sectionHeading('Skills', { ...ctx, primary: 'FFFFFF' }, { compact: true, color: 'FFFFFF', border: false }));
    data.skills.forEach((skill) => left.push(para([text(skill, { color: 'E2E8F0', size: 18, font: ctx.font })], { after: 45 })));
  }

  if (data.education.length) {
    left.push(sectionHeading('Education', { ...ctx, primary: 'FFFFFF' }, { compact: true, color: 'FFFFFF', border: false }));
    data.education.forEach((edu) => {
      left.push(para([text(edu.degree, { bold: true, color: 'FFFFFF', size: 18, font: ctx.font })], { after: 25 }));
      left.push(para([text(edu.institution, { color: 'CBD5E1', size: 17, font: ctx.font })], { after: 25 }));
      left.push(para([text([edu.startDate, edu.endDate].filter(Boolean).join(' - '), { color: '94A3B8', size: 16, font: ctx.font })], { after: 90 }));
    });
  }

  const right: DocxNode[] = [];
  if (data.personalInfo.summary) right.push(sectionHeading('Profile', ctx), para([text(data.personalInfo.summary, { color: '475569', size: 20, font: ctx.font })]));
  if (data.experience.length) right.push(sectionHeading('Experience', ctx), ...experienceBlocks(ctx));
  if (data.projects.length) right.push(sectionHeading('Projects', ctx), ...projectBlocks(ctx, true));

  return [
    table([
      new TableRow({
        children: [
          cell(left, { width: 34, fill: ctx.primary, margins: 260 }),
          cell(right, { width: 66, fill: 'F8FAFC', margins: 260 }),
        ],
      }),
    ]),
  ];
}

function buildEuropass(ctx: TemplateContext) {
  const data = ctx.data;
  const rows: TableRow[] = [
    new TableRow({
      children: [
        cell([
          para([text(data.personalInfo.fullName, { bold: true, color: 'FFFFFF', size: 34, font: ctx.font })], { after: 35 }),
          para([text(data.personalInfo.jobTitle, { color: 'DBEAFE', size: 23, font: ctx.font })], { after: 0 }),
        ], { width: 100, fill: ctx.primary, margins: 260 }),
      ],
    }),
  ];

  const addRow = (label: string, content: DocxNode[]) => {
    rows.push(new TableRow({
      children: [
        cell([para([text(label, { bold: true, color: ctx.primary, size: 19, font: ctx.font, allCaps: true })], { align: 'RIGHT' })], { width: 25 }),
        cell(content, { width: 75 }),
      ],
    }));
  };

  addRow('Personal Info', contactItems(data).map((item) => para([text(item, { size: 19, font: ctx.font })], { after: 35 })));
  if (data.personalInfo.summary) addRow('Summary', [para([text(data.personalInfo.summary, { size: 20, font: ctx.font })])]);
  if (data.experience.length) addRow('Work Experience', experienceBlocks(ctx));
  if (data.education.length) addRow('Education', educationBlocks(ctx));
  if (data.projects.length) addRow('Projects', projectBlocks(ctx, true));
  if (data.skills.length) addRow('Skills', [para([text(data.skills.join(', '), { size: 20, font: ctx.font })])]);

  return [table(rows)];
}

function buildEngineersAustralia(ctx: TemplateContext) {
  const data = ctx.data;
  const nodes: DocxNode[] = [
    para([text(data.personalInfo.fullName, { bold: true, color: ctx.primary, size: 34, font: ctx.font, allCaps: true })], { align: 'CENTER', after: 120 }),
    table([
      new TableRow({
        children: [
          cell([para([text('Address:', { bold: true, color: ctx.accent, font: ctx.font })], { align: 'RIGHT' })], { width: 35, margins: 30 }),
          cell([para([text(data.personalInfo.location || '', { font: ctx.font })])], { width: 65, margins: 30 }),
        ],
      }),
      new TableRow({
        children: [
          cell([para([text('Phone:', { bold: true, color: ctx.accent, font: ctx.font })], { align: 'RIGHT' })], { width: 35, margins: 30 }),
          cell([para([text(data.personalInfo.phone || '', { font: ctx.font })])], { width: 65, margins: 30 }),
        ],
      }),
      new TableRow({
        children: [
          cell([para([text('Email:', { bold: true, color: ctx.accent, font: ctx.font })], { align: 'RIGHT' })], { width: 35, margins: 30 }),
          cell([para([text(data.personalInfo.email || '', { font: ctx.font })])], { width: 65, margins: 30 }),
        ],
      }),
    ], 70),
  ];

  if (data.personalInfo.summary) nodes.push(sectionHeading('Career Objective', ctx), para([text(data.personalInfo.summary, { size: 20, font: ctx.font })]));
  if (data.education.length) nodes.push(sectionHeading('Academic Qualifications', ctx), ...educationBlocks(ctx));
  if (data.skills.length) nodes.push(sectionHeading('Software & Technical Skills', ctx), ...data.skills.map((skill) => bullet(skill, ctx)));
  if (data.experience.length) nodes.push(sectionHeading('Employment History', ctx), ...experienceBlocks(ctx, 'company-first'));
  if (data.projects.length) nodes.push(sectionHeading('Key Projects', ctx), ...projectBlocks(ctx, true));

  return nodes;
}

function buildPortfolio(ctx: TemplateContext) {
  const data = ctx.data;
  const projectCells = data.projects.map((project) => cell([
    para([text(project.name, { bold: true, color: '111827', size: 23, font: ctx.font })], { after: 60 }),
    para([text(project.description, { color: '4B5563', size: 19, font: ctx.font })], { after: 80 }),
    para([text(project.technologies.join(', '), { color: ctx.primary, size: 17, font: ctx.font })]),
  ], { width: 50, fill: 'FFFFFF', margins: 180 }));

  const projectRows: TableRow[] = [];
  for (let index = 0; index < projectCells.length; index += 2) {
    projectRows.push(new TableRow({ children: [projectCells[index], projectCells[index + 1] || cell([], { width: 50, fill: 'FFFFFF' })] }));
  }

  const nodes: DocxNode[] = [
    para([text(data.personalInfo.fullName, { bold: true, color: '111827', size: 44, font: ctx.font })], { align: 'CENTER', after: 60 }),
    para([text(data.personalInfo.jobTitle, { color: ctx.primary, size: 26, font: ctx.font })], { align: 'CENTER', after: 90 }),
    para([text(data.personalInfo.summary, { color: '4B5563', size: 21, font: ctx.font })], { align: 'CENTER', after: 120 }),
    para([text(contactItems(data).join(' | '), { color: ctx.primary, size: 18, font: ctx.font })], { align: 'CENTER', after: 240 }),
  ];

  if (projectRows.length) nodes.push(sectionHeading('Featured Work', ctx, { border: false }), table(projectRows));
  if (data.experience.length || data.skills.length || data.education.length) {
    nodes.push(table([
      new TableRow({
        children: [
          cell([
            ...(data.experience.length ? [sectionHeading('Experience', ctx, { border: false }), ...experienceBlocks(ctx)] : []),
          ], { width: 65, margins: 120 }),
          cell([
            ...(data.skills.length ? [sectionHeading('Skills', ctx, { border: false }), para([text(data.skills.join(', '), { font: ctx.font, size: 20 })])] : []),
            ...(data.education.length ? [sectionHeading('Education', ctx, { border: false }), ...educationBlocks(ctx, true)] : []),
          ], { width: 35, margins: 120 }),
        ],
      }),
    ]));
  }

  return nodes;
}

function buildCreative(ctx: TemplateContext) {
  const data = ctx.data;
  const nodes: DocxNode[] = [
    table([
      new TableRow({
        children: [
          cell([
            para([text(data.personalInfo.fullName, { bold: true, color: 'FFFFFF', size: 42, font: ctx.font })], { after: 55 }),
            para([text(data.personalInfo.jobTitle, { color: 'FFE4E6', size: 25, font: ctx.font })], { after: 70 }),
            para([text([data.personalInfo.location, data.personalInfo.website].filter(Boolean).join(' | '), { color: 'FFF1F2', size: 18, font: ctx.font })]),
          ], { width: 100, fill: ctx.primary, margins: 330 }),
        ],
      }),
    ]),
    table([
      new TableRow({
        children: [
          cell([
            sectionHeading('About Me', ctx, { border: false }),
            para([text(data.personalInfo.summary, { color: '4B5563', size: 21, font: ctx.font })]),
          ], { width: 66, fill: 'FAFAFA', margins: 220 }),
          cell([
            sectionHeading('Contact', { ...ctx, primary: '111827' }, { compact: true, border: false }),
            ...contactItems(data).map((item) => para([text(item, { color: '4B5563', size: 18, font: ctx.font })], { after: 45 })),
          ], { width: 34, fill: 'FFFFFF', margins: 220 }),
        ],
      }),
    ]),
  ];

  if (data.projects.length) nodes.push(sectionHeading('Selected Works', ctx, { border: false }), ...projectBlocks(ctx, true));
  if (data.experience.length || data.skills.length || data.education.length) {
    nodes.push(table([
      new TableRow({
        children: [
          cell(data.experience.length ? [sectionHeading('Experience', ctx, { border: false }), ...experienceBlocks(ctx)] : [], { width: 50, margins: 160 }),
          cell([
            ...(data.skills.length ? [sectionHeading('Expertise', ctx, { border: false }), para([text(data.skills.join(', '), { font: ctx.font, size: 20 })])] : []),
            ...(data.education.length ? [sectionHeading('Education', ctx, { border: false }), ...educationBlocks(ctx, true)] : []),
          ], { width: 50, margins: 160 }),
        ],
      }),
    ]));
  }

  return nodes;
}

function buildDeveloper(ctx: TemplateContext) {
  const data = ctx.data;
  const darkCtx = { ...ctx, primary: ctx.primary, accent: ctx.accent, font: 'Consolas' };
  const lineColor = 'CBD5E1';
  const nodes: DocxNode[] = [
    table([
      new TableRow({
        children: [
          cell([
            para([text('●  ●  ●   ~/portfolio/' + data.personalInfo.fullName.toLowerCase().replace(/\s+/g, '-'), { color: '94A3B8', size: 17, font: darkCtx.font })], { after: 160 }),
            para([text(data.personalInfo.fullName, { bold: true, color: 'F8FAFC', size: 36, font: darkCtx.font })], { after: 45 }),
            para([text(`> ${data.personalInfo.jobTitle}`, { color: ctx.accent, size: 23, font: darkCtx.font })], { after: 140 }),
            ...[data.personalInfo.email, data.personalInfo.location, data.personalInfo.github, data.personalInfo.linkedin].filter(Boolean).map((item) => para([text(item as string, { color: lineColor, size: 18, font: darkCtx.font })], { after: 40 })),
          ], { width: 100, fill: '0F172A', margins: 260 }),
        ],
      }),
    ]),
  ];

  const addCommand = (command: string, content: DocxNode[]) => {
    nodes.push(table([
      new TableRow({
        children: [
          cell([
            para([text(`$ ${command}`, { bold: true, color: 'F8FAFC', size: 22, font: darkCtx.font })], { after: 110 }),
            ...content,
          ], { width: 100, fill: '111827', margins: 210 }),
        ],
      }),
    ]));
  };

  if (data.personalInfo.summary) addCommand('cat about.txt', [para([text(data.personalInfo.summary, { color: lineColor, size: 19, font: darkCtx.font })])]);
  if (data.skills.length) addCommand('ls ./skills', [para([text(data.skills.join('   '), { color: lineColor, size: 18, font: darkCtx.font })])]);
  if (data.projects.length) addCommand('./run_projects.sh', projectBlocks({ ...darkCtx, primary: ctx.primary, accent: ctx.accent }, true).map((node) => node));
  if (data.experience.length) addCommand('tail -f experience.log', experienceBlocks({ ...darkCtx, primary: ctx.primary, accent: ctx.accent }));
  if (data.education.length) addCommand('cat education.json', educationBlocks({ ...darkCtx, primary: ctx.primary, accent: ctx.accent }, true));

  return nodes;
}

function buildDocument(ctx: TemplateContext, template: DocxTemplate) {
  switch (template) {
    case 'modern':
      return buildModern(ctx);
    case 'portfolio':
      return buildPortfolio(ctx);
    case 'europass':
      return buildEuropass(ctx);
    case 'harvard':
      return buildHarvard(ctx);
    case 'engineersaustralia':
      return buildEngineersAustralia(ctx);
    case 'creative':
      return buildCreative(ctx);
    case 'developer':
      return buildDeveloper(ctx);
    case 'minimal':
    default:
      return buildMinimal(ctx);
  }
}

function fontForTemplate(template: DocxTemplate) {
  if (template === 'harvard') return 'Times New Roman';
  if (template === 'developer') return 'Consolas';
  return 'Aptos';
}

export async function exportResumeDocx(data: ResumeData, template: DocxTemplate) {
  const ctx: TemplateContext = {
    data,
    primary: hexColor(data.theme?.primary, template === 'harvard' ? '000000' : '2563EB'),
    accent: hexColor(data.theme?.accent, template === 'developer' ? '34D399' : '3B82F6'),
    font: fontForTemplate(template),
  };

  if (template === 'modern') {
    ctx.primary = tint(ctx.primary, '1E293B');
  }

  const document = new Document({
    creator: 'Resume Builder',
    title: `${data.personalInfo.fullName || 'Resume'} Resume`,
    description: 'Editable resume generated from the selected Resume Builder template',
    styles: {
      default: {
        document: {
          run: {
            font: ctx.font,
            size: 20,
            color: template === 'developer' ? 'CBD5E1' : '1F2937',
          },
          paragraph: {
            spacing: { line: 260 },
          },
        },
      },
    },
    sections: [
      {
        properties: {
          page: {
            size: {
              width: convertInchesToTwip(8.27),
              height: convertInchesToTwip(11.69),
            },
            margin: {
              top: convertInchesToTwip(0.55),
              right: convertInchesToTwip(0.62),
              bottom: convertInchesToTwip(0.55),
              left: convertInchesToTwip(0.62),
            },
          },
        },
        children: buildDocument(ctx, template),
      },
    ],
  });

  const blob = await Packer.toBlob(document);
  saveAs(blob, `${getResumeFileBaseName(data.personalInfo.fullName)}.docx`);
}
