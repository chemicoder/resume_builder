import {
  AlignmentType,
  BorderStyle,
  Document,
  HeightRule,
  ImageRun,
  Packer,
  PageOrientation,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TextRun,
  VerticalAlignTable,
  WidthType,
  convertInchesToTwip,
} from 'docx';
import { saveAs } from 'file-saver';
import { ResumeData } from '../types';
import { getResumeFileBaseName } from './fileNames';

type DocxTemplate =
  | 'minimal'
  | 'modern'
  | 'portfolio'
  | 'europass'
  | 'harvard'
  | 'engineersaustralia'
  | 'creative'
  | 'developer'
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
type DocxNode = Paragraph | Table;

interface PaletteColors {
  primary: string;
  accent: string;
  font: string;
  bodyFont: string;
}

interface BuildContext {
  data: ResumeData;
  template: DocxTemplate;
  palette: PaletteColors;
}

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
const ALL_NO_BORDERS = {
  top: NO_BORDER,
  bottom: NO_BORDER,
  left: NO_BORDER,
  right: NO_BORDER,
  insideHorizontal: NO_BORDER,
  insideVertical: NO_BORDER,
};

function hex(color: string | undefined, fallback: string): string {
  const value = (color || fallback).replace('#', '').trim();
  return /^[0-9a-fA-F]{6}$/.test(value) ? value.toUpperCase() : fallback.toUpperCase();
}

function splitLines(description?: string): string[] {
  return (description || '')
    .split(/\r?\n/)
    .map((line) => line.replace(/^[•\-*]\s*/, '').trim())
    .filter(Boolean);
}

interface RunOpts {
  bold?: boolean;
  italics?: boolean;
  color?: string;
  size?: number;
  font?: string;
  allCaps?: boolean;
  underline?: boolean;
  highlight?: string;
}

function run(value: string, opts: RunOpts = {}): TextRun {
  return new TextRun({
    text: opts.allCaps ? value.toUpperCase() : value,
    bold: opts.bold,
    italics: opts.italics,
    color: opts.color,
    size: opts.size,
    font: opts.font,
    underline: opts.underline ? {} : undefined,
  });
}

interface ParaOpts {
  align?: keyof typeof AlignmentType;
  before?: number;
  after?: number;
  line?: number;
  shading?: string;
  indent?: { left?: number; right?: number; firstLine?: number; hanging?: number };
  border?: { bottom?: { color: string; size?: number }; top?: { color: string; size?: number }; left?: { color: string; size?: number } };
  keepNext?: boolean;
  keepLines?: boolean;
}

function paragraph(children: Array<TextRun | string>, opts: ParaOpts = {}): Paragraph {
  return new Paragraph({
    alignment: opts.align ? AlignmentType[opts.align] : undefined,
    spacing: { before: opts.before ?? 0, after: opts.after ?? 80, line: opts.line ?? 260 },
    indent: opts.indent,
    shading: opts.shading ? { type: ShadingType.CLEAR, fill: opts.shading } : undefined,
    keepNext: opts.keepNext,
    keepLines: opts.keepLines,
    border: opts.border ? {
      bottom: opts.border.bottom ? { style: BorderStyle.SINGLE, size: opts.border.bottom.size ?? 6, color: opts.border.bottom.color, space: 2 } : undefined,
      top: opts.border.top ? { style: BorderStyle.SINGLE, size: opts.border.top.size ?? 6, color: opts.border.top.color, space: 2 } : undefined,
      left: opts.border.left ? { style: BorderStyle.SINGLE, size: opts.border.left.size ?? 6, color: opts.border.left.color, space: 4 } : undefined,
    } : undefined,
    children: children.map((c) => (typeof c === 'string' ? run(c) : c)),
  });
}

interface CellOpts {
  width?: number;
  fill?: string;
  margins?: { top?: number; bottom?: number; left?: number; right?: number };
  borders?: 'none' | 'all' | { left?: string; right?: string; top?: string; bottom?: string };
  verticalAlign?: 'top' | 'center' | 'bottom';
  colSpan?: number;
}

function tableCell(children: DocxNode[], opts: CellOpts = {}): TableCell {
  let borders;
  if (!opts.borders || opts.borders === 'none') {
    borders = ALL_NO_BORDERS;
  } else if (opts.borders === 'all') {
    borders = undefined;
  } else {
    const b = opts.borders;
    const make = (color?: string) => color ? { style: BorderStyle.SINGLE, size: 4, color } : NO_BORDER;
    borders = {
      top: make(b.top),
      bottom: make(b.bottom),
      left: make(b.left),
      right: make(b.right),
    };
  }

  return new TableCell({
    width: opts.width !== undefined ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
    shading: opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill } : undefined,
    margins: {
      top: opts.margins?.top ?? 120,
      bottom: opts.margins?.bottom ?? 120,
      left: opts.margins?.left ?? 160,
      right: opts.margins?.right ?? 160,
    },
    verticalAlign: (opts.verticalAlign ?? 'top') as typeof VerticalAlignTable[keyof typeof VerticalAlignTable],
    borders,
    columnSpan: opts.colSpan,
    children: children.length ? children : [paragraph([''])],
  });
}

function fullTable(rows: TableRow[], widthPct = 100): Table {
  return new Table({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: ALL_NO_BORDERS,
    rows,
  });
}

function contactItems(data: ResumeData): string[] {
  const i = data.personalInfo;
  return [i.email, i.phone, i.location, i.website, i.linkedin, i.github].filter(Boolean) as string[];
}

function bulletList(items: string[], opts: { color?: string; size?: number; font?: string; indent?: number } = {}): Paragraph[] {
  const color = opts.color ?? '374151';
  const size = opts.size ?? 20;
  const font = opts.font;
  const left = opts.indent ?? 360;

  return items.map((item) =>
    new Paragraph({
      spacing: { after: 55, line: 260 },
      indent: { left, hanging: 180 },
      children: [
        run('• ', { color, size, font }),
        run(item, { color, size, font }),
      ],
    }),
  );
}

function spacer(after = 100): Paragraph {
  return paragraph([''], { after });
}

type ImgType = 'png' | 'jpg' | 'gif' | 'bmp';

/**
 * Decode a `data:image/<type>;base64,...` URL into a Uint8Array + format tag.
 * Returns null if the picture is missing or malformed — caller should skip silently.
 * SVGs are not supported by Word's RegularImageOptions and are rejected here.
 */
function decodeDataUrl(dataUrl: string | undefined): { data: Uint8Array; type: ImgType } | null {
  if (!dataUrl) return null;
  const match = /^data:image\/(png|jpe?g|gif|bmp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!match) return null;
  const rawType = match[1].toLowerCase();
  const type: ImgType = rawType === 'jpeg' ? 'jpg' : (rawType as ImgType);
  try {
    const binary = atob(match[2]);
    const data = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) data[i] = binary.charCodeAt(i);
    return { data, type };
  } catch {
    return null;
  }
}

interface ImageParaOpts {
  size?: number;
  align?: keyof typeof AlignmentType;
  before?: number;
  after?: number;
}

/** Render an embedded profile picture as a centered/aligned paragraph. */
function imageParagraph(dataUrl: string | undefined, opts: ImageParaOpts = {}): Paragraph | null {
  const decoded = decodeDataUrl(dataUrl);
  if (!decoded) return null;
  const size = opts.size ?? 100;
  return new Paragraph({
    alignment: opts.align ? AlignmentType[opts.align] : AlignmentType.CENTER,
    spacing: { before: opts.before ?? 0, after: opts.after ?? 120 },
    children: [
      new ImageRun({
        type: decoded.type,
        data: decoded.data,
        transformation: { width: size, height: size },
      }),
    ],
  });
}

interface LangLineOpts {
  color?: string;
  size?: number;
  font?: string;
  bold?: boolean;
}

/** Render the user's languages as `Name — Level` paragraphs. */
function languageList(data: ResumeData, opts: LangLineOpts = {}): Paragraph[] {
  const langs = data.languages || [];
  if (!langs.length) return [];
  const color = opts.color ?? '1F2937';
  const size = opts.size ?? 20;
  const font = opts.font;
  return langs.map((l) => paragraph([
    run(l.name, { bold: true, color, size, font }),
    run(`  —  ${l.level}`, { color: '6B7280', size: size - 2, font }),
  ], { after: 60 }));
}

interface RefBlockOpts {
  primary: string;
  accent: string;
  font?: string;
  size?: number;
  bodyColor?: string;
  fallbackText?: string;
}

/**
 * Render the references list. If empty, returns a single "available on request"
 * paragraph (templates only invoke this when `data.references` is defined).
 */
function referenceList(data: ResumeData, opts: RefBlockOpts): DocxNode[] {
  const refs = data.references || [];
  const { primary, accent, font } = opts;
  const size = opts.size ?? 20;
  const bodyColor = opts.bodyColor ?? '1F2937';
  if (refs.length === 0) {
    return [paragraph([run(opts.fallbackText ?? 'References available on request.', { italics: true, color: '6B7280', size, font })])];
  }
  const out: DocxNode[] = [];
  refs.forEach((ref, idx) => {
    out.push(paragraph([run(ref.name, { bold: true, color: primary, size: size + 2, font })], { after: 30 }));
    const meta = [ref.role, ref.organization].filter(Boolean).join(', ');
    if (meta) out.push(paragraph([run(meta, { color: accent, size: size - 1, font })], { after: 30 }));
    const contact = [ref.email, ref.phone].filter(Boolean).join('   |   ');
    if (contact) out.push(paragraph([run(contact, { color: bodyColor, size: size - 2, font })], { after: idx < refs.length - 1 ? 140 : 60 }));
  });
  return out;
}

interface PillOpts {
  textColor?: string;
  fillColor?: string;
  borderColor?: string;
  font?: string;
  size?: number;
  bold?: boolean;
  columns?: number;
  cellMargin?: number;
  align?: 'CENTER' | 'LEFT';
}

/**
 * Render an array of short labels (skills, technologies) as a wrapping grid of
 * pill-style boxes: each item is its own bordered, lightly-filled table cell.
 * Word can't auto-size cells to content like CSS flex-wrap, so we use a fixed
 * column count with equal-width cells — visually it reads as a tag cloud.
 */
function pillGrid(items: string[], opts: PillOpts = {}): Table | null {
  if (!items.length) return null;
  const cols = Math.max(1, Math.min(items.length, opts.columns ?? 4));
  const textColor = opts.textColor ?? '374151';
  const fillColor = opts.fillColor ?? 'FFFFFF';
  const borderColor = opts.borderColor ?? 'D1D5DB';
  const font = opts.font;
  const size = opts.size ?? 18;
  const bold = opts.bold ?? false;
  const margin = opts.cellMargin ?? 120;
  const align = opts.align ?? 'CENTER';

  const cellWidth = Math.floor(100 / cols);
  const makeCell = (label: string) =>
    new TableCell({
      width: { size: cellWidth, type: WidthType.PERCENTAGE },
      shading: { type: ShadingType.CLEAR, fill: fillColor },
      margins: { top: margin, bottom: margin, left: margin + 40, right: margin + 40 },
      verticalAlign: 'center' as typeof VerticalAlignTable[keyof typeof VerticalAlignTable],
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
        left: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
        right: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
      },
      children: [
        new Paragraph({
          alignment: AlignmentType[align],
          spacing: { before: 0, after: 0, line: 240 },
          children: [run(label, { color: textColor, size, font, bold })],
        }),
      ],
    });

  // Spacer cell — invisible, used to keep the last row left-aligned when items % cols != 0.
  const makeBlankCell = () =>
    new TableCell({
      width: { size: cellWidth, type: WidthType.PERCENTAGE },
      margins: { top: margin, bottom: margin, left: margin, right: margin },
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      },
      children: [new Paragraph({ children: [run('')] })],
    });

  const rows: TableRow[] = [];
  for (let i = 0; i < items.length; i += cols) {
    const slice = items.slice(i, i + cols);
    const children = slice.map(makeCell);
    while (children.length < cols) children.push(makeBlankCell());
    rows.push(new TableRow({ children }));
  }

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    layout: TableLayoutType.FIXED,
    borders: ALL_NO_BORDERS,
    rows,
  });
}

/* =====================================================================
 * MINIMAL TEMPLATE
 * Centered uppercase name, accent job title, contact row in icons-line.
 * Section headings: bold, uppercase, primary color, bottom border.
 * Experience: role (accent) left, date (gray) right; company bold;
 * bullets with disc marker.
 * ===================================================================== */
function buildMinimal(ctx: BuildContext): DocxNode[] {
  const { data, palette } = ctx;
  const { primary, accent, font } = palette;
  const nodes: DocxNode[] = [];

  // Header: 2-col table — left text, right profile picture (if provided).
  const minimalPic = imageParagraph(data.personalInfo.profilePicture, { size: 90, align: 'RIGHT', after: 0 });
  nodes.push(fullTable([
    new TableRow({
      children: [
        tableCell([
          paragraph([run(data.personalInfo.fullName || '', { bold: true, color: primary, size: 40, font, allCaps: true })], { after: 60 }),
          paragraph([run(data.personalInfo.jobTitle || '', { color: accent, size: 24, font })], { after: 120 }),
          paragraph([run(contactItems(data).join('   |   '), { color: '4B5563', size: 18, font })], { after: 0 }),
        ], { width: minimalPic ? 80 : 100, margins: { top: 0, bottom: 0, left: 0, right: 0 }, verticalAlign: 'center' }),
        ...(minimalPic ? [tableCell([minimalPic], { width: 20, margins: { top: 0, bottom: 0, left: 80, right: 0 }, verticalAlign: 'center' })] : []),
      ],
    }),
  ]));

  // Bottom border to mimic header underline
  nodes.push(paragraph([''], { after: 80, border: { bottom: { color: primary, size: 12 } } }));
  nodes.push(spacer(140));

  const section = (label: string): Paragraph =>
    paragraph(
      [run(label, { bold: true, color: primary, size: 22, font, allCaps: true })],
      { after: 80, before: 60, border: { bottom: { color: primary, size: 6 } }, keepNext: true },
    );

  if (data.personalInfo.summary) {
    nodes.push(section('Summary'));
    nodes.push(paragraph([run(data.personalInfo.summary, { color: '1F2937', size: 20, font })], { after: 200 }));
  }

  if (data.experience.length) {
    nodes.push(section('Experience'));
    data.experience.forEach((exp, idx) => {
      nodes.push(fullTable([
        new TableRow({
          children: [
            tableCell([paragraph([run(exp.role, { bold: true, color: accent, size: 22, font })], { after: 30 })], { width: 70, margins: { top: 0, bottom: 0, left: 0, right: 0 } }),
            tableCell([paragraph([run([exp.startDate, exp.endDate].filter(Boolean).join(' - '), { color: '6B7280', size: 19, font })], { align: 'RIGHT', after: 30 })], { width: 30, margins: { top: 0, bottom: 0, left: 0, right: 0 } }),
          ],
        }),
      ]));
      nodes.push(paragraph([run(exp.company, { bold: true, color: '374151', size: 20, font })], { after: 80 }));
      bulletList(splitLines(exp.description), { color: '1F2937', size: 20, font }).forEach((b) => nodes.push(b));
      if (idx < data.experience.length - 1) nodes.push(spacer(120));
    });
    nodes.push(spacer(120));
  }

  if (data.projects.length) {
    nodes.push(section('Projects'));
    data.projects.forEach((proj, idx) => {
      const head: TextRun[] = [run(proj.name, { bold: true, color: accent, size: 22, font })];
      if (proj.link) head.push(run(`  (${proj.link})`, { color: '2563EB', size: 18, font }));
      nodes.push(paragraph(head, { after: 40 }));
      nodes.push(paragraph([run(proj.description, { color: '1F2937', size: 20, font })], { after: 40 }));
      if (proj.technologies?.length) {
        nodes.push(paragraph([run(`Technologies: ${proj.technologies.join(', ')}`, { italics: true, color: '6B7280', size: 18, font })], { after: idx < data.projects.length - 1 ? 140 : 80 }));
      }
    });
    nodes.push(spacer(120));
  }

  if (data.education.length) {
    nodes.push(section('Education'));
    data.education.forEach((edu, idx) => {
      nodes.push(fullTable([
        new TableRow({
          children: [
            tableCell([paragraph([run(edu.degree, { bold: true, color: accent, size: 22, font })], { after: 30 })], { width: 70, margins: { top: 0, bottom: 0, left: 0, right: 0 } }),
            tableCell([paragraph([run([edu.startDate, edu.endDate].filter(Boolean).join(' - '), { color: '6B7280', size: 19, font })], { align: 'RIGHT', after: 30 })], { width: 30, margins: { top: 0, bottom: 0, left: 0, right: 0 } }),
          ],
        }),
      ]));
      nodes.push(paragraph([run(edu.institution, { bold: true, color: '374151', size: 20, font })], { after: 40 }));
      if (edu.description) nodes.push(paragraph([run(edu.description, { color: '1F2937', size: 20, font })], { after: idx < data.education.length - 1 ? 140 : 80 }));
    });
    nodes.push(spacer(120));
  }

  if (data.skills.length) {
    nodes.push(section('Skills'));
    const grid = pillGrid(data.skills, {
      textColor: '1F2937',
      fillColor: 'F9FAFB',
      borderColor: 'D1D5DB',
      font,
      size: 18,
      columns: 4,
    });
    if (grid) nodes.push(grid);
  }

  if ((data.languages || []).length) {
    nodes.push(section('Languages'));
    languageList(data, { font, size: 20 }).forEach((p) => nodes.push(p));
  }

  if (data.references !== undefined) {
    nodes.push(section('References'));
    referenceList(data, { primary, accent, font, size: 20 }).forEach((n) => nodes.push(n));
  }

  return nodes;
}

/* =====================================================================
 * MODERN TEMPLATE
 * Left sidebar: dark slate background, white name, accent job title,
 * contact items vertically, skills pills, education.
 * Right column: light gray, profile, experience with timeline-style
 * bullets, projects.
 * ===================================================================== */
function buildModern(ctx: BuildContext): DocxNode[] {
  const { data } = ctx;
  const { primary, accent, font } = ctx.palette;
  const sidebarText = 'CBD5E1';
  const sidebarSoft = '94A3B8';
  const rightBg = 'F8FAFC';
  const rightBody = '475569';

  const left: DocxNode[] = [];
  const modernPic = imageParagraph(data.personalInfo.profilePicture, { size: 130, align: 'CENTER', after: 280 });
  if (modernPic) left.push(modernPic);
  left.push(paragraph([run(data.personalInfo.fullName || '', { bold: true, color: 'FFFFFF', size: 34, font })], { after: 60 }));
  left.push(paragraph([run(data.personalInfo.jobTitle || '', { color: accent, size: 22, font })], { after: 280 }));

  // Contact
  if (contactItems(data).length) {
    contactItems(data).forEach((item) => {
      left.push(paragraph([run(item, { color: sidebarText, size: 18, font })], { after: 90 }));
    });
    left.push(spacer(140));
  }

  if (data.skills.length) {
    left.push(paragraph(
      [run('Skills', { bold: true, color: 'FFFFFF', size: 22, font, allCaps: true })],
      { after: 90, border: { bottom: { color: 'FFFFFF', size: 6 } } },
    ));
    const grid = pillGrid(data.skills, {
      textColor: 'E2E8F0',
      fillColor: '334155',
      borderColor: '475569',
      font,
      size: 16,
      columns: 2,
      cellMargin: 80,
    });
    if (grid) left.push(grid);
    left.push(spacer(160));
  }

  if (data.education.length) {
    left.push(paragraph(
      [run('Education', { bold: true, color: 'FFFFFF', size: 22, font, allCaps: true })],
      { after: 90, border: { bottom: { color: 'FFFFFF', size: 6 } } },
    ));
    data.education.forEach((edu, idx) => {
      left.push(paragraph([run(edu.degree, { bold: true, color: 'FFFFFF', size: 19, font })], { after: 30 }));
      left.push(paragraph([run(edu.institution, { color: sidebarText, size: 18, font })], { after: 30 }));
      left.push(paragraph([run([edu.startDate, edu.endDate].filter(Boolean).join(' - '), { color: sidebarSoft, size: 16, font })], { after: idx < data.education.length - 1 ? 140 : 80 }));
    });
    left.push(spacer(160));
  }

  if ((data.languages || []).length) {
    left.push(paragraph(
      [run('Languages', { bold: true, color: 'FFFFFF', size: 22, font, allCaps: true })],
      { after: 90, border: { bottom: { color: 'FFFFFF', size: 6 } } },
    ));
    (data.languages || []).forEach((lang) => {
      left.push(paragraph([
        run(lang.name, { bold: true, color: 'FFFFFF', size: 18, font }),
        run(`   ${lang.level}`, { color: sidebarSoft, size: 16, font }),
      ], { after: 60 }));
    });
  }

  const sectionHead = (label: string): Paragraph => paragraph(
    [run(label, { bold: true, color: primary, size: 26, font, allCaps: true })],
    { after: 120, before: 80, border: { bottom: { color: primary, size: 8 } }, keepNext: true },
  );

  const right: DocxNode[] = [];
  if (data.personalInfo.summary) {
    right.push(sectionHead('Profile'));
    right.push(paragraph([run(data.personalInfo.summary, { color: rightBody, size: 20, font })], { after: 240 }));
  }

  if (data.experience.length) {
    right.push(sectionHead('Experience'));
    data.experience.forEach((exp, idx) => {
      right.push(paragraph([run(exp.role, { bold: true, color: primary, size: 24, font })], { after: 40 }));
      const meta: TextRun[] = [
        run(exp.company, { bold: true, color: rightBody, size: 19, font }),
      ];
      if (exp.startDate || exp.endDate) {
        meta.push(run('   '));
        meta.push(run([exp.startDate, exp.endDate].filter(Boolean).join(' - '), { color: '64748B', size: 17, font }));
      }
      right.push(paragraph(meta, { after: 60 }));
      bulletList(splitLines(exp.description), { color: rightBody, size: 19, font, indent: 240 }).forEach((b) => right.push(b));
      if (idx < data.experience.length - 1) right.push(spacer(140));
    });
    right.push(spacer(120));
  }

  if (data.projects.length) {
    right.push(sectionHead('Projects'));
    data.projects.forEach((proj, idx) => {
      const head: TextRun[] = [run(proj.name, { bold: true, color: primary, size: 22, font })];
      if (proj.link) head.push(run(`   (${proj.link})`, { italics: true, color: accent, size: 17, font }));
      right.push(paragraph(head, { after: 40 }));
      right.push(paragraph([run(proj.description, { color: rightBody, size: 19, font })], { after: 40 }));
      if (proj.technologies?.length) {
        right.push(paragraph([run(proj.technologies.join('   •   '), { color: '64748B', size: 16, font })], { after: idx < data.projects.length - 1 ? 160 : 80 }));
      }
    });
    right.push(spacer(120));
  }

  if (data.references !== undefined) {
    right.push(sectionHead('References'));
    referenceList(data, { primary, accent, font, size: 19, bodyColor: rightBody }).forEach((n) => right.push(n));
  }

  return [
    fullTable([
      new TableRow({
        height: { value: 16000, rule: HeightRule.ATLEAST },
        children: [
          tableCell(left, { width: 36, fill: primary, margins: { top: 480, bottom: 480, left: 360, right: 280 } }),
          tableCell(right, { width: 64, fill: rightBg, margins: { top: 480, bottom: 480, left: 400, right: 400 } }),
        ],
      }),
    ]),
  ];
}

/* =====================================================================
 * EUROPASS TEMPLATE
 * Solid navy header band; below: 1:3 grid with right-aligned uppercase
 * labels in primary color, and content with bold "key: value" lines.
 * ===================================================================== */
function buildEuropass(ctx: BuildContext): DocxNode[] {
  const { data } = ctx;
  const { primary, accent, font } = ctx.palette;
  const rows: TableRow[] = [];

  const europassPic = imageParagraph(data.personalInfo.profilePicture, { size: 110, align: 'CENTER', after: 0 });
  if (europassPic) {
    rows.push(new TableRow({
      children: [
        tableCell([europassPic], { width: 24, fill: primary, margins: { top: 420, bottom: 420, left: 280, right: 200 }, verticalAlign: 'center' }),
        tableCell([
          paragraph([run(data.personalInfo.fullName || '', { bold: true, color: 'FFFFFF', size: 34, font })], { after: 60 }),
          paragraph([run(data.personalInfo.jobTitle || '', { color: 'DBEAFE', size: 24, font })], { after: 0 }),
        ], { width: 76, fill: primary, margins: { top: 420, bottom: 420, left: 200, right: 480 }, verticalAlign: 'center' }),
      ],
    }));
  } else {
    rows.push(new TableRow({
      children: [
        tableCell([
          paragraph([run(data.personalInfo.fullName || '', { bold: true, color: 'FFFFFF', size: 34, font })], { after: 60 }),
          paragraph([run(data.personalInfo.jobTitle || '', { color: 'DBEAFE', size: 24, font })], { after: 0 }),
        ], { width: 100, fill: primary, margins: { top: 420, bottom: 420, left: 480, right: 480 }, colSpan: 2 }),
      ],
    }));
  }

  const labelCell = (label: string) =>
    tableCell(
      [paragraph([run(label, { bold: true, color: primary, size: 20, font, allCaps: true })], { align: 'RIGHT', after: 0 })],
      { width: 24, margins: { top: 200, bottom: 200, left: 120, right: 240 } },
    );

  const contentCell = (children: DocxNode[]) =>
    tableCell(children, { width: 76, margins: { top: 200, bottom: 200, left: 200, right: 200 } });

  const personalContent: DocxNode[] = [];
  const i = data.personalInfo;
  const entries: Array<[string, string | undefined]> = [
    ['Address', i.location], ['Email', i.email], ['Phone', i.phone],
    ['LinkedIn', i.linkedin], ['GitHub', i.github], ['Website', i.website],
  ];
  entries.forEach(([k, v]) => {
    if (!v) return;
    personalContent.push(paragraph([
      run(`${k}: `, { bold: true, color: '111827', size: 19, font }),
      run(v, { color: '111827', size: 19, font }),
    ], { after: 50 }));
  });
  if (personalContent.length) rows.push(new TableRow({ children: [labelCell('Personal Info'), contentCell(personalContent)] }));

  if (data.personalInfo.summary) {
    rows.push(new TableRow({
      children: [labelCell('Summary'), contentCell([
        paragraph([run(data.personalInfo.summary, { color: '111827', size: 20, font })]),
      ])],
    }));
  }

  if (data.experience.length) {
    const items: DocxNode[] = [];
    data.experience.forEach((exp, idx) => {
      items.push(paragraph([run([exp.startDate, exp.endDate].filter(Boolean).join(' - '), { color: '6B7280', size: 18, font })], { after: 30 }));
      items.push(paragraph([run(exp.role, { bold: true, color: '111827', size: 21, font })], { after: 30 }));
      items.push(paragraph([run(exp.company, { bold: true, color: accent, size: 19, font })], { after: 60 }));
      bulletList(splitLines(exp.description), { color: '111827', size: 19, font }).forEach((b) => items.push(b));
      if (idx < data.experience.length - 1) items.push(spacer(140));
    });
    rows.push(new TableRow({ children: [labelCell('Work Experience'), contentCell(items)] }));
  }

  if (data.education.length) {
    const items: DocxNode[] = [];
    data.education.forEach((edu, idx) => {
      items.push(paragraph([run([edu.startDate, edu.endDate].filter(Boolean).join(' - '), { color: '6B7280', size: 18, font })], { after: 30 }));
      items.push(paragraph([run(edu.degree, { bold: true, color: '111827', size: 21, font })], { after: 30 }));
      items.push(paragraph([run(edu.institution, { bold: true, color: accent, size: 19, font })], { after: 60 }));
      if (edu.description) items.push(paragraph([run(edu.description, { color: '111827', size: 19, font })], { after: idx < data.education.length - 1 ? 140 : 0 }));
    });
    rows.push(new TableRow({ children: [labelCell('Education'), contentCell(items)] }));
  }

  if (data.projects.length) {
    const items: DocxNode[] = [];
    data.projects.forEach((proj, idx) => {
      const head: TextRun[] = [run(proj.name, { bold: true, color: '111827', size: 21, font })];
      if (proj.link) head.push(run(`  (${proj.link})`, { italics: true, color: accent, size: 17, font }));
      items.push(paragraph(head, { after: 40 }));
      items.push(paragraph([run(proj.description, { color: '111827', size: 19, font })], { after: 40 }));
      if (proj.technologies?.length) {
        items.push(paragraph([
          run('Tech: ', { italics: true, color: '6B7280', size: 17, font }),
          run(proj.technologies.join(', '), { italics: true, color: '6B7280', size: 17, font }),
        ], { after: idx < data.projects.length - 1 ? 140 : 0 }));
      }
    });
    rows.push(new TableRow({ children: [labelCell('Projects'), contentCell(items)] }));
  }

  if (data.skills.length) {
    const grid = pillGrid(data.skills, {
      textColor: primary,
      fillColor: 'EFF6FF',
      borderColor: 'BFDBFE',
      font,
      size: 18,
      columns: 3,
    });
    rows.push(new TableRow({
      children: [labelCell('Skills'), contentCell(grid ? [grid] : [
        paragraph([run(data.skills.join(', '), { color: '111827', size: 20, font })]),
      ])],
    }));
  }

  if ((data.languages || []).length) {
    // Formal Europass self-assessment grid: Understanding (Listening, Reading),
    // Speaking (Interaction, Production), Writing. We replicate the official
    // EU layout; per-skill levels mirror the user's single CEFR level.
    const headRow = new TableRow({
      children: [
        tableCell([paragraph([run('Language', { bold: true, color: primary, size: 16, font, allCaps: true })], { after: 0 })], { width: 20, margins: { top: 60, bottom: 60, left: 60, right: 60 } }),
        tableCell([paragraph([run('Listening', { color: primary, size: 14, font })], { align: 'CENTER', after: 0 })], { width: 16, margins: { top: 60, bottom: 60, left: 40, right: 40 } }),
        tableCell([paragraph([run('Reading', { color: primary, size: 14, font })], { align: 'CENTER', after: 0 })], { width: 16, margins: { top: 60, bottom: 60, left: 40, right: 40 } }),
        tableCell([paragraph([run('Interaction', { color: primary, size: 14, font })], { align: 'CENTER', after: 0 })], { width: 16, margins: { top: 60, bottom: 60, left: 40, right: 40 } }),
        tableCell([paragraph([run('Production', { color: primary, size: 14, font })], { align: 'CENTER', after: 0 })], { width: 16, margins: { top: 60, bottom: 60, left: 40, right: 40 } }),
        tableCell([paragraph([run('Writing', { color: primary, size: 14, font })], { align: 'CENTER', after: 0 })], { width: 16, margins: { top: 60, bottom: 60, left: 40, right: 40 } }),
      ],
    });
    const subHeadRow = new TableRow({
      children: [
        tableCell([paragraph([''], { after: 0 })], { width: 20, margins: { top: 0, bottom: 60, left: 60, right: 60 } }),
        tableCell([paragraph([run('Understanding', { color: '6B7280', size: 13, font, italics: true })], { align: 'CENTER', after: 0 })], { width: 32, colSpan: 2, margins: { top: 0, bottom: 60, left: 40, right: 40 } }),
        tableCell([paragraph([run('Speaking', { color: '6B7280', size: 13, font, italics: true })], { align: 'CENTER', after: 0 })], { width: 32, colSpan: 2, margins: { top: 0, bottom: 60, left: 40, right: 40 } }),
        tableCell([paragraph([''], { after: 0 })], { width: 16, margins: { top: 0, bottom: 60, left: 40, right: 40 } }),
      ],
    });
    const dataRows = (data.languages || []).map((lang) => {
      const s = lang.skills || {};
      const cell = (level: string) =>
        tableCell([paragraph([run(level, { color: '111827', size: 18, font })], { align: 'CENTER', after: 0 })], { width: 16, margins: { top: 60, bottom: 60, left: 40, right: 40 } });
      return new TableRow({
        children: [
          tableCell([paragraph([run(lang.name, { bold: true, color: '111827', size: 18, font })], { after: 0 })], { width: 20, margins: { top: 60, bottom: 60, left: 60, right: 60 } }),
          cell(s.listening || lang.level),
          cell(s.reading || lang.level),
          cell(s.spokenInteraction || lang.level),
          cell(s.spokenProduction || lang.level),
          cell(s.writing || lang.level),
        ],
      });
    });
    const langGrid = new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      layout: TableLayoutType.FIXED,
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' },
        left: { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' },
        right: { style: BorderStyle.SINGLE, size: 4, color: 'D1D5DB' },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: 'E5E7EB' },
        insideVertical: { style: BorderStyle.SINGLE, size: 2, color: 'E5E7EB' },
      },
      rows: [subHeadRow, headRow, ...dataRows],
    });
    const legend = paragraph([
      run('Levels: A1/A2 Basic · B1/B2 Independent · C1/C2 Proficient (CEFR)', { color: '6B7280', size: 14, font, italics: true }),
    ], { after: 0 });
    rows.push(new TableRow({
      children: [labelCell('Languages'), contentCell([langGrid, legend])],
    }));
  }

  if (data.references !== undefined) {
    rows.push(new TableRow({
      children: [labelCell('References'), contentCell(
        referenceList(data, { primary, accent, font, size: 19 }),
      )],
    }));
  }

  // Filler row — pushes the table to fill the remaining page height with the
  // body background so the area below content doesn't render as bare white.
  rows.push(new TableRow({
    height: { value: 14000, rule: HeightRule.ATLEAST },
    children: [
      new TableCell({
        width: { size: 100, type: WidthType.PERCENTAGE },
        columnSpan: 2,
        shading: { type: ShadingType.CLEAR, fill: 'FFFFFF' },
        borders: ALL_NO_BORDERS,
        children: [new Paragraph({ children: [run('')] })],
      }),
    ],
  }));

  return [fullTable(rows)];
}

/* =====================================================================
 * HARVARD TEMPLATE
 * Times New Roman (serif). Centered black uppercase name. Pipe-separated
 * contact line. Section headings underlined.
 * Experience: company bold left, dates right; role italic below; bullets.
 * ===================================================================== */
function buildHarvard(ctx: BuildContext): DocxNode[] {
  // Harvard CV convention: strict monochrome, serif, Education FIRST.
  // Theme primary/accent are intentionally ignored — Harvard format requires
  // a single ink color regardless of user theme.
  const { data } = ctx;
  const { font } = ctx.palette;
  const ink = '000000';
  const nodes: DocxNode[] = [];

  nodes.push(paragraph([run(data.personalInfo.fullName || '', { bold: true, color: ink, size: 34, font, allCaps: true })], { align: 'CENTER', after: 80 }));

  const contact = [data.personalInfo.location, data.personalInfo.phone, data.personalInfo.email, data.personalInfo.linkedin]
    .filter(Boolean).join(' | ');
  if (contact) nodes.push(paragraph([run(contact, { color: ink, size: 20, font })], { align: 'CENTER', after: 200 }));

  if (data.personalInfo.summary) {
    nodes.push(paragraph([run(data.personalInfo.summary, { color: ink, size: 22, font })], { after: 200 }));
  }

  const section = (label: string): Paragraph =>
    paragraph(
      [run(label, { bold: true, color: ink, size: 22, font, allCaps: true })],
      { after: 100, before: 100, border: { bottom: { color: ink, size: 6 } }, keepNext: true },
    );

  // Education FIRST per Harvard convention.
  if (data.education.length) {
    nodes.push(section('Education'));
    data.education.forEach((edu, idx) => {
      nodes.push(fullTable([
        new TableRow({
          children: [
            tableCell([paragraph([run(edu.institution, { bold: true, color: ink, size: 22, font })], { after: 30 })], { width: 70, margins: { top: 0, bottom: 0, left: 0, right: 0 } }),
            tableCell([paragraph([run([edu.startDate, edu.endDate].filter(Boolean).join(' – '), { color: ink, size: 20, font })], { align: 'RIGHT', after: 30 })], { width: 30, margins: { top: 0, bottom: 0, left: 0, right: 0 } }),
          ],
        }),
      ]));
      nodes.push(paragraph([run(edu.degree, { italics: true, color: ink, size: 20, font })], { after: 40 }));
      if (edu.description) nodes.push(paragraph([run(edu.description, { color: ink, size: 20, font })], { after: idx < data.education.length - 1 ? 140 : 80 }));
    });
    nodes.push(spacer(80));
  }

  if (data.experience.length) {
    nodes.push(section('Experience'));
    data.experience.forEach((exp, idx) => {
      nodes.push(fullTable([
        new TableRow({
          children: [
            tableCell([paragraph([run(exp.company, { bold: true, color: ink, size: 22, font })], { after: 30 })], { width: 70, margins: { top: 0, bottom: 0, left: 0, right: 0 } }),
            tableCell([paragraph([run([exp.startDate, exp.endDate].filter(Boolean).join(' – '), { color: ink, size: 20, font })], { align: 'RIGHT', after: 30 })], { width: 30, margins: { top: 0, bottom: 0, left: 0, right: 0 } }),
          ],
        }),
      ]));
      nodes.push(paragraph([run(exp.role, { italics: true, color: ink, size: 20, font })], { after: 60 }));
      bulletList(splitLines(exp.description), { color: ink, size: 20, font }).forEach((b) => nodes.push(b));
      if (idx < data.experience.length - 1) nodes.push(spacer(140));
    });
    nodes.push(spacer(80));
  }

  if (data.projects.length) {
    nodes.push(section('Projects & Research'));
    data.projects.forEach((proj, idx) => {
      const head: TextRun[] = [run(proj.name, { bold: true, color: ink, size: 22, font })];
      if (proj.link) head.push(run(`  (${proj.link})`, { italics: true, color: ink, size: 18, font }));
      nodes.push(paragraph(head, { after: 40 }));
      nodes.push(paragraph([run(proj.description, { color: ink, size: 20, font })], { after: 40 }));
      if (proj.technologies?.length) {
        nodes.push(paragraph([run(`Tools: ${proj.technologies.join(', ')}`, { italics: true, color: ink, size: 18, font })], { after: idx < data.projects.length - 1 ? 140 : 80 }));
      }
    });
    nodes.push(spacer(80));
  }

  if (data.skills.length) {
    nodes.push(section('Skills & Interests'));
    nodes.push(paragraph([
      run('Technical: ', { bold: true, color: ink, size: 20, font }),
      run(data.skills.join(', '), { color: ink, size: 20, font }),
    ]));
  }

  if ((data.languages || []).length) {
    nodes.push(section('Languages'));
    nodes.push(paragraph([
      run((data.languages || []).map((l) => `${l.name} (${l.level})`).join(', '), { color: ink, size: 20, font }),
    ]));
  }

  if (data.references !== undefined) {
    nodes.push(section('References'));
    referenceList(data, { primary: ink, accent: ink, font, size: 20, bodyColor: ink, fallbackText: 'Available upon request.' }).forEach((n) => nodes.push(n));
  }

  return nodes;
}

/* =====================================================================
 * ENGINEERS AUSTRALIA TEMPLATE
 * Centered name with bottom border. Contact in 2-col label/value grid.
 * Section headings with primary border. Education/Experience use 1:3
 * date/content rows. Experience inserts "Duties & Responsibilities:"
 * underlined header before bullets, indented to align with content col.
 * ===================================================================== */
function buildEngineersAustralia(ctx: BuildContext): DocxNode[] {
  const { data } = ctx;
  const { primary, accent, font } = ctx.palette;
  const nodes: DocxNode[] = [];

  const eaPic = imageParagraph(data.personalInfo.profilePicture, { size: 100, align: 'CENTER', after: 100 });
  if (eaPic) nodes.push(eaPic);
  nodes.push(paragraph([run(data.personalInfo.fullName || '', { bold: true, color: primary, size: 34, font, allCaps: true })], { align: 'CENTER', after: 120 }));

  const contactRow = (label: string, value?: string): TableRow | undefined => {
    if (!value) return undefined;
    return new TableRow({
      children: [
        tableCell([paragraph([run(`${label}:`, { bold: true, color: accent, size: 20, font })], { align: 'RIGHT', after: 0 })], { width: 35, margins: { top: 40, bottom: 40, left: 0, right: 160 } }),
        tableCell([paragraph([run(value, { color: '111827', size: 20, font })], { after: 0 })], { width: 65, margins: { top: 40, bottom: 40, left: 0, right: 0 } }),
      ],
    });
  };

  const contactRows = [
    contactRow('Address', data.personalInfo.location),
    contactRow('Phone', data.personalInfo.phone),
    contactRow('Email', data.personalInfo.email),
    contactRow('LinkedIn', data.personalInfo.linkedin),
  ].filter((r): r is TableRow => Boolean(r));
  if (contactRows.length) nodes.push(fullTable(contactRows, 75));

  nodes.push(paragraph([''], { after: 60, border: { bottom: { color: primary, size: 12 } } }));
  nodes.push(spacer(140));

  const section = (label: string): Paragraph =>
    paragraph(
      [run(label, { bold: true, color: primary, size: 22, font, allCaps: true })],
      { after: 80, before: 60, border: { bottom: { color: primary, size: 6 } }, keepNext: true },
    );

  if (data.personalInfo.summary) {
    nodes.push(section('Career Objective'));
    nodes.push(paragraph([run(data.personalInfo.summary, { color: '111827', size: 20, font })], { align: 'BOTH', after: 200 }));
  }

  if (data.education.length) {
    nodes.push(section('Academic Qualifications'));
    data.education.forEach((edu, idx) => {
      nodes.push(fullTable([
        new TableRow({
          children: [
            tableCell([paragraph([run([edu.startDate, edu.endDate].filter(Boolean).join(' - '), { bold: true, color: accent, size: 20, font })], { after: 0 })], { width: 25, margins: { top: 0, bottom: 0, left: 0, right: 200 } }),
            tableCell([
              paragraph([run(edu.degree, { bold: true, color: '111827', size: 20, font })], { after: 30 }),
              paragraph([run(edu.institution, { italics: true, color: '111827', size: 20, font })], { after: edu.description ? 40 : 0 }),
              ...(edu.description ? [paragraph([run(edu.description, { color: '111827', size: 20, font })], { after: 0 })] : []),
            ], { width: 75, margins: { top: 0, bottom: 0, left: 0, right: 0 } }),
          ],
        }),
      ]));
      if (idx < data.education.length - 1) nodes.push(spacer(140));
    });
    nodes.push(spacer(140));
  }

  if (data.experience.length) {
    nodes.push(section('Employment History'));
    data.experience.forEach((exp, idx) => {
      nodes.push(fullTable([
        new TableRow({
          children: [
            tableCell([paragraph([run([exp.startDate, exp.endDate].filter(Boolean).join(' - '), { bold: true, color: accent, size: 20, font })], { after: 0 })], { width: 25, margins: { top: 0, bottom: 0, left: 0, right: 200 } }),
            tableCell([
              paragraph([run(exp.company, { bold: true, color: '111827', size: 22, font })], { after: 30 }),
              paragraph([run(exp.role, { italics: true, bold: true, color: '111827', size: 20, font })], { after: 60 }),
            ], { width: 75, margins: { top: 0, bottom: 0, left: 0, right: 0 } }),
          ],
        }),
      ]));
      // Duties row, indented to right column
      nodes.push(fullTable([
        new TableRow({
          children: [
            tableCell([paragraph([''], { after: 0 })], { width: 25, margins: { top: 0, bottom: 0, left: 0, right: 0 } }),
            tableCell([
              paragraph([run('Duties & Responsibilities:', { bold: true, color: '111827', size: 20, font, underline: true })], { after: 60, keepNext: true }),
              ...bulletList(splitLines(exp.description), { color: '111827', size: 20, font, indent: 240 }),
            ], { width: 75, margins: { top: 0, bottom: 0, left: 0, right: 0 } }),
          ],
        }),
      ]));
      if (idx < data.experience.length - 1) nodes.push(spacer(180));
    });
    nodes.push(spacer(140));
  }

  if (data.projects.length) {
    nodes.push(section('Key Projects'));
    data.projects.forEach((proj, idx) => {
      const head: TextRun[] = [run(proj.name, { bold: true, color: '111827', size: 20, font })];
      if (proj.link) head.push(run(`  (${proj.link})`, { italics: true, color: '6B7280', size: 17, font }));
      nodes.push(fullTable([
        new TableRow({
          children: [
            tableCell([paragraph([''], { after: 0 })], { width: 25, margins: { top: 0, bottom: 0, left: 0, right: 0 } }),
            tableCell([
              paragraph(head, { after: 40 }),
              paragraph([run(proj.description, { color: '111827', size: 20, font })], { after: 40 }),
              ...(proj.technologies?.length ? [paragraph([
                run('Technologies used: ', { bold: true, italics: true, color: '111827', size: 18, font }),
                run(proj.technologies.join(', '), { italics: true, color: '111827', size: 18, font }),
              ], { after: 0 })] : []),
            ], { width: 75, margins: { top: 0, bottom: 0, left: 0, right: 0 } }),
          ],
        }),
      ]));
      if (idx < data.projects.length - 1) nodes.push(spacer(160));
    });
    nodes.push(spacer(140));
  }

  // Skills come AFTER experience and projects per CDR convention — they
  // contextualise the work shown above rather than introducing it.
  if (data.skills.length) {
    nodes.push(section('Software & Technical Skills'));
    const half = Math.ceil(data.skills.length / 2);
    const col1 = data.skills.slice(0, half);
    const col2 = data.skills.slice(half);
    nodes.push(fullTable([
      new TableRow({
        children: [
          tableCell(bulletList(col1, { color: '111827', size: 20, font, indent: 240 }), { width: 50, margins: { top: 0, bottom: 0, left: 0, right: 200 } }),
          tableCell(bulletList(col2, { color: '111827', size: 20, font, indent: 240 }), { width: 50, margins: { top: 0, bottom: 0, left: 0, right: 0 } }),
        ],
      }),
    ]));
    nodes.push(spacer(140));
  }

  if ((data.languages || []).length) {
    nodes.push(section('Languages'));
    (data.languages || []).forEach((lang) => {
      nodes.push(fullTable([
        new TableRow({
          children: [
            tableCell([paragraph([run(lang.name, { bold: true, color: accent, size: 20, font })], { after: 0 })], { width: 25, margins: { top: 0, bottom: 0, left: 0, right: 200 } }),
            tableCell([paragraph([run(lang.level, { color: '111827', size: 20, font })], { after: 0 })], { width: 75, margins: { top: 0, bottom: 0, left: 0, right: 0 } }),
          ],
        }),
      ]));
    });
    nodes.push(spacer(140));
  }

  if (data.references !== undefined) {
    nodes.push(section('References'));
    referenceList(data, { primary, accent, font, size: 20 }).forEach((n) => nodes.push(n));
  }

  return nodes;
}

/* =====================================================================
 * GRID PORTFOLIO TEMPLATE
 * Centered hero (huge name, primary color subtitle, gray summary, contact).
 * "Featured Work" section with 2-col project card grid.
 * Below: 2:1 split of Experience | Skills+Education
 * ===================================================================== */
function buildPortfolio(ctx: BuildContext): DocxNode[] {
  const { data } = ctx;
  const { primary, accent, font } = ctx.palette;
  const cardFill = 'FFFFFF';
  const pageFill = 'F8F9FA';
  const nodes: DocxNode[] = [];

  // Hero
  const portfolioPic = imageParagraph(data.personalInfo.profilePicture, { size: 130, align: 'CENTER', after: 160 });
  const hero: DocxNode[] = [
    ...(portfolioPic ? [portfolioPic] : []),
    paragraph([run(data.personalInfo.fullName || '', { bold: true, color: '111827', size: 48, font })], { align: 'CENTER', after: 80 }),
    paragraph([run(data.personalInfo.jobTitle || '', { color: primary, size: 26, font })], { align: 'CENTER', after: 160 }),
  ];
  if (data.personalInfo.summary) {
    hero.push(paragraph([run(data.personalInfo.summary, { color: '4B5563', size: 22, font })], { align: 'CENTER', after: 200 }));
  }
  const contactLine: string[] = [];
  if (data.personalInfo.email) contactLine.push(data.personalInfo.email);
  if (data.personalInfo.location) contactLine.push(data.personalInfo.location);
  if (data.personalInfo.github) contactLine.push(data.personalInfo.github);
  if (data.personalInfo.linkedin) contactLine.push(data.personalInfo.linkedin);
  if (contactLine.length) hero.push(paragraph([run(contactLine.join('   |   '), { color: primary, size: 19, font })], { align: 'CENTER', after: 0 }));

  // Wrap whole page in a light-fill table to mimic bg color
  const inner: DocxNode[] = [...hero, spacer(280)];

  if (data.projects.length) {
    inner.push(paragraph([run('Featured Work', { bold: true, color: '111827', size: 32, font })], { after: 200, keepNext: true }));
    // Build 2-col grid
    const projectCells: TableCell[] = data.projects.map((proj) => {
      const cellChildren: DocxNode[] = [];
      const head: TextRun[] = [run(proj.name, { bold: true, color: '111827', size: 24, font })];
      if (proj.link) head.push(run(`  (${proj.link})`, { color: primary, size: 16, font }));
      cellChildren.push(paragraph(head, { after: 100 }));
      cellChildren.push(paragraph([run(proj.description, { color: '4B5563', size: 19, font })], { after: 120 }));
      if (proj.technologies?.length) {
        cellChildren.push(paragraph([run(proj.technologies.join('   •   '), { color: primary, size: 17, font })]));
      }
      return tableCell(cellChildren, { width: 50, fill: cardFill, margins: { top: 320, bottom: 320, left: 320, right: 320 } });
    });
    const rows: TableRow[] = [];
    for (let i = 0; i < projectCells.length; i += 2) {
      const c1 = projectCells[i];
      const c2 = projectCells[i + 1] ?? tableCell([], { width: 50, fill: pageFill });
      rows.push(new TableRow({ children: [c1, c2] }));
    }
    inner.push(fullTable(rows));
    inner.push(spacer(280));
  }

  // 2:1 split
  if (data.experience.length || data.skills.length || data.education.length) {
    const expCol: DocxNode[] = [];
    if (data.experience.length) {
      expCol.push(paragraph([run('Experience', { bold: true, color: '111827', size: 26, font })], { after: 160, keepNext: true }));
      data.experience.forEach((exp, idx) => {
        expCol.push(paragraph([run(exp.role, { bold: true, color: '111827', size: 22, font })], { after: 40 }));
        expCol.push(paragraph([
          run(exp.company, { bold: true, color: primary, size: 19, font }),
          run('  |  ', { color: '9CA3AF', size: 19, font }),
          run([exp.startDate, exp.endDate].filter(Boolean).join(' - '), { color: '6B7280', size: 18, font }),
        ], { after: 80 }));
        bulletList(splitLines(exp.description), { color: '4B5563', size: 19, font }).forEach((b) => expCol.push(b));
        if (idx < data.experience.length - 1) expCol.push(spacer(160));
      });
    }

    const sideCol: DocxNode[] = [];
    if (data.skills.length) {
      sideCol.push(paragraph([run('Skills', { bold: true, color: '111827', size: 26, font })], { after: 160, keepNext: true }));
      const grid = pillGrid(data.skills, {
        textColor: '374151',
        fillColor: cardFill,
        borderColor: 'BFDBFE',
        font,
        size: 17,
        columns: 2,
      });
      if (grid) sideCol.push(grid);
      sideCol.push(spacer(180));
    }
    if (data.education.length) {
      sideCol.push(paragraph([run('Education', { bold: true, color: '111827', size: 26, font })], { after: 160, keepNext: true }));
      data.education.forEach((edu, idx) => {
        sideCol.push(paragraph([run(edu.degree, { bold: true, color: '111827', size: 20, font })], { after: 30, shading: cardFill, indent: { left: 80, right: 80 } }));
        sideCol.push(paragraph([run(edu.institution, { color: '4B5563', size: 18, font })], { after: 30, shading: cardFill, indent: { left: 80, right: 80 } }));
        sideCol.push(paragraph([run([edu.startDate, edu.endDate].filter(Boolean).join(' - '), { color: '9CA3AF', size: 16, font })], { after: idx < data.education.length - 1 ? 120 : 0, shading: cardFill, indent: { left: 80, right: 80 } }));
      });
      sideCol.push(spacer(180));
    }
    if ((data.languages || []).length) {
      sideCol.push(paragraph([run('Languages', { bold: true, color: '111827', size: 26, font })], { after: 160, keepNext: true }));
      (data.languages || []).forEach((lang) => {
        sideCol.push(paragraph([
          run(lang.name, { bold: true, color: '111827', size: 19, font }),
          run(`     ${lang.level}`, { color: '6B7280', size: 17, font }),
        ], { after: 60, shading: cardFill, indent: { left: 80, right: 80 } }));
      });
    }

    inner.push(fullTable([
      new TableRow({
        children: [
          tableCell(expCol, { width: 66, margins: { top: 0, bottom: 0, left: 0, right: 400 } }),
          tableCell(sideCol, { width: 34, margins: { top: 0, bottom: 0, left: 0, right: 0 } }),
        ],
      }),
    ]));

    if (data.references !== undefined) {
      inner.push(spacer(280));
      inner.push(paragraph([run('References', { bold: true, color: '111827', size: 26, font })], { after: 160, keepNext: true }));
      referenceList(data, { primary, accent, font, size: 19 }).forEach((n) => inner.push(n));
    }
  }

  // Wrap with outer page-fill table that extends to the page bottom.
  return [
    fullTable([
      new TableRow({
        height: { value: 16000, rule: HeightRule.ATLEAST },
        children: [
          tableCell(inner, { width: 100, fill: pageFill, margins: { top: 600, bottom: 600, left: 540, right: 540 } }),
        ],
      }),
    ]),
  ];
}

/* =====================================================================
 * CREATIVE PORTFOLIO TEMPLATE
 * Rose/pink hero banner with big name. Below: 2:1 About | Contact card.
 * "Selected Works" with 2-col project cards (white on light gray bg).
 * Then 1:1 split of Experience | Expertise+Education.
 * ===================================================================== */
function buildCreative(ctx: BuildContext): DocxNode[] {
  const { data } = ctx;
  const { primary, accent, font } = ctx.palette;
  const pageFill = 'FAFAFA';
  const cardFill = 'FFFFFF';
  const nodes: DocxNode[] = [];

  // Hero band — optional picture on the left, headline on the right.
  const creativePic = imageParagraph(data.personalInfo.profilePicture, { size: 130, align: 'CENTER', after: 0 });
  nodes.push(fullTable([
    new TableRow({
      children: [
        ...(creativePic ? [tableCell([creativePic], { width: 22, fill: primary, margins: { top: 560, bottom: 560, left: 540, right: 200 }, verticalAlign: 'center' })] : []),
        tableCell([
          paragraph([run(data.personalInfo.fullName || '', { bold: true, color: 'FFFFFF', size: 52, font })], { after: 80 }),
          paragraph([run(data.personalInfo.jobTitle || '', { color: 'FFE4E6', size: 26, font })], { after: 100 }),
          paragraph([run([data.personalInfo.location, data.personalInfo.website].filter(Boolean).join('   |   '), { color: 'FFF1F2', size: 18, font })], { after: 0 }),
        ], { width: creativePic ? 78 : 100, fill: primary, margins: { top: 560, bottom: 560, left: creativePic ? 200 : 540, right: 540 }, verticalAlign: 'center' }),
      ],
    }),
  ]));

  // About + Contact card split
  const aboutCol: DocxNode[] = [
    paragraph([run('About Me', { bold: true, color: primary, size: 28, font })], { after: 140, keepNext: true }),
    paragraph([run(data.personalInfo.summary || '', { color: '4B5563', size: 22, font })], { after: 0 }),
  ];
  const contactCol: DocxNode[] = [
    paragraph([run('Contact', { bold: true, color: '111827', size: 18, font, allCaps: true })], { after: 120 }),
  ];
  if (data.personalInfo.email) contactCol.push(paragraph([run(data.personalInfo.email, { color: '4B5563', size: 18, font })], { after: 60 }));
  if (data.personalInfo.phone) contactCol.push(paragraph([run(data.personalInfo.phone, { color: '4B5563', size: 18, font })], { after: 60 }));
  if (data.personalInfo.linkedin) contactCol.push(paragraph([run(data.personalInfo.linkedin, { color: '4B5563', size: 18, font })], { after: 60 }));
  if (data.personalInfo.github) contactCol.push(paragraph([run(data.personalInfo.github, { color: '4B5563', size: 18, font })], { after: 0 }));

  const inner: DocxNode[] = [
    fullTable([
      new TableRow({
        children: [
          tableCell(aboutCol, { width: 66, margins: { top: 0, bottom: 0, left: 0, right: 320 } }),
          tableCell(contactCol, { width: 34, fill: cardFill, margins: { top: 240, bottom: 240, left: 320, right: 320 } }),
        ],
      }),
    ]),
    spacer(320),
  ];

  if (data.projects.length) {
    inner.push(paragraph([run('Selected Works', { bold: true, color: primary, size: 36, font })], { after: 200, keepNext: true }));
    const cells: TableCell[] = data.projects.map((proj) => {
      const children: DocxNode[] = [];
      children.push(paragraph([run(proj.name, { bold: true, color: '111827', size: 24, font })], { after: 80 }));
      children.push(paragraph([run(proj.description, { color: '4B5563', size: 19, font })], { after: 120 }));
      if (proj.technologies?.length) {
        children.push(paragraph([run(proj.technologies.join('   •   '), { color: primary, size: 17, font })], { after: proj.link ? 80 : 0 }));
      }
      if (proj.link) {
        children.push(paragraph([run(`View Project — ${proj.link}`, { bold: true, color: accent, size: 17, font })], { after: 0 }));
      }
      return tableCell(children, { width: 50, fill: cardFill, margins: { top: 300, bottom: 300, left: 300, right: 300 } });
    });
    const rows: TableRow[] = [];
    for (let i = 0; i < cells.length; i += 2) {
      rows.push(new TableRow({ children: [cells[i], cells[i + 1] ?? tableCell([], { width: 50, fill: pageFill })] }));
    }
    inner.push(fullTable(rows));
    inner.push(spacer(320));
  }

  if (data.experience.length || data.skills.length || data.education.length) {
    const expCol: DocxNode[] = [];
    if (data.experience.length) {
      expCol.push(paragraph([run('Experience', { bold: true, color: primary, size: 28, font })], { after: 160, keepNext: true }));
      data.experience.forEach((exp, idx) => {
        expCol.push(paragraph([run(exp.role, { bold: true, color: '111827', size: 21, font })], { after: 40, border: { left: { color: primary, size: 18 } }, indent: { left: 200 } }));
        expCol.push(paragraph([
          run(exp.company, { bold: true, color: accent, size: 18, font }),
          run('   '),
          run([exp.startDate, exp.endDate].filter(Boolean).join(' - '), { color: '9CA3AF', size: 17, font }),
        ], { after: 80, border: { left: { color: primary, size: 18 } }, indent: { left: 200 } }));
        bulletList(splitLines(exp.description), { color: '4B5563', size: 18, font, indent: 360 }).forEach((b) => expCol.push(b));
        if (idx < data.experience.length - 1) expCol.push(spacer(160));
      });
    }

    const sideCol: DocxNode[] = [];
    if (data.skills.length) {
      sideCol.push(paragraph([run('Expertise', { bold: true, color: primary, size: 28, font })], { after: 160, keepNext: true }));
      const grid = pillGrid(data.skills, {
        textColor: '374151',
        fillColor: 'FFFFFF',
        borderColor: 'E5E7EB',
        font,
        size: 17,
        columns: 2,
      });
      if (grid) sideCol.push(grid);
      sideCol.push(spacer(240));
    }
    if (data.education.length) {
      sideCol.push(paragraph([run('Education', { bold: true, color: primary, size: 28, font })], { after: 160, keepNext: true }));
      data.education.forEach((edu, idx) => {
        sideCol.push(paragraph([run(edu.degree, { bold: true, color: '111827', size: 20, font })], { after: 30, shading: cardFill, indent: { left: 160, right: 160 } }));
        sideCol.push(paragraph([run(edu.institution, { color: '4B5563', size: 18, font })], { after: 30, shading: cardFill, indent: { left: 160, right: 160 } }));
        sideCol.push(paragraph([run([edu.startDate, edu.endDate].filter(Boolean).join(' - '), { color: '9CA3AF', size: 16, font })], { after: idx < data.education.length - 1 ? 120 : 0, shading: cardFill, indent: { left: 160, right: 160 } }));
      });
      sideCol.push(spacer(240));
    }
    if ((data.languages || []).length) {
      sideCol.push(paragraph([run('Languages', { bold: true, color: primary, size: 28, font })], { after: 160, keepNext: true }));
      (data.languages || []).forEach((lang) => {
        sideCol.push(paragraph([
          run(lang.name, { bold: true, color: '111827', size: 19, font }),
          run(`     ${lang.level}`, { color: '6B7280', size: 17, font }),
        ], { after: 60, shading: cardFill, indent: { left: 160, right: 160 } }));
      });
    }

    inner.push(fullTable([
      new TableRow({
        children: [
          tableCell(expCol, { width: 50, margins: { top: 0, bottom: 0, left: 0, right: 320 } }),
          tableCell(sideCol, { width: 50, margins: { top: 0, bottom: 0, left: 0, right: 0 } }),
        ],
      }),
    ]));
  }

  if (data.references !== undefined) {
    inner.push(spacer(320));
    inner.push(paragraph([run('References', { bold: true, color: primary, size: 28, font })], { after: 160, keepNext: true }));
    referenceList(data, { primary, accent, font, size: 19 }).forEach((n) => inner.push(n));
  }

  nodes.push(fullTable([
    new TableRow({
      height: { value: 14500, rule: HeightRule.ATLEAST },
      children: [
        tableCell(inner, { width: 100, fill: pageFill, margins: { top: 600, bottom: 600, left: 540, right: 540 } }),
      ],
    }),
  ]));

  return nodes;
}

/* =====================================================================
 * DEVELOPER PORTFOLIO TEMPLATE
 * Whole page dark navy (#0F172A). Monospace font (Consolas).
 * Terminal-bar at top, hero with name + "> jobTitle", terminal-style
 * key: value contact. Each section: "$ command" header, cards.
 * ===================================================================== */
function buildDeveloper(ctx: BuildContext): DocxNode[] {
  const { data } = ctx;
  const { primary, accent } = ctx.palette;
  const font = 'Consolas';
  const pageFill = '0F172A';
  const cardFill = '1E293B';
  const cardFillSoft = '111827';
  const textLight = 'E2E8F0';
  const textDim = '94A3B8';
  const textSoft = '64748B';

  const inner: DocxNode[] = [];

  // Terminal title bar
  inner.push(fullTable([
    new TableRow({
      children: [
        tableCell([
          paragraph([
            run('●  ●  ●     ', { color: 'F87171', size: 18, font }),
            run(`~/portfolio/${(data.personalInfo.fullName || '').toLowerCase().replace(/\s+/g, '-')}`, { color: textSoft, size: 17, font }),
          ], { after: 0 }),
        ], { width: 100, fill: cardFillSoft, margins: { top: 140, bottom: 140, left: 280, right: 280 } }),
      ],
    }),
  ]));
  inner.push(spacer(320));

  // Hero — optional picture above the name.
  const devPic = imageParagraph(data.personalInfo.profilePicture, { size: 110, align: 'LEFT', after: 160 });
  if (devPic) inner.push(devPic);
  inner.push(paragraph([run(data.personalInfo.fullName || '', { bold: true, color: 'F8FAFC', size: 38, font })], { after: 60 }));
  inner.push(paragraph([run(`> ${data.personalInfo.jobTitle || ''}`, { color: accent, size: 24, font })], { after: 200 }));

  const contactLines: Array<[string, string]> = [];
  if (data.personalInfo.email) contactLines.push(['email', data.personalInfo.email]);
  if (data.personalInfo.location) contactLines.push(['location', data.personalInfo.location]);
  if (data.personalInfo.github) contactLines.push(['github', data.personalInfo.github]);
  if (data.personalInfo.linkedin) contactLines.push(['linkedin', data.personalInfo.linkedin]);
  contactLines.forEach(([k, v]) => {
    inner.push(paragraph([
      run(`${k}: `, { color: textSoft, size: 18, font }),
      run(v, { color: textLight, size: 18, font }),
    ], { after: 60 }));
  });

  inner.push(paragraph([''], { after: 200, border: { bottom: { color: '334155', size: 6 } } }));
  inner.push(spacer(160));

  const command = (cmd: string): Paragraph =>
    paragraph([
      run('$ ', { bold: true, color: primary, size: 22, font }),
      run(cmd, { bold: true, color: 'F8FAFC', size: 22, font }),
    ], { after: 160, keepNext: true });

  if (data.personalInfo.summary) {
    inner.push(command('cat about.txt'));
    inner.push(paragraph([run(data.personalInfo.summary, { color: textDim, size: 19, font })], { after: 0, border: { left: { color: '334155', size: 12 } }, indent: { left: 240 } }));
    inner.push(spacer(280));
  }

  if (data.skills.length) {
    inner.push(command('ls ./skills'));
    const grid = pillGrid(data.skills, {
      textColor: textLight,
      fillColor: '1E293B',
      borderColor: '334155',
      font,
      size: 16,
      columns: 4,
    });
    if (grid) inner.push(grid);
    inner.push(spacer(280));
  }

  if (data.projects.length) {
    inner.push(command('./run_projects.sh'));
    data.projects.forEach((proj, idx) => {
      const cardChildren: DocxNode[] = [];
      const head: TextRun[] = [run(`<> ${proj.name}`, { bold: true, color: 'F8FAFC', size: 21, font })];
      if (proj.link) {
        head.push(run('     '));
        head.push(run(`[source: ${proj.link}]`, { color: accent, size: 17, font }));
      }
      cardChildren.push(paragraph(head, { after: 100 }));
      cardChildren.push(paragraph([run(proj.description, { color: textDim, size: 18, font })], { after: proj.technologies?.length ? 120 : 0 }));
      if (proj.technologies?.length) {
        cardChildren.push(paragraph([run(proj.technologies.join('   '), { color: textSoft, size: 16, font, allCaps: true })]));
      }
      inner.push(fullTable([
        new TableRow({
          children: [
            tableCell(cardChildren, { width: 100, fill: cardFill, margins: { top: 280, bottom: 280, left: 320, right: 320 } }),
          ],
        }),
      ], 98));
      if (idx < data.projects.length - 1) inner.push(spacer(160));
    });
    inner.push(spacer(280));
  }

  if (data.experience.length) {
    inner.push(command('tail -f experience.log'));
    data.experience.forEach((exp, idx) => {
      inner.push(paragraph([
        run(exp.role, { bold: true, color: 'F8FAFC', size: 20, font }),
        run('     '),
        run(`[${[exp.startDate, exp.endDate].filter(Boolean).join(' - ')}]`, { color: textSoft, size: 16, font }),
      ], { after: 40, border: { left: { color: primary, size: 12 } }, indent: { left: 240 } }));
      inner.push(paragraph([run(`@ ${exp.company}`, { color: accent, size: 18, font })], { after: 80, border: { left: { color: primary, size: 12 } }, indent: { left: 240 } }));
      splitLines(exp.description).forEach((line) => {
        inner.push(paragraph([
          run('> ', { color: textSoft, size: 18, font }),
          run(line, { color: textDim, size: 18, font }),
        ], { after: 40, border: { left: { color: primary, size: 12 } }, indent: { left: 360 } }));
      });
      if (idx < data.experience.length - 1) inner.push(spacer(180));
    });
    inner.push(spacer(280));
  }

  if (data.education.length) {
    inner.push(command('cat education.json'));
    data.education.forEach((edu, idx) => {
      const cardChildren: DocxNode[] = [
        paragraph([run(edu.degree, { bold: true, color: textLight, size: 19, font })], { after: 30 }),
        paragraph([run(edu.institution, { color: textDim, size: 18, font })], { after: 30 }),
        paragraph([run(`/* ${[edu.startDate, edu.endDate].filter(Boolean).join(' - ')} */`, { color: textSoft, size: 16, font })]),
      ];
      inner.push(fullTable([
        new TableRow({
          children: [
            tableCell(cardChildren, { width: 100, fill: cardFill, margins: { top: 220, bottom: 220, left: 320, right: 320 } }),
          ],
        }),
      ], 98));
      if (idx < data.education.length - 1) inner.push(spacer(140));
    });
    inner.push(spacer(280));
  }

  if ((data.languages || []).length) {
    inner.push(command('locale -a'));
    (data.languages || []).forEach((lang) => {
      inner.push(paragraph([
        run('> ', { color: textSoft, size: 18, font }),
        run(lang.name, { bold: true, color: textLight, size: 18, font }),
        run(`   /* ${lang.level} */`, { color: textSoft, size: 16, font }),
      ], { after: 40, indent: { left: 240 } }));
    });
    inner.push(spacer(280));
  }

  if (data.references !== undefined) {
    inner.push(command('cat references.txt'));
    if ((data.references || []).length === 0) {
      inner.push(paragraph([run('// References available on request', { italics: true, color: textSoft, size: 18, font })], { indent: { left: 240 } }));
    } else {
      (data.references || []).forEach((ref, idx) => {
        const cardChildren: DocxNode[] = [
          paragraph([run(ref.name, { bold: true, color: textLight, size: 19, font })], { after: 30 }),
        ];
        const meta = [ref.role, ref.organization].filter(Boolean).join(', ');
        if (meta) cardChildren.push(paragraph([run(meta, { color: textDim, size: 17, font })], { after: 30 }));
        const contact = [ref.email, ref.phone].filter(Boolean).join(' | ');
        if (contact) cardChildren.push(paragraph([run(`/* ${contact} */`, { color: textSoft, size: 16, font })]));
        inner.push(fullTable([
          new TableRow({
            children: [
              tableCell(cardChildren, { width: 100, fill: cardFill, margins: { top: 220, bottom: 220, left: 320, right: 320 } }),
            ],
          }),
        ], 98));
        if (idx < (data.references || []).length - 1) inner.push(spacer(140));
      });
    }
  }

  return [
    fullTable([
      new TableRow({
        height: { value: 16000, rule: HeightRule.ATLEAST },
        children: [
          tableCell(inner, { width: 100, fill: pageFill, margins: { top: 480, bottom: 480, left: 540, right: 540 } }),
        ],
      }),
    ]),
  ];
}

/* =====================================================================
 * Dispatch + Page Setup
 * ===================================================================== */
function buildDocument(ctx: BuildContext): DocxNode[] {
  switch (ctx.template) {
    case 'modern': return buildModern(ctx);
    case 'portfolio': return buildPortfolio(ctx);
    case 'europass': return buildEuropass(ctx);
    case 'harvard': return buildHarvard(ctx);
    case 'engineersaustralia': return buildEngineersAustralia(ctx);
    case 'creative': return buildCreative(ctx);
    case 'developer': return buildDeveloper(ctx);
    case 'editorial': return buildHarvard(ctx);
    case 'luxe': return buildCreative(ctx);
    case 'spectrum': return buildPortfolio(ctx);
    case 'timeline': return buildModern(ctx);
    case 'compact': return buildMinimal(ctx);
    case 'executive': return buildModern(ctx);
    case 'atelier': return buildHarvard(ctx);
    case 'architect': return buildModern(ctx);
    case 'consultant': return buildPortfolio(ctx);
    case 'magazine': return buildMinimal(ctx);
    case 'neoclassic': return buildHarvard(ctx);
    case 'minimal':
    default: return buildMinimal(ctx);
  }
}

function paletteForTemplate(data: ResumeData, template: DocxTemplate): PaletteColors {
  const fontByTemplate: Record<DocxTemplate, string> = {
    minimal: 'Aptos',
    modern: 'Aptos',
    portfolio: 'Aptos',
    europass: 'Aptos',
    harvard: 'Times New Roman',
    engineersaustralia: 'Aptos',
    creative: 'Aptos',
    developer: 'Consolas',
    editorial: 'Georgia',
    luxe: 'Trebuchet MS',
    spectrum: 'Aptos',
    timeline: 'Arial Narrow',
    compact: 'Consolas',
    executive: 'Aptos',
    atelier: 'Palatino Linotype',
    architect: 'Century Gothic',
    consultant: 'Aptos',
    magazine: 'Arial',
    neoclassic: 'Garamond',
  };
  const defaults: Record<DocxTemplate, { primary: string; accent: string }> = {
    minimal: { primary: '2563EB', accent: '3B82F6' },
    modern: { primary: '1E293B', accent: '3B82F6' },
    portfolio: { primary: '2563EB', accent: '3B82F6' },
    europass: { primary: '004494', accent: '0056B3' },
    harvard: { primary: '000000', accent: '333333' },
    engineersaustralia: { primary: '111827', accent: '374151' },
    creative: { primary: 'F43F5E', accent: 'FB7185' },
    developer: { primary: '10B981', accent: '34D399' },
    editorial: { primary: 'BE123C', accent: '0F766E' },
    luxe: { primary: 'D4AF37', accent: '38BDF8' },
    spectrum: { primary: '7C3AED', accent: 'F97316' },
    timeline: { primary: '0F766E', accent: 'EA580C' },
    compact: { primary: '18181B', accent: 'DC2626' },
    executive: { primary: '243B53', accent: 'B7791F' },
    atelier: { primary: '9F1239', accent: '0369A1' },
    architect: { primary: '334155', accent: '059669' },
    consultant: { primary: '1D4ED8', accent: '0F766E' },
    magazine: { primary: '111827', accent: 'E11D48' },
    neoclassic: { primary: '7F1D1D', accent: '1E3A8A' },
  };
  const d = defaults[template];
  return {
    primary: hex(data.theme?.primary, d.primary),
    accent: hex(data.theme?.accent, d.accent),
    font: fontByTemplate[template],
    bodyFont: fontByTemplate[template],
  };
}

interface PageMargins { top: number; right: number; bottom: number; left: number; }

function pageMarginsForTemplate(template: DocxTemplate): PageMargins {
  // Edge-to-edge templates: zero margins so colored sidebars/banners fill the page.
  const edgeToEdge: DocxTemplate[] = ['modern', 'europass', 'creative', 'developer', 'portfolio', 'luxe', 'spectrum'];
  if (edgeToEdge.includes(template)) {
    return {
      top: convertInchesToTwip(0),
      right: convertInchesToTwip(0),
      bottom: convertInchesToTwip(0),
      left: convertInchesToTwip(0),
    };
  }
  // Standard letter-margin templates
  return {
    top: convertInchesToTwip(0.7),
    right: convertInchesToTwip(0.7),
    bottom: convertInchesToTwip(0.7),
    left: convertInchesToTwip(0.7),
  };
}

/**
 * Page background color — Word renders this in Print Layout when the
 * "Display background colors and images in Print Layout" preference is on
 * (default for most users). Acts as a safety net so areas outside the
 * wrapping content table don't render as bare white.
 */
function documentBackgroundForTemplate(template: DocxTemplate): string {
  switch (template) {
    case 'modern': return 'F8FAFC';      // light slate (right column)
    case 'portfolio': return 'F8F9FA';   // soft gray page
    case 'creative': return 'FAFAFA';    // off-white
    case 'developer': return '0F172A';   // dark navy
    case 'editorial': return 'FFFDF8';   // warm paper
    case 'luxe': return '111111';        // black
    case 'spectrum': return 'F7FBFF';    // cool paper
    case 'compact': return 'F4F4F5';     // zinc paper
    case 'executive': return 'FBFBF9';   // soft executive paper
    case 'atelier': return 'FFF8F1';     // warm studio paper
    case 'architect': return 'F9FAFB';   // blueprint paper
    case 'magazine': return 'FCFCFC';    // editorial white
    case 'neoclassic': return 'FFFEFA';  // ivory
    case 'europass':
    case 'harvard':
    case 'engineersaustralia':
    case 'timeline':
    case 'consultant':
    case 'minimal':
    default:
      return 'FFFFFF';
  }
}

export async function exportResumeDocx(data: ResumeData, template: DocxTemplate) {
  const palette = paletteForTemplate(data, template);
  const ctx: BuildContext = { data, template, palette };
  const margin = pageMarginsForTemplate(template);

  const isDark = template === 'developer' || template === 'luxe';
  const defaultColor = isDark ? 'E2E8F0' : '1F2937';
  const pageBackground = documentBackgroundForTemplate(template);

  const document = new Document({
    creator: 'Resume Builder',
    title: `${data.personalInfo.fullName || 'Resume'} Resume`,
    description: 'Editable resume generated from the selected Resume Builder template',
    background: { color: pageBackground },
    styles: {
      default: {
        document: {
          run: {
            font: palette.font,
            size: 20,
            color: defaultColor,
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
              orientation: PageOrientation.PORTRAIT,
              width: convertInchesToTwip(8.27),
              height: convertInchesToTwip(11.69),
            },
            margin,
          },
        },
        children: buildDocument(ctx),
      },
    ],
  });

  const blob = await Packer.toBlob(document);
  saveAs(blob, `${getResumeFileBaseName(data.personalInfo.fullName)}.docx`);
}
