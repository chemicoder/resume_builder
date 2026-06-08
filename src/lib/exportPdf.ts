import { jsPDF } from 'jspdf';
import { getResumeFileBaseName } from './fileNames';
import { a4ExportSettings, captureResumePages } from './exportPages';

export async function exportResumePdf(container: HTMLElement, fullName: string) {
  const pages = await captureResumePages(container);
  // hotbit (16) precision keeps subpixel coordinates accurate; PNG with SLOW
  // (zlib best) gives the cleanest text/edges. jsPDF still gzips the stream
  // losslessly, so file size stays reasonable.
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
    precision: 16,
    putOnlyUsedFonts: true,
  });

  pages.forEach((page, index) => {
    if (index > 0) {
      pdf.addPage('a4', 'portrait');
    }

    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, a4ExportSettings.pageWidthMm, a4ExportSettings.pageHeightMm, 'F');

    pdf.addImage(
      page.dataUrl,
      'PNG',
      a4ExportSettings.marginMm,
      a4ExportSettings.marginMm,
      a4ExportSettings.contentWidthMm,
      a4ExportSettings.contentHeightMm,
      undefined,
      // SLOW = best PNG compression (lossless); the image content is
      // unchanged so quality is preserved while keeping the file smaller.
      'SLOW',
    );
  });

  pdf.save(`${getResumeFileBaseName(fullName)}.pdf`);
}
