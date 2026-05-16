import { toPng } from 'html-to-image';

export interface ResumePageImage {
  dataUrl: string;
  width: number;
  height: number;
}

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const DEFAULT_MARGIN_MM = 12;

export const a4ExportSettings = {
  pageWidthMm: A4_WIDTH_MM,
  pageHeightMm: A4_HEIGHT_MM,
  marginMm: DEFAULT_MARGIN_MM,
  contentWidthMm: A4_WIDTH_MM - DEFAULT_MARGIN_MM * 2,
  contentHeightMm: A4_HEIGHT_MM - DEFAULT_MARGIN_MM * 2,
};

export function getTemplateElement(container: HTMLElement) {
  return container.querySelector<HTMLElement>('[data-resume-page]') || container;
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = dataUrl;
  });
}

function collectBreakCandidates(element: HTMLElement, imageScale: number) {
  const rootRect = element.getBoundingClientRect();
  const selectors = [
    'header',
    'section',
    'section > div',
    'section > div > div',
    'li',
    'h2',
    'h3',
    'h4',
    '[class*="grid"] > div',
    '[class*="space-y"] > div',
  ].join(',');

  return Array.from(element.querySelectorAll<HTMLElement>(selectors))
    .flatMap((node) => {
      const rect = node.getBoundingClientRect();
      const top = Math.max(0, Math.round((rect.top - rootRect.top) * imageScale));
      const bottom = Math.max(0, Math.round((rect.bottom - rootRect.top) * imageScale));
      return [top, bottom];
    })
    .filter((value, index, values) => value > 0 && values.indexOf(value) === index)
    .sort((a, b) => a - b);
}

function choosePageEnd(candidates: number[], start: number, idealEnd: number, imageHeight: number) {
  if (imageHeight - start <= idealEnd - start) {
    return imageHeight;
  }

  const minimumUsefulPage = start + (idealEnd - start) * 0.45;
  const maximumEnd = idealEnd - 24;
  const candidate = candidates
    .filter((value) => value > minimumUsefulPage && value <= maximumEnd)
    .at(-1);

  return candidate && candidate > start ? candidate : Math.min(idealEnd, imageHeight);
}

function cropImagePage(image: HTMLImageElement, sourceY: number, sourceHeight: number) {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = Math.ceil(sourceHeight);

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not create canvas context for export.');
  }

  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(
    image,
    0,
    sourceY,
    image.width,
    sourceHeight,
    0,
    0,
    image.width,
    sourceHeight,
  );

  return {
    dataUrl: canvas.toDataURL('image/png', 0.98),
    width: canvas.width,
    height: canvas.height,
  };
}

export async function captureResumePages(container: HTMLElement): Promise<ResumePageImage[]> {
  const element = getTemplateElement(container);

  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const dataUrl = await toPng(element, {
    quality: 0.98,
    pixelRatio: 2,
    cacheBust: true,
    backgroundColor: '#ffffff',
    width: element.scrollWidth,
    height: element.scrollHeight,
    style: {
      transform: 'none',
      margin: '0',
      boxShadow: 'none',
    },
  });

  const image = await loadImage(dataUrl);
  const elementRect = element.getBoundingClientRect();
  const imageScale = image.width / elementRect.width;
  const sourcePageHeight = image.width * (a4ExportSettings.contentHeightMm / a4ExportSettings.contentWidthMm);
  const candidates = collectBreakCandidates(element, imageScale);
  const pages: ResumePageImage[] = [];

  let sourceY = 0;
  while (sourceY < image.height - 1) {
    const idealEnd = Math.min(sourceY + sourcePageHeight, image.height);
    const sourceEnd = choosePageEnd(candidates, sourceY, idealEnd, image.height);
    const sourceHeight = Math.max(1, sourceEnd - sourceY);
    pages.push(cropImagePage(image, sourceY, sourceHeight));
    sourceY = sourceEnd;
  }

  return pages;
}

export function dataUrlToUint8Array(dataUrl: string) {
  const base64 = dataUrl.split(',')[1] || '';
  const binary = window.atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}
