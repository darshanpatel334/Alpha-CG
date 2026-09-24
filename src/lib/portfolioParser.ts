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

// ---------------------------------------------------------------------------
// Column-name matching helpers
// ---------------------------------------------------------------------------

/** Lowercase patterns that identify a stock-name column. */
const STOCK_NAME_PATTERNS = [
  'instrument name',
  'stock name',
  'scrip name',
  'company name',
  'fund name',
  'scheme name',
  'isin name',
  'instruments',
  'instrument',
  'holdings',
  'stock',
  'scrip',
  'company',
  'equity',
  'name',
  'symbol',
  'security',
];

/** Lowercase patterns that identify a value column. */
const VALUE_PATTERNS = [
  'value at market price',
  'current market value',
  'current value',
  'closing value',
  'close value',
  'market value',
  'present value',
  'latest value',
  'portfolio value',
  'nav value',
  'ltp value',
  'valuation',
  'cur. val',
  'current val',
  'mkt value',
  'mkt val',
  'value',
  'amount',
];

/**
 * Check whether `header` (lowercased, trimmed) matches one of the given
 * patterns. Longer patterns are checked first so "stock name" wins over
 * "stock".
 */
function matchesPattern(header: string, patterns: string[]): boolean {
  const h = header.toLowerCase().trim();
  return patterns.some((p) => h === p || h.includes(p));
}

/**
 * Given an array of header strings, return the indices of the stock-name
 * column and value column, or `null` when either cannot be identified.
 */
function detectColumns(
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
function parseNumericValue(raw: string | number | undefined | null): number {
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
 * Normalise a stock name: trim whitespace, collapse inner spaces, remove
 * trailing numbers/codes that some brokers append.
 */
function normaliseStockName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// Excel parser
// ---------------------------------------------------------------------------

/**
 * Parse portfolio holdings from an Excel (.xlsx / .xls) file.
 *
 * The function reads every sheet, auto-detects the header row (the first row
 * that contains recognisable stock-name **and** value column headers), then
 * extracts holdings from subsequent rows.
 *
 * @param file - The Excel `File` object to parse.
 * @returns An array of `PortfolioHolding` objects, or an empty array on
 *          failure.
 */
export async function parsePortfolioFromExcel(
  file: File
): Promise<PortfolioHolding[]> {
  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;

      const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
        header: 1,
        defval: '',
      });

      // Try to find the header row
      for (let headerIdx = 0; headerIdx < Math.min(rows.length, 20); headerIdx++) {
        const row = rows[headerIdx];
        if (!row || row.length === 0) continue;

        const headers = row.map((c) => String(c ?? ''));
        const cols = detectColumns(headers);
        if (!cols) continue;

        // Header found – extract data rows
        const holdings: PortfolioHolding[] = [];
        for (let r = headerIdx + 1; r < rows.length; r++) {
          const dataRow = rows[r];
          if (!dataRow) continue;

          const rawName = String(dataRow[cols.nameIdx] ?? '').trim();
          const rawValue = parseNumericValue(
            dataRow[cols.valueIdx] as string | number
          );

          if (rawName && !isNaN(rawValue) && rawValue !== 0) {
            holdings.push({
              stockName: normaliseStockName(rawName),
              currentValue: rawValue,
            });
          }
        }

        if (holdings.length > 0) return holdings;
      }
    }

    console.warn('[portfolioParser] No recognisable holdings found in Excel file.');
    return [];
  } catch (err) {
    console.error('[portfolioParser] Failed to parse Excel file:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Paste (TSV / CSV) parser
// ---------------------------------------------------------------------------

/**
 * Parse portfolio holdings from pasted text.
 *
 * Supports tab-separated (typical copy-paste from Excel / Google Sheets) and
 * comma-separated formats. The first line that contains recognisable column
 * headers is treated as the header row.
 *
 * @param text - The raw pasted string.
 * @returns An array of `PortfolioHolding` objects, or an empty array on
 *          failure.
 */
export function parsePortfolioFromPaste(text: string): PortfolioHolding[] {
  try {
    if (!text || !text.trim()) return [];

    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) return []; // need at least header + one data row

    // Decide on delimiter: if first line contains tabs, use tab; else comma.
    const delimiter = lines[0].includes('\t') ? '\t' : ',';

    const splitRow = (line: string): string[] =>
      line.split(delimiter).map((c) => c.trim());

    // Find header row (scan up to first 10 lines)
    for (let headerIdx = 0; headerIdx < Math.min(lines.length, 10); headerIdx++) {
      const headers = splitRow(lines[headerIdx]);
      const cols = detectColumns(headers);
      if (!cols) continue;

      const holdings: PortfolioHolding[] = [];
      for (let r = headerIdx + 1; r < lines.length; r++) {
        const cells = splitRow(lines[r]);
        const rawName = (cells[cols.nameIdx] ?? '').trim();
        const rawValue = parseNumericValue(cells[cols.valueIdx]);

        if (rawName && !isNaN(rawValue) && rawValue !== 0) {
          holdings.push({
            stockName: normaliseStockName(rawName),
            currentValue: rawValue,
          });
        }
      }

      if (holdings.length > 0) return holdings;
    }

    console.warn('[portfolioParser] No recognisable holdings found in pasted text.');
    return [];
  } catch (err) {
    console.error('[portfolioParser] Failed to parse pasted text:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// PDF parser
// ---------------------------------------------------------------------------

/**
 * Parse portfolio holdings from a PDF file (best-effort).
 *
 * Uses pdfjs-dist to extract text content page-by-page, then attempts to
 * locate tabular data by matching stock-name / value column headers and
 * reading subsequent lines.
 *
 * PDF extraction is inherently imprecise – results may vary depending on the
 * source document's structure.
 *
 * @param file - The PDF `File` object to parse.
 * @returns An array of `PortfolioHolding` objects, or an empty array on
 *          failure.
 */
export async function parsePortfolioFromPDF(
  file: File
): Promise<PortfolioHolding[]> {
  try {
    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;

    // Collect all text items across pages, grouped into lines by their y-pos.
    const allLines: string[][] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();

      // Group text items by approximate Y coordinate to reconstruct rows.
      const lineMap = new Map<number, { x: number; str: string }[]>();

      for (const item of content.items) {
        if (!('str' in item)) continue;
        const textItem = item as { str: string; transform: number[] };
        const y = Math.round(textItem.transform[5]); // round to nearest px
        const x = textItem.transform[4];
        if (!lineMap.has(y)) lineMap.set(y, []);
        lineMap.get(y)!.push({ x, str: textItem.str });
      }

      // Sort lines top-to-bottom (higher y = higher on page in PDF coords)
      const sortedYs = [...lineMap.keys()].sort((a, b) => b - a);
      for (const y of sortedYs) {
        const items = lineMap.get(y)!;
        // Sort items left-to-right within a line
        items.sort((a, b) => a.x - b.x);
        allLines.push(items.map((i) => i.str));
      }
    }

    // --- Strategy 1: Try to detect a header row in the collected lines ------
    for (let i = 0; i < Math.min(allLines.length, 30); i++) {
      const lineTokens = allLines[i];
      const cols = detectColumns(lineTokens);
      if (!cols) continue;

      const holdings: PortfolioHolding[] = [];
      for (let r = i + 1; r < allLines.length; r++) {
        const tokens = allLines[r];
        const rawName = (tokens[cols.nameIdx] ?? '').trim();
        const rawValue = parseNumericValue(tokens[cols.valueIdx]);

        if (rawName && !isNaN(rawValue) && rawValue !== 0) {
          holdings.push({
            stockName: normaliseStockName(rawName),
            currentValue: rawValue,
          });
        }
      }

      if (holdings.length > 0) return holdings;
    }

    // --- Strategy 2: Regex fallback – look for "STOCK_NAME ... 1,234.56" ---
    const fullText = allLines.map((tokens) => tokens.join(' ')).join('\n');
    const holdings: PortfolioHolding[] = [];

    // Match lines that start with text (possible stock name) and end with
    // one or more numbers. We grab the last number as the value.
    const lineRegex =
      /^([A-Z][A-Za-z&. ()-]+?)\s+([\d,]+\.?\d*)\s*$/gm;
    let match: RegExpExecArray | null;
    while ((match = lineRegex.exec(fullText)) !== null) {
      const name = normaliseStockName(match[1]);
      const value = parseNumericValue(match[2]);
      if (name.length > 1 && !isNaN(value) && value > 0) {
        holdings.push({ stockName: name, currentValue: value });
      }
    }

    if (holdings.length > 0) return holdings;

    console.warn(
      '[portfolioParser] No recognisable holdings found in PDF file.'
    );
    return [];
  } catch (err) {
    console.error('[portfolioParser] Failed to parse PDF file:', err);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Image parser (placeholder)
// ---------------------------------------------------------------------------

/**
 * Parse portfolio holdings from an image file.
 *
 * **Not yet implemented.** This is a placeholder that will be replaced with
 * OCR-based extraction (e.g. Tesseract.js) in a future release.
 *
 * @param _file - The image `File` object (unused for now).
 * @returns Always resolves to an empty array.
 */
export async function parsePortfolioFromImage(
  _file: File
): Promise<PortfolioHolding[]> {
  console.warn(
    '[portfolioParser] Image/OCR parsing is not yet implemented. Returning empty results.'
  );
  return [];
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Parse portfolio holdings from a file, dispatching to the appropriate parser
 * based on the file extension.
 *
 * Supported formats:
 * - `.xlsx` / `.xls` → Excel parser
 * - `.pdf` → PDF parser
 * - `.jpg` / `.jpeg` / `.png` → Image parser (placeholder)
 *
 * @param file - The `File` object to parse.
 * @returns An array of `PortfolioHolding` objects.
 * @throws {Error} If the file type is not supported.
 */
export async function parsePortfolioFile(
  file: File
): Promise<PortfolioHolding[]> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';

  switch (ext) {
    case 'xlsx':
    case 'xls':
      return parsePortfolioFromExcel(file);

    case 'pdf':
      return parsePortfolioFromPDF(file);

    case 'jpg':
    case 'jpeg':
    case 'png':
      return parsePortfolioFromImage(file);

    default:
      throw new Error(
        `Unsupported file type ".${ext}". Supported formats: .xlsx, .xls, .pdf, .jpg, .jpeg, .png`
      );
  }
}
