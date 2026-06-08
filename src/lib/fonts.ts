// Shared font catalogue used by the sidebar selector, the React previews,
// and the DOCX export. We intentionally restrict the list to fonts that are
// safe to render in both Word (installed by default on Windows/macOS) and
// modern browsers, so what the user sees in the preview matches the
// downloaded files.

export interface FontOption {
  /** Value stored in `theme.fontFamily` — also the primary CSS family name. */
  value: string;
  /** Display label in the dropdown. */
  label: string;
  /** Loose grouping for the dropdown (Sans / Serif / Mono / Display). */
  group: 'Sans-serif' | 'Serif' | 'Monospace' | 'Display';
  /** Full CSS font-family stack (with sensible web-safe fallbacks). */
  css: string;
  /** Font name to pass to `docx` TextRun.font. */
  docx: string;
}

export const FONT_OPTIONS: FontOption[] = [
  // Sans-serif
  { value: 'Aptos',            label: 'Aptos (Word default)',  group: 'Sans-serif', css: 'Aptos, "Segoe UI", Inter, Arial, sans-serif',     docx: 'Aptos' },
  { value: 'Calibri',          label: 'Calibri',                group: 'Sans-serif', css: 'Calibri, "Segoe UI", Arial, sans-serif',          docx: 'Calibri' },
  { value: 'Segoe UI',         label: 'Segoe UI',               group: 'Sans-serif', css: '"Segoe UI", Inter, Arial, sans-serif',            docx: 'Segoe UI' },
  { value: 'Arial',            label: 'Arial',                  group: 'Sans-serif', css: 'Arial, Helvetica, sans-serif',                    docx: 'Arial' },
  { value: 'Helvetica',        label: 'Helvetica',              group: 'Sans-serif', css: 'Helvetica, Arial, sans-serif',                    docx: 'Helvetica' },
  { value: 'Verdana',          label: 'Verdana',                group: 'Sans-serif', css: 'Verdana, Geneva, sans-serif',                     docx: 'Verdana' },
  { value: 'Tahoma',           label: 'Tahoma',                 group: 'Sans-serif', css: 'Tahoma, Geneva, sans-serif',                      docx: 'Tahoma' },
  { value: 'Trebuchet MS',     label: 'Trebuchet MS',           group: 'Sans-serif', css: '"Trebuchet MS", Tahoma, sans-serif',              docx: 'Trebuchet MS' },
  { value: 'Century Gothic',   label: 'Century Gothic',         group: 'Sans-serif', css: '"Century Gothic", "Apple Gothic", sans-serif',   docx: 'Century Gothic' },
  { value: 'Arial Narrow',     label: 'Arial Narrow',           group: 'Sans-serif', css: '"Arial Narrow", Arial, sans-serif',               docx: 'Arial Narrow' },
  // Serif
  { value: 'Times New Roman',  label: 'Times New Roman',        group: 'Serif',      css: '"Times New Roman", Times, serif',                  docx: 'Times New Roman' },
  { value: 'Cambria',          label: 'Cambria',                group: 'Serif',      css: 'Cambria, Georgia, serif',                          docx: 'Cambria' },
  { value: 'Georgia',          label: 'Georgia',                group: 'Serif',      css: 'Georgia, Cambria, "Times New Roman", serif',       docx: 'Georgia' },
  { value: 'Garamond',         label: 'Garamond',               group: 'Serif',      css: 'Garamond, Georgia, serif',                         docx: 'Garamond' },
  { value: 'Palatino Linotype', label: 'Palatino',               group: 'Serif',      css: '"Palatino Linotype", Palatino, Georgia, serif',   docx: 'Palatino Linotype' },
  { value: 'Book Antiqua',     label: 'Book Antiqua',           group: 'Serif',      css: '"Book Antiqua", Palatino, Georgia, serif',         docx: 'Book Antiqua' },
  // Monospace
  { value: 'Consolas',         label: 'Consolas',               group: 'Monospace',  css: 'Consolas, "Courier New", monospace',               docx: 'Consolas' },
  { value: 'Courier New',      label: 'Courier New',            group: 'Monospace',  css: '"Courier New", Courier, monospace',                docx: 'Courier New' },
  // Display
  { value: 'Impact',           label: 'Impact',                 group: 'Display',    css: 'Impact, "Arial Black", sans-serif',                docx: 'Impact' },
  { value: 'Arial Black',      label: 'Arial Black',            group: 'Display',    css: '"Arial Black", "Arial Bold", sans-serif',          docx: 'Arial Black' },
];

const BY_VALUE = new Map(FONT_OPTIONS.map((o) => [o.value, o] as const));

/** Resolve a stored `theme.fontFamily` value to a full CSS font-family stack. */
export function cssFontStack(family: string | undefined): string | undefined {
  if (!family) return undefined;
  return BY_VALUE.get(family)?.css || family;
}

/** Resolve a stored `theme.fontFamily` value to a DOCX-safe font name. */
export function docxFontName(family: string | undefined): string | undefined {
  if (!family) return undefined;
  return BY_VALUE.get(family)?.docx || family;
}
