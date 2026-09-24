import * as XLSX from 'xlsx';
import * as pdfjsLib from 'pdfjs-dist';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

/** A single parsed portfolio holding. */
export interface PortfolioHolding {
  stockName: string;
  currentValue: number;
}

/** Raw extraction result returned before user review. */
export interface RawPortfolioData {
  headers: string[];
  rows: string[][];
  detectedNameCol: number;   // -1 if not auto-detected
  detectedValueCol: number;  // -1 if not auto-detected
}

// ---------------------------------------------------------------------------
// Column-name matching helpers
// ---------------------------------------------------------------------------

/** Lowercase patterns that identify a stock-name column (strict). */
const STOCK_NAME_PATTERNS = [
  'stock name',
  'stock list',
  'instruments',
  'stocks',
];

/** Lowercase patterns that identify a value column (strict). */
const VALUE_PATTERNS = [
  'value at market price',
  'current value',
  'closing value',
];

/**
 * Given an array of header strings, return the indices of the stock-name
 * column and value column, or `null` when either cannot be identified.
 */
export function detectColumns(
  headers: string[]
): { nameIdx: number; valueIdx: number } | null {
  let nameIdx = -1;
  let valueIdx = -1;

  // Sort patterns by length descending so longer (more specific) patterns
  // are matched first.
  const sortedStockPatterns = [...STOCK_NAME_PATTERNS].sort(
    (a, b) => b.length - a.length
  );
  const sortedValuePatterns = [...VALUE_PATTERNS].sort(
    (a, b) => b.length - a.length
  );

  for (let i = 0; i < headers.length; i++) {
    const h = (headers[i] ?? '').toLowerCase().trim();
    if (!h) continue;

    if (nameIdx === -1 && sortedStockPatterns.some((p) => h === p || h.includes(p))) {
      nameIdx = i;
    }
    if (valueIdx === -1 && sortedValuePatterns.some((p) => h === p || h.includes(p))) {
      valueIdx = i;
    }
  }

  if (nameIdx === -1 || valueIdx === -1) return null;
  return { nameIdx, valueIdx };
}

/**
 * Parse a string that might represent a monetary value.
 * Strips commas, currency symbols, whitespace, etc.
 */
export function parseNumericValue(raw: string | number | undefined | null): number {
  if (raw === undefined || raw === null) return NaN;
  if (typeof raw === 'number') return raw;
  // Remove currency symbols, commas, spaces
  const cleaned = raw
    .replace(/[₹$€£¥,\s]/g, '')
    .replace(/\(([^)]+)\)/, '-$1') // treat (123) as -123
    .trim();
  return cleaned === '' ? NaN : Number(cleaned);
}

/**
 * Normalise a stock name: trim whitespace, collapse inner spaces.
 */
export function normaliseStockName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Raw extraction (for review step)
// ---------------------------------------------------------------------------

/**
 * Extract raw headers + rows from an Excel file without finalising holdings.
 * The caller gets the raw tabular data plus auto-detected column indices.
 */
export async function extractRawFromExcel(file: File): Promise<RawPortfolioData> {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      const rawRows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
      });

      // Scan for a header row
      for (let headerIdx = 0; headerIdx < Math.min(rawRows.length, 20); headerIdx++) {
        const row = rawRows[headerIdx];
        if (!row || row.length === 0) continue;

        const headers = row.map((c) => String(c ?? ''));
        // Even if detectColumns fails we still want to show data — just no preselection
        const cols = detectColumns(headers);

        // Check if there are data rows below
        const dataRows: string[][] = [];
        for (let r = headerIdx + 1; r < rawRows.length; r++) {
          const dataRow = rawRows[r];
          if (!dataRow) continue;
          const cells = dataRow.map((c) => String(c ?? ''));
          if (cells.some((c) => c.trim() !== '')) {
            dataRows.push(cells);
          }
        }

        if (dataRows.length > 0 && headers.some((h) => h.trim() !== '')) {
          return {
            headers,
            rows: dataRows,
            detectedNameCol: cols?.nameIdx ?? -1,
            detectedValueCol: cols?.valueIdx ?? -1,
          };
        }
      }

      // Fallback: use first row as header, rest as data
      if (rawRows.length >= 2) {
        const headers = rawRows[0].map((c) => String(c ?? ''));
        const dataRows = rawRows.slice(1).map((r) =>
          (r as unknown[]).map((c) => String(c ?? ''))
        );
        const cols = detectColumns(headers);
        return {
          headers,
          rows: dataRows,
          detectedNameCol: cols?.nameIdx ?? -1,
          detectedValueCol: cols?.valueIdx ?? -1,
        };
      }
    }

    return { headers: [], rows: [], detectedNameCol: -1, detectedValueCol: -1 };
  } catch (err) {
    console.error('[portfolioParser] extractRawFromExcel failed:', err);
    return { headers: [], rows: [], detectedNameCol: -1, detectedValueCol: -1 };
  }
}

/**
 * Extract raw headers + rows from pasted text without finalising holdings.
 */
export function extractRawFromPaste(text: string): RawPortfolioData {
  try {
    if (!text || !text.trim()) {
      return { headers: [], rows: [], detectedNameCol: -1, detectedValueCol: -1 };
    }

    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      return { headers: [], rows: [], detectedNameCol: -1, detectedValueCol: -1 };
    }

    const delimiter = lines[0].includes('\t') ? '\t' : ',';
    const splitRow = (line: string): string[] =>
      line.split(delimiter).map((c) => c.trim());

    // Use the first row as headers
    const headers = splitRow(lines[0]);
    const dataRows = lines.slice(1).map(splitRow);
    const cols = detectColumns(headers);

    return {
      headers,
      rows: dataRows,
      detectedNameCol: cols?.nameIdx ?? -1,
      detectedValueCol: cols?.valueIdx ?? -1,
    };
  } catch (err) {
    console.error('[portfolioParser] extractRawFromPaste failed:', err);
    return { headers: [], rows: [], detectedNameCol: -1, detectedValueCol: -1 };
  }
}

/**
 * Extract raw data from a PDF file.
 */
export async function extractRawFromPDF(file: File): Promise<RawPortfolioData> {
  try {
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

    const allLines: string[][] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();

      const lineMap = new Map<number, { x: number; str: string }[]>();

      for (const item of content.items) {
        if (!('str' in item)) continue;
        const textItem = item as { str: string; transform: number[] };
        const y = Math.round(textItem.transform[5]);
        const x = textItem.transform[4];
        if (!lineMap.has(y)) lineMap.set(y, []);
        lineMap.get(y)!.push({ x, str: textItem.str });
      }

      const sortedYs = [...lineMap.keys()].sort((a, b) => b - a);
      for (const y of sortedYs) {
        const items = lineMap.get(y)!;
        items.sort((a, b) => a.x - b.x);
        allLines.push(items.map((i) => i.str));
      }
    }

    // Find header row
    for (let i = 0; i < Math.min(allLines.length, 30); i++) {
      const lineTokens = allLines[i];
      const cols = detectColumns(lineTokens);
      if (!cols) continue;

      const dataRows = allLines.slice(i + 1).filter((t) => t.some((c) => c.trim()));
      if (dataRows.length > 0) {
        return {
          headers: lineTokens,
          rows: dataRows,
          detectedNameCol: cols.nameIdx,
          detectedValueCol: cols.valueIdx,
        };
      }
    }

    // Fallback: first line as header
    if (allLines.length >= 2) {
      const cols = detectColumns(allLines[0]);
      return {
        headers: allLines[0],
        rows: allLines.slice(1),
        detectedNameCol: cols?.nameIdx ?? -1,
        detectedValueCol: cols?.valueIdx ?? -1,
      };
    }

    return { headers: [], rows: [], detectedNameCol: -1, detectedValueCol: -1 };
  } catch (err) {
    console.error('[portfolioParser] extractRawFromPDF failed:', err);
    return { headers: [], rows: [], detectedNameCol: -1, detectedValueCol: -1 };
  }
}

/**
 * Extract raw data from a file, dispatching by extension.
 */
export async function extractRawFromFile(file: File): Promise<RawPortfolioData> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

  switch (ext) {
    case 'xlsx':
    case 'xls':
      return extractRawFromExcel(file);
    case 'pdf':
      return extractRawFromPDF(file);
    case 'jpg':
    case 'jpeg':
    case 'png':
      console.warn('[portfolioParser] Image/OCR parsing is not yet implemented.');
      return { headers: [], rows: [], detectedNameCol: -1, detectedValueCol: -1 };
    default:
      throw new Error(
        `Unsupported file type ".${ext}". Supported formats: .xlsx, .xls, .pdf, .jpg, .jpeg, .png`
      );
  }
}

// ---------------------------------------------------------------------------
// Finalise holdings from raw data + confirmed column indices
// ---------------------------------------------------------------------------

/**
 * Convert raw rows into PortfolioHolding[] using the user-confirmed column
 * indices for stock name and value.
 */
export function finaliseHoldings(
  rows: string[][],
  nameColIdx: number,
  valueColIdx: number
): PortfolioHolding[] {
  const holdings: PortfolioHolding[] = [];
  for (const row of rows) {
    const rawName = (row[nameColIdx] ?? '').trim();
    const rawValue = parseNumericValue(row[valueColIdx]);
    if (rawName && !isNaN(rawValue) && rawValue !== 0) {
      holdings.push({
        stockName: normaliseStockName(rawName),
        currentValue: rawValue,
      });
    }
  }
  return holdings;
}

// ---------------------------------------------------------------------------
// Legacy direct-parse functions (kept for backward compat)
// ---------------------------------------------------------------------------

export async function parsePortfolioFromExcel(
  file: File
): Promise<PortfolioHolding[]> {
  const raw = await extractRawFromExcel(file);
  if (raw.detectedNameCol === -1 || raw.detectedValueCol === -1) return [];
  return finaliseHoldings(raw.rows, raw.detectedNameCol, raw.detectedValueCol);
}

export function parsePortfolioFromPaste(text: string): PortfolioHolding[] {
  const raw = extractRawFromPaste(text);
  if (raw.detectedNameCol === -1 || raw.detectedValueCol === -1) return [];
  return finaliseHoldings(raw.rows, raw.detectedNameCol, raw.detectedValueCol);
}

export async function parsePortfolioFile(
  file: File
): Promise<PortfolioHolding[]> {
  const raw = await extractRawFromFile(file);
  if (raw.detectedNameCol === -1 || raw.detectedValueCol === -1) return [];
  return finaliseHoldings(raw.rows, raw.detectedNameCol, raw.detectedValueCol);
}

