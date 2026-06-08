import { toPng } from 'html-to-image';

export interface ResumePageImage {
  dataUrl: string;
  width: number;
  height: number;
}

interface BreakRegion {
  top: number;
  bottom: number;
}

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const DEFAULT_MARGIN_MM = 0;
const CONTINUATION_TOP_MARGIN_MM = 12;
const A4_RATIO = A4_HEIGHT_MM / A4_WIDTH_MM;

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
    '[class*="grid"] > *',
    '[class*="space-y"] > *',
    '[class*="break-inside-avoid"]',
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

function collectBreakRegions(element: HTMLElement, imageScale: number): BreakRegion[] {
  const rootRect = element.getBoundingClientRect();
  const selectors = [
    'section',
    'li',
    '[class*="grid"] > *',
    '[class*="space-y"] > *',
    '[class*="break-inside-avoid"]',
  ].join(',');

  return Array.from(element.querySelectorAll<HTMLElement>(selectors))
    .map((node) => {
      const rect = node.getBoundingClientRect();
      return {
        top: Math.max(0, Math.round((rect.top - rootRect.top) * imageScale)),
        bottom: Math.max(0, Math.round((rect.bottom - rootRect.top) * imageScale)),
      };
    })
    .filter((region, index, regions) => {
      const height = region.bottom - region.top;
      return height > 24 && regions.findIndex((item) => item.top === region.top && item.bottom === region.bottom) === index;
    })
    .sort((a, b) => a.top - b.top);
}

function choosePageEnd(candidates: number[], regions: BreakRegion[], start: number, idealEnd: number, imageHeight: number) {
  if (imageHeight - start <= idealEnd - start) {
    return imageHeight;
  }

  const minimumUsefulPage = start + (idealEnd - start) * 0.45;
  const maximumEnd = idealEnd - 24;
  const crossingRegion = regions.find((region) => (
    region.top > minimumUsefulPage
    && region.top < idealEnd
    && region.bottom > idealEnd
  ));

  if (crossingRegion?.top && crossingRegion.top > start) {
    return crossingRegion.top;
  }

  const candidate = candidates
    .filter((value) => value > minimumUsefulPage && value <= maximumEnd)
    .at(-1);

  return candidate && candidate > start ? candidate : Math.min(idealEnd, imageHeight);
}

function cropImagePage(
  image: HTMLImageElement,
  sourceY: number,
  sourceHeight: number,
  outputHeight: number,
  backgroundColor: string,
  drawOffsetY = 0,
) {
  const canvas = document.createElement('canvas');
  canvas.width = image.width;
  canvas.height = Math.ceil(outputHeight);

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('Could not create canvas context for export.');
  }

  context.fillStyle = backgroundColor || '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(
    image,
    0,
    sourceY,
    image.width,
    sourceHeight,
    0,
    drawOffsetY,
    image.width,
    sourceHeight,
  );

  return {
    // PNG is lossless — the second arg (quality) is ignored for image/png,
    // but we drop it anyway to make the intent obvious.
    dataUrl: canvas.toDataURL('image/png'),
    width: canvas.width,
    height: canvas.height,
  };
}

export async function captureResumePages(container: HTMLElement): Promise<ResumePageImage[]> {
  const element = getTemplateElement(container);
  const originalMinHeight = element.style.minHeight;
  const originalHeight = element.style.height;
  const computedStyle = window.getComputedStyle(element);
  const backgroundColor = computedStyle.backgroundColor && computedStyle.backgroundColor !== 'rgba(0, 0, 0, 0)'
    ? computedStyle.backgroundColor
    : '#ffffff';

  if (document.fonts?.ready) {
    await document.fonts.ready;
  }

  const targetPageHeight = Math.ceil(element.scrollWidth * A4_RATIO);
  if (element.scrollHeight < targetPageHeight) {
    element.style.minHeight = `${targetPageHeight}px`;
    element.style.height = `${targetPageHeight}px`;
  }

  try {
    // pixelRatio drives the rasterized resolution. 3× is the sweet spot —
    // print-quality (≈216dpi at A4) without ballooning memory; html-to-image
    // tops out around 4× on most devices before the canvas hits browser
    // limits and silently fails.
    const exportPixelRatio = 3;
    const dataUrl = await toPng(element, {
      // `quality` is irrelevant for image/png (lossless) — keep 1.0 to be
      // explicit and avoid any future library default change to lossy.
      quality: 1,
      pixelRatio: exportPixelRatio,
      cacheBust: true,
      backgroundColor,
      width: element.scrollWidth,
      height: Math.max(element.scrollHeight, targetPageHeight),
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
    const continuationTopMargin = image.width * (CONTINUATION_TOP_MARGIN_MM / a4ExportSettings.contentWidthMm);
    const candidates = collectBreakCandidates(element, imageScale);
    const regions = collectBreakRegions(element, imageScale);
    const pages: ResumePageImage[] = [];

    let sourceY = 0;
    while (sourceY < image.height - 1) {
      const drawOffsetY = sourceY > 0 ? continuationTopMargin : 0;
      const sourcePageContentHeight = sourcePageHeight - drawOffsetY;
      const idealEnd = Math.min(sourceY + sourcePageContentHeight, image.height);
      const sourceEnd = choosePageEnd(candidates, regions, sourceY, idealEnd, image.height);
      const sourceHeight = Math.max(1, sourceEnd - sourceY);
      pages.push(cropImagePage(image, sourceY, sourceHeight, sourcePageHeight, backgroundColor, drawOffsetY));
      sourceY = sourceEnd;
    }

    return pages;
  } finally {
    element.style.minHeight = originalMinHeight;
    element.style.height = originalHeight;
  }
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
