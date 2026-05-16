import { jsPDF } from 'jspdf';
import { getResumeFileBaseName } from './fileNames';
import { a4ExportSettings, captureResumePages } from './exportPages';

export async function exportResumePdf(container: HTMLElement, fullName: string) {
  const pages = await captureResumePages(container);
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  pages.forEach((page, index) => {
    if (index > 0) {
      pdf.addPage('a4', 'portrait');
    }

    pdf.setFillColor(255, 255, 255);
    pdf.rect(0, 0, a4ExportSettings.pageWidthMm, a4ExportSettings.pageHeightMm, 'F');

    const imageHeightMm = Math.min(
      a4ExportSettings.contentHeightMm,
      (page.height * a4ExportSettings.contentWidthMm) / page.width,
    );

    pdf.addImage(
      page.dataUrl,
      'PNG',
      a4ExportSettings.marginMm,
      a4ExportSettings.marginMm,
      a4ExportSettings.contentWidthMm,
      imageHeightMm,
      undefined,
      'FAST',
    );
  });

  pdf.save(`${getResumeFileBaseName(fullName)}.pdf`);
}
