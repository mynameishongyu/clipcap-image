import { describe, expect, it } from 'vitest';
import { sanitizeFilename } from './filename';

describe('sanitizeFilename', () => {
  it('replaces filesystem-invalid characters and trims surrounding separators', () => {
    expect(sanitizeFilename('  科研/数据:层?图*  ')).toBe('科研_数据_层_图');
  });

  it('returns an empty string when the name only contains invalid characters', () => {
    expect(sanitizeFilename('////')).toBe('');
  });
});
