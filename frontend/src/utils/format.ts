import type { StatusResponse } from '../api/types/monitor';

export type Displayable = string | number | null | undefined;

export function displayValue(value: Displayable, fallback = '-'): Displayable {
  return value === null || value === undefined || value === '' ? fallback : value;
}

export function progressPercent(status: StatusResponse): number {
  if (!status.progress_total) return 0;
  return Math.min(100, Math.round((status.progress_current / status.progress_total) * 100));
}
