/**
 * TIS (Tax Information Statement) PDF Parser
 * Parses AIS/TIS PDFs from the Indian Income Tax Department.
 */

import * as pdfjsLib from 'pdfjs-dist';

// Configure the worker
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface TISLineItem {
  srNo: number;
  category: string;
  processedBySystem: number;
  acceptedByTaxpayer: number;
}

export interface TISParsedResult {
  lineItems: TISLineItem[];
  rawText: string;
  parseErrors: string[];
}

export interface TISMismatch {
  category: string;
  tisValue: number;
  appValue: number;
  difference: number;
  source: 'capitalGains' | 'bankStatement';
  status: 'match' | 'mismatch' | 'tis_only' | 'app_only';
}

// ─── Parser ────────────────────────────────────────────────────────────────────

function parseIndianNumber(str: string): number {
  if (!str || str.trim() === '' || str.trim() === '-' || str.trim() === '—') return 0;
  const cleaned = str.replace(/[^\d.-]/g, '');
  if (cleaned === '' || cleaned === '-' || cleaned === '.') return 0;
  const num = Number(cleaned);
  return isNaN(num) ? 0 : num;
}

/**
 * Extract text from all pages of a password-protected (or unprotected) PDF.
 */
async function extractTextFromPDF(file: File, password?: string): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    password: password || undefined,
  });

  const pdf = await loadingTask.promise;
  const pages: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item) => ('str' in item ? (item as { str: string }).str : ''))
      .join(' ');
    pages.push(text);
  }

  return pages.join('\n--- PAGE BREAK ---\n');
}

/**
 * Parse TIS line items from the extracted text.
 * 
 * Matches patterns like:
 *   1 Dividend 29,833 29,833
 *   2 Interest from savings bank 9,312 9,312
 *   3 Interest from deposit 1,568 1,568
 *   4 Sale of securities and units of mutual fund 32,96,256 32,96,256
 */
function parseTISItems(text: string): { items: TISLineItem[]; errors: string[] } {
  const items: TISLineItem[] = [];
  const errors: string[] = [];

  // Known TIS categories for fuzzy matching
  const KNOWN_CATEGORIES = [
    'Dividend',
    'Interest from savings bank',
    'Interest from deposit',
    'Interest from others',
    'Sale of securities and units of mutual fund',
    'Sale of securities and units of mutual funds',
    'GST turnover',
    'Purchase of securities and units of mutual fund',
    'Purchase of securities and units of mutual funds',
    'Rent received',
    'Receipts from letting out of property',
    'SFT Transaction',
    'Cash Deposits',
    'Cash Withdrawals',
    'TDS on Salary',
    'Tax collected at source',
    'Tax deducted at source',
    'Advance Tax',
    'Self assessment tax',
    'Other receipts',
    'Income from house property',
    'Other sources',
  ];

  // Strategy 1: line-by-line regex for structured rows like "1 Dividend 29,833 29,833"
  const lineRegex = /^\s*(\d+)\s+(.+?)\s+([\d,]+(?:\.\d+)?)\s+([\d,]+(?:\.\d+)?)\s*$/;
  
  const lines = text.split(/\n/);
  for (const line of lines) {
    const match = line.match(lineRegex);
    if (match) {
      items.push({
        srNo: parseInt(match[1], 10),
        category: match[2].trim(),
        processedBySystem: parseIndianNumber(match[3]),
        acceptedByTaxpayer: parseIndianNumber(match[4]),
      });
    }
  }

  // Strategy 2: if line-by-line didn't work, try broad regex on entire text
  if (items.length === 0) {
    // The PDF text from pdfjs usually comes as a single long string per page,
    // so we need a pattern that works on concatenated text
    const broadRegex = /(\d+)\s+((?:Dividend|Interest from (?:savings bank|deposit|others)|Sale of securities[^0-9]*|Purchase of securities[^0-9]*|GST turnover|Rent received|Cash (?:Deposits|Withdrawals)|TDS on Salary|Tax (?:collected|deducted) at source|Advance Tax|Self assessment tax|Other (?:receipts|sources)|SFT Transaction|Income from house property|Receipts from letting out of property)(?:[^0-9]*))\s*([\d,]+(?:\.\d+)?)\s+([\d,]+(?:\.\d+)?)/gi;

    let m;
    while ((m = broadRegex.exec(text)) !== null) {
      items.push({
        srNo: parseInt(m[1], 10),
        category: m[2].trim().replace(/\s+/g, ' '),
        processedBySystem: parseIndianNumber(m[3]),
        acceptedByTaxpayer: parseIndianNumber(m[4]),
      });
    }
  }

  // Strategy 3: If still nothing, try a more relaxed approach — find known categories near numbers
  if (items.length === 0) {
    let srCounter = 1;
    for (const cat of KNOWN_CATEGORIES) {
      const escapedCat = cat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const catRegex = new RegExp(escapedCat + '\\s+([\u002C\\d]+(?:\\.\\d+)?)\\s+([\u002C\\d]+(?:\\.\\d+)?)', 'i');
      const catMatch = text.match(catRegex);
      if (catMatch) {
        items.push({
          srNo: srCounter++,
          category: cat,
          processedBySystem: parseIndianNumber(catMatch[1]),
          acceptedByTaxpayer: parseIndianNumber(catMatch[2]),
        });
      }
    }
  }

  if (items.length === 0) {
    errors.push('Could not parse any TIS line items from the PDF. The format may not be supported.');
  }

  return { items, errors };
}

// ─── Public API ────────────────────────────────────────────────────────────────

export async function parseTISPDF(file: File, password?: string): Promise<TISParsedResult> {
  const parseErrors: string[] = [];

  let rawText: string;
  try {
    rawText = await extractTextFromPDF(file, password);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (message.includes('password') || message.includes('Password')) {
      return {
        lineItems: [],
        rawText: '',
        parseErrors: ['This PDF is password-protected. Please enter the correct password.'],
      };
    }
    return {
      lineItems: [],
      rawText: '',
      parseErrors: [`Failed to read PDF: ${message}`],
    };
  }

  const { items, errors } = parseTISItems(rawText);
  parseErrors.push(...errors);

  return {
    lineItems: items,
    rawText,
    parseErrors,
  };
}

/**
 * Cross-reference TIS data with Capital Gains and Bank Statement results.
 */
export function crossReferenceTIS(
  tisItems: TISLineItem[],
  cgSaleValue: number,
  cgPurchaseValue: number,
  bankInterestSavings: number,
  bankInterestDeposit: number,
  bankDividend: number,
): TISMismatch[] {
  const mismatches: TISMismatch[] = [];

  // Build a lookup of TIS items by normalized category
  const tisMap = new Map<string, TISLineItem>();
  for (const item of tisItems) {
    const normCat = item.category.toLowerCase().trim();
    tisMap.set(normCat, item);
  }

  // Helper
  function compare(
    tisCategory: string,
    tisKeys: string[],
    appValue: number,
    source: 'capitalGains' | 'bankStatement',
  ) {
    let tisItem: TISLineItem | undefined;
    for (const key of tisKeys) {
      tisItem = tisMap.get(key.toLowerCase());
      if (tisItem) break;
    }

    if (tisItem) {
      const tisVal = tisItem.acceptedByTaxpayer || tisItem.processedBySystem;
      const diff = Math.abs(tisVal - appValue);
      mismatches.push({
        category: tisCategory,
        tisValue: tisVal,
        appValue,
        difference: diff,
        source,
        status: diff < 1 ? 'match' : 'mismatch',
      });
    } else if (appValue > 0) {
      mismatches.push({
        category: tisCategory,
        tisValue: 0,
        appValue,
        difference: appValue,
        source,
        status: 'app_only',
      });
    }
  }

  // Sale of securities
  compare(
    'Sale of securities and units of mutual fund',
    ['sale of securities and units of mutual fund', 'sale of securities and units of mutual funds'],
    cgSaleValue,
    'capitalGains',
  );

  // Purchase of securities
  compare(
    'Purchase of securities and units of mutual funds',
    ['purchase of securities and units of mutual fund', 'purchase of securities and units of mutual funds'],
    cgPurchaseValue,
    'capitalGains',
  );

  // Dividend
  compare(
    'Dividend',
    ['dividend'],
    bankDividend,
    'bankStatement',
  );

  // Interest from savings bank
  compare(
    'Interest from savings bank',
    ['interest from savings bank'],
    bankInterestSavings,
    'bankStatement',
  );

  // Interest from deposit
  compare(
    'Interest from deposit',
    ['interest from deposit'],
    bankInterestDeposit,
    'bankStatement',
  );

  // Add any remaining TIS items that we haven't matched
  const matchedCategories = new Set(mismatches.map((m) => m.category.toLowerCase()));
  for (const item of tisItems) {
    if (!matchedCategories.has(item.category.toLowerCase())) {
      mismatches.push({
        category: item.category,
        tisValue: item.acceptedByTaxpayer || item.processedBySystem,
        appValue: 0,
        difference: item.acceptedByTaxpayer || item.processedBySystem,
        source: 'bankStatement',
        status: 'tis_only',
      });
    }
  }

  return mismatches;
}
