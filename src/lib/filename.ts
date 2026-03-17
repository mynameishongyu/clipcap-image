const INVALID_FILENAME_CHARS = /[\\/:*?"<>|]+/g;

export function sanitizeFilename(name: string): string {
  return name
    .normalize('NFKC')
    .trim()
    .replace(INVALID_FILENAME_CHARS, '_')
    .replace(/\s+/g, ' ')
    .replace(/[. ]+$/g, '')
    .replace(/^[_.\s]+|[_.\s]+$/g, '')
    .slice(0, 120);
}
