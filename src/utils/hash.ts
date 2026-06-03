import { createHash } from 'node:crypto';

export const sha256Normalized = (value: string): string =>
  createHash('sha256').update(value.trim().toLowerCase()).digest('hex');

export const sha256Raw = (value: string): string =>
  createHash('sha256').update(value).digest('hex');
