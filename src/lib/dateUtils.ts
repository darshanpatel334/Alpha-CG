/**
 * Date Utilities for Indian Capital Gains Tax Calculator
 * Handles multiple date formats, day calculations, and fiscal year mapping.
 */

/**
 * Parse a date value from an Excel cell.
 * Supports: DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, YYYY/MM/DD,
 * Excel serial numbers, and native Date objects.
 */
export function parseDate(value: unknown): Date | null {
  if (value == null || value === '') return null;

  // Already a Date object
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  // Excel serial number (numeric)
  if (typeof value === 'number') {
    return excelSerialToDate(value);
  }

  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  // Try YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = trimmed.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return safeDate(parseInt(y, 10), parseInt(m, 10), parseInt(d, 10));
  }

  // Try DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return safeDate(parseInt(y, 10), parseInt(m, 10), parseInt(d, 10));
  }

  // Try DD/MM/YY or DD-MM-YY (2-digit year)
  const dmyShortMatch = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2})$/);
  if (dmyShortMatch) {
    const [, d, m, yy] = dmyShortMatch;
    const year = parseInt(yy, 10);
    const fullYear = year >= 50 ? 1900 + year : 2000 + year;
    return safeDate(fullYear, parseInt(m, 10), parseInt(d, 10));
  }

  // Fallback: try native Date parsing
  const fallback = new Date(trimmed);
  return isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Convert an Excel serial date number to a JavaScript Date.
 * Excel uses a 1900 date system (with the Lotus 1-2-3 leap year bug).
 */
function excelSerialToDate(serial: number): Date | null {
  if (serial < 1 || serial > 2958465) return null; // Reasonable range

  // Excel's epoch is January 1, 1900.
  // But Excel incorrectly treats 1900 as a leap year (Lotus bug),
  // so dates after Feb 28, 1900 are off by one day.
  const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899
  const msPerDay = 24 * 60 * 60 * 1000;
  const date = new Date(excelEpoch.getTime() + serial * msPerDay);

  return isNaN(date.getTime()) ? null : date;
}

/**
 * Safely create a Date from year, month (1-indexed), day.
 * Validates that the resulting date matches the inputs.
 */
function safeDate(year: number, month: number, day: number): Date | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null; // Invalid date (e.g., Feb 30)
  }

  return date;
}

/**
 * Calculate the number of calendar days between two dates.
 * Returns an absolute value.
 */
export function daysBetween(d1: Date, d2: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const diff = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diff / msPerDay);
}

/**
 * Determine the Indian Financial Year for a given date.
 * FY runs from April 1 to March 31.
 * Returns the start year (e.g., FY 2024-25 returns 2024).
 */
export function getFiscalYear(date: Date): number {
  const month = date.getMonth(); // 0-indexed (0=Jan, 3=Apr)
  const year = date.getFullYear();

  // April (month 3) onwards → FY starts in the same calendar year
  // January–March → FY started in the previous calendar year
  return month >= 3 ? year : year - 1;
}

/**
 * Format a Date as DD/MM/YYYY for display.
 */
export function formatDate(date: Date): string {
  const dd = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}
