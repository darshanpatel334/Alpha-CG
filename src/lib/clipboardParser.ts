/**
 * Clipboard / TSV Parser
 * Handles tab-separated data pasted from Excel, Google Sheets, etc.
 */

export interface ParsedClipboard {
  headers: string[];
  rows: Record<string, unknown>[];
  rawRowCount: number;
}

/**
 * Parse tab-separated text (from Excel clipboard) into structured rows.
 * Handles both \t (tab) and multi-space delimiters.
 * Automatically detects the header row and data rows.
 */
export function parseTSV(text: string): ParsedClipboard {
  if (!text || !text.trim()) {
    return { headers: [], rows: [], rawRowCount: 0 };
  }

  // Normalize line endings
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Split into lines and filter empty trailing lines
  const lines = normalized.split('\n').filter((line) => line.trim() !== '');

  if (lines.length === 0) {
    return { headers: [], rows: [], rawRowCount: 0 };
  }

  // Detect delimiter: tab is standard from Excel, but fallback to multiple spaces
  const delimiter = lines[0].includes('\t') ? '\t' : /\s{2,}/;

  // First non-empty line is the header row
  const headers = splitLine(lines[0], delimiter).map((h) => h.trim());

  // Remaining lines are data
  const rows: Record<string, unknown>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitLine(lines[i], delimiter);
    if (values.length === 0 || values.every((v) => !v.trim())) continue;

    const row: Record<string, unknown> = {};
    for (let j = 0; j < headers.length; j++) {
      const val = j < values.length ? values[j].trim() : '';
      row[headers[j]] = val;
    }
    rows.push(row);
  }

  return { headers, rows, rawRowCount: rows.length };
}

function splitLine(line: string, delimiter: string | RegExp): string[] {
  if (typeof delimiter === 'string') {
    return line.split(delimiter);
  }
  return line.split(delimiter);
}

/**
 * Try to auto-map pasted column headers to our known fields.
 * Returns a mapping from our field name → detected header name.
 * Fields that couldn't be mapped are set to null.
 */
export function autoMapColumns(
  headers: string[]
): Record<string, string | null> {
  const FIELD_ALIASES: Record<string, string[]> = {
    buyDate: [
      'buy_date', 'buydate', 'buy date', 'purchase_date', 'purchasedate',
      'purchase date', 'date_of_purchase', 'acquisition_date', 'date of purchase',
      'buy dt', 'trade_date', 'trade date', 'entry date', 'entry_date',
      'bought date', 'acquisition date', 'buy_dt', 'purchase dt',
    ],
    sellDate: [
      'sell_date', 'selldate', 'sell date', 'sale_date', 'saledate',
      'sale date', 'date_of_sale', 'disposal_date', 'date of sale',
      'sell dt', 'settlement_date', 'settlement date', 'exit date',
      'exit_date', 'sold date', 'disposal date', 'sell_dt', 'sale dt',
    ],
    purchaseValue: [
      'purchase_value', 'purchasevalue', 'purchase value', 'buy_value',
      'buyvalue', 'buy value', 'cost_of_acquisition', 'purchase_amount',
      'buy_amount', 'cost', 'buy amt', 'buy_amt', 'purchase amt',
      'purchase_amt', 'cost of acquisition', 'buy price', 'buy_price',
      'purchase price', 'purchase_price', 'bought value', 'bought_value',
      'acquisition value', 'acquisition_value', 'total buy', 'total_buy',
    ],
    saleValue: [
      'sale_value', 'salevalue', 'sale value', 'sell_value', 'sellvalue',
      'sell value', 'sale_amount', 'sell_amount', 'sale_consideration',
      'sell amt', 'sell_amt', 'sale amt', 'sale_amt', 'consideration',
      'sell price', 'sell_price', 'sale price', 'sale_price', 'sold value',
      'sold_value', 'total sell', 'total_sell', 'sale consideration',
    ],
    purchaseExpenses: [
      'purchase_expenses', 'purchaseexpenses', 'purchase expenses',
      'buy_expenses', 'buy expenses', 'acquisition_expenses',
      'buy_brokerage', 'purchase_brokerage', 'buy charges', 'buy_charges',
      'purchase charges', 'purchase_charges', 'buy brokerage',
      'purchase brokerage', 'buying charges', 'buying_charges',
    ],
    transferExpenses: [
      'transfer_expenses', 'transferexpenses', 'transfer expenses',
      'sell_expenses', 'sell expenses', 'sale_expenses', 'sale expenses',
      'sell_brokerage', 'sale_brokerage', 'sell charges', 'sell_charges',
      'sale charges', 'sale_charges', 'sell brokerage', 'sale brokerage',
      'selling charges', 'selling_charges', 'transfer charges',
    ],
  };

  const result: Record<string, string | null> = {
    buyDate: null,
    sellDate: null,
    purchaseValue: null,
    saleValue: null,
    purchaseExpenses: null,
    transferExpenses: null,
  };

  for (const [fieldName, aliases] of Object.entries(FIELD_ALIASES)) {
    const normalizedAliases = aliases.map((a) =>
      a.toLowerCase().replace(/[\s_\-]+/g, '')
    );

    for (const header of headers) {
      const normalizedHeader = header.toLowerCase().replace(/[\s_\-]+/g, '');
      if (normalizedAliases.includes(normalizedHeader)) {
        result[fieldName] = header;
        break;
      }
    }
  }

  return result;
}

/**
 * Apply a column mapping to remap rows from source headers to our standard fields.
 */
export function applyColumnMapping(
  rows: Record<string, unknown>[],
  mapping: Record<string, string | null>
): Record<string, unknown>[] {
  return rows.map((row) => {
    const mapped: Record<string, unknown> = {};

    if (mapping.buyDate) mapped['Buy_Date'] = row[mapping.buyDate];
    if (mapping.sellDate) mapped['Sell_Date'] = row[mapping.sellDate];
    if (mapping.purchaseValue) mapped['Purchase_Value'] = row[mapping.purchaseValue];
    if (mapping.saleValue) mapped['Sale_Value'] = row[mapping.saleValue];
    if (mapping.purchaseExpenses) mapped['Purchase_Expenses'] = row[mapping.purchaseExpenses];
    if (mapping.transferExpenses) mapped['Transfer_Expenses'] = row[mapping.transferExpenses];

    return mapped;
  });
}
