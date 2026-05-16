export function getResumeFileBaseName(fullName: string) {
  const cleanName = fullName
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, '_');

  return cleanName ? `${cleanName}_Resume` : 'Resume';
}
