/**
 * TIS (Tax Information Statement) Parser
 * 
 * Parses the TIS PDF issued by the Indian Income Tax Department.
 * Extracts the main structured table with:
 *   - SR. NO.
 *   - INFORMATION CATEGORY
 *   - PROCESSED BY SYSTEM (amount)
 *   - ACCEPTED BY TAXPAYER / CONFIRMED BY SOURCE (amount)
 */

import * as pdfjsLib from 'pdfjs-dist';

// Use the CDN worker to avoid bundling issues with Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface TISEntry {
  srNo: number;
  category: string;
  processedBySystem: number;
  acceptedByTaxpayer: number;
}

export interface TISResult {
  entries: TISEntry[];
  rawText: string;
  parseErrors: string[];
}

/**
 * Parses a number string from TIS — handles commas and blanks.
 */
function parseTISNumber(val: string): number {
  if (!val || val.trim() === '' || val.trim() === '-') return 0;
  const cleaned = val.replace(/[^0-9.]/g, '');
  if (!cleaned) return 0;
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Known TIS information category names (as they appear in the PDF).
 * Used to anchor the parsing algorithm.
 */
export const KNOWN_TIS_CATEGORIES = [
  'Dividend',
  'Interest from savings bank',
  'Interest from deposit',
  'Sale of securities and units of mutual fund',
  'GST turnover',
  'Purchase of securities and units of mutual funds',
  'Salary',
  'Rent received',
  'Interest from others',
  'Purchase of time deposit',
  'Cash deposits',
  'Cash withdrawals',
  'Cash payments for goods and services',
  'Cash receipts for goods and services',
  'Foreign travel',
  'Foreign remittances',
  'Purchase of foreign currency',
  'Sale of immovable property',
  'Purchase of immovable property',
  'Credit card spending',
  'Foreign currency – receipt',
  'Winning from lottery or game shows',
  'Business receipts',
  'Receipts from life insurance policy',
  'Sale of vehicles',
  'Purchase of vehicles',
];

/**
 * Extract all text items from a pdfjs page in reading order.
 */
async function extractPageText(page: pdfjsLib.PDFPageProxy): Promise<string> {
  const content = await page.getTextContent();
  return content.items
    .map((item) => ('str' in item ? item.str : ''))
    .join(' ');
}

/**
 * Core parser: takes the full concatenated text of TIS PDF pages and 
 * returns structured TISEntry[].
 *
 * Strategy: 
 *  1. Find each SR. NO. (1, 2, 3…) followed by a category name.
 *  2. After the category, pick up 1-2 numeric tokens for the amounts.
 *  3. Handle the edge case where "Processed" and "Accepted" amounts are the same value.
 */
function parseTISText(fullText: string): TISEntry[] {
  const entries: TISEntry[] = [];

  // Normalize whitespace
  const text = fullText.replace(/\s+/g, ' ');

  // Build a regex that matches: <number> <category name> <number (processed)> <number (accepted)>
  // We'll try matching against each known category.
  for (const cat of KNOWN_TIS_CATEGORIES) {
    // Escape regex special chars in category name
    const escapedCat = cat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Pattern: digit(s) <category> digit_string digit_string  (amounts may or may not have commas)
    const re = new RegExp(
      `(\\d+)\\s+${escapedCat}\\s+([\\d,]+(?:\\.\\d+)?)\\s+([\\d,]+(?:\\.\\d+)?)`,
      'i'
    );
    const match = text.match(re);

    if (match) {
      const srNo = parseInt(match[1], 10);
      const processed = parseTISNumber(match[2]);
      const accepted = parseTISNumber(match[3]);
      entries.push({ srNo, category: cat, processedBySystem: processed, acceptedByTaxpayer: accepted });
    } else {
      // Try pattern where only one number appears (both columns same value or zero)
      const reSingle = new RegExp(
        `(\\d+)\\s+${escapedCat}\\s+([\\d,]+(?:\\.\\d+)?)`,
        'i'
      );
      const singleMatch = text.match(reSingle);
      if (singleMatch) {
        const srNo = parseInt(singleMatch[1], 10);
        const amount = parseTISNumber(singleMatch[2]);
        entries.push({ srNo, category: cat, processedBySystem: amount, acceptedByTaxpayer: amount });
      }
    }
  }

  // Sort by SR. NO.
  entries.sort((a, b) => a.srNo - b.srNo);

  return entries;
}

/**
 * Load and parse a TIS PDF file with an optional password.
 */
export async function parseTISPdf(file: File, password?: string): Promise<TISResult> {
  const parseErrors: string[] = [];

  const arrayBuffer = await file.arrayBuffer();

  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    ...(password ? { password } : {}),
  });

  // If password is required and not provided, let onPassword bubble up as an error
  loadingTask.onPassword = (_updatePassword: (pw: string) => void, reason: number) => {
    if (reason === 1) {
      // NEED_PASSWORD — will be caught as a rejection
    }
  };

  let pdfDoc: pdfjsLib.PDFDocumentProxy;
  try {
    pdfDoc = await loadingTask.promise;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes('password')) {
      return { entries: [], rawText: '', parseErrors: ['PDF is password-protected. Please enter the correct password.'] };
    }
    return { entries: [], rawText: '', parseErrors: [`Failed to load PDF: ${msg}`] };
  }

  // Extract text from all pages
  const pageTexts: string[] = [];
  for (let i = 1; i <= pdfDoc.numPages; i++) {
    const page = await pdfDoc.getPage(i);
    const text = await extractPageText(page);
    pageTexts.push(text);
  }

  const rawText = pageTexts.join('\n\n');
  const entries = parseTISText(rawText);

  if (entries.length === 0) {
    parseErrors.push('No TIS entries found. Make sure this is a valid TIS PDF from the Income Tax portal.');
  }

  return { entries, rawText, parseErrors };
}
