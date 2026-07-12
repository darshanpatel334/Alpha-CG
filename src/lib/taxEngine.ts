/**
 * Indian Capital Gains Tax Engine
 *
 * Core business logic for:
 * - Parsing Excel transactions
 * - Classifying gains as STCG or LTCG
 * - Mapping to advance tax periods
 * - Aggregating gains/losses by period
 * - Chronological loss set-off algorithm
 */

import { parseDate, daysBetween, getFiscalYear, formatDate } from './dateUtils';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface RawTransaction {
  buyDate: Date;
  sellDate: Date;
  purchaseValue: number;
  saleValue: number;
  purchaseExpenses: number;
  transferExpenses: number;
}

export type GainType = 'INTRADAY' | 'STCG' | 'LTCG';

export interface ClassifiedTransaction extends RawTransaction {
  totalPurchase: number;
  netSaleValue: number;
  capitalGain: number;
  holdingDays: number;
  gainType: GainType;
  periodIndex: number;
  periodLabel: string;
  fiscalYear: number;
}

export interface PeriodAggregate {
  periodIndex: number;
  periodLabel: string;
  intradayRaw: number;
  stcgRaw: number;
  ltcgRaw: number;
  totalRaw: number;
  transactionCount: number;
}

export interface SetOffResult {
  periodIndex: number;
  periodLabel: string;
  intradayBeforeSetOff: number;
  stcgBeforeSetOff: number;
  ltcgBeforeSetOff: number;
  intradayLossAbsorbed: number;
  stcgLossAbsorbed: number;
  ltcgLossAbsorbed: number;
  intradayAfterSetOff: number;
  stcgAfterSetOff: number;
  ltcgAfterSetOff: number;
  intradayLossCarriedForward: number;
  stcgLossCarriedForward: number;
  ltcgLossCarriedForward: number;
}

export interface CategorySummary {
  purchaseValue: number;
  saleValue: number;
  sellExpenses: number;
  gain: number;
}

export interface OverallSummary {
  intraday: CategorySummary;
  stcg: CategorySummary;
  ltcg: CategorySummary;
  total: CategorySummary;
}

export interface ProcessingResult {
  transactions: ClassifiedTransaction[];
  overallSummary: OverallSummary;
  periodAggregates: PeriodAggregate[];
  setOffResults: SetOffResult[];
  remainingIntradayLoss: number;
  remainingSTCGLoss: number;
  remainingLTCGLoss: number;
  totalTransactions: number;
  fiscalYear: string;
  parseErrors: string[];
  /** Whether per-transaction charge columns were detected (e.g. Zerodha) */
  chargesDetected: boolean;
  /** Total non-STT charges deducted from gains */
  totalChargesDeducted: number;
  /** Total STT detected (not deducted — shown for info only) */
  totalSTT: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

export const ADVANCE_TAX_PERIODS = [
  { index: 0, label: 'Upto 15/6', shortLabel: 'Q1a' },
  { index: 1, label: '16/6 to 15/9', shortLabel: 'Q1b–Q2' },
  { index: 2, label: '16/9 to 15/12', shortLabel: 'Q2–Q3' },
  { index: 3, label: '16/12 to 15/3', shortLabel: 'Q3–Q4' },
  { index: 4, label: '16/3 to 31/3', shortLabel: 'Q4-end' },
] as const;

// Default holding period threshold in days (listed equity: 365)
export const DEFAULT_HOLDING_THRESHOLD = 365;

// ─── Column Mapping ─────────────────────────────────────────────────────────

/** Known aliases for each required/optional column. */
const COLUMN_ALIASES: Record<string, string[]> = {
  buyDate: [
    'buy_date', 'buydate', 'buy date', 'purchase_date', 'purchasedate',
    'purchase date', 'date_of_purchase', 'acquisition_date', 'date of purchase',
    'buy dt', 'trade_date',
  ],
  sellDate: [
    'sell_date', 'selldate', 'sell date', 'sale_date', 'saledate',
    'sale date', 'date_of_sale', 'disposal_date', 'date of sale',
    'sell dt', 'settlement_date',
  ],
  purchaseValue: [
    'purchase_value', 'purchasevalue', 'purchase value', 'buy_value',
    'buyvalue', 'buy value', 'cost_of_acquisition', 'purchase_amount',
    'buy_amount', 'cost', 'buy amt',
  ],
  saleValue: [
    'sale_value', 'salevalue', 'sale value', 'sell_value', 'sellvalue',
    'sell value', 'sale_amount', 'sell_amount', 'sale_consideration',
    'sell amt', 'consideration',
  ],
  purchaseExpenses: [
    'purchase_expenses', 'purchaseexpenses', 'purchase expenses',
    'buy_expenses', 'buy expenses', 'acquisition_expenses',
    'buy_brokerage', 'purchase_brokerage', 'buy charges',
  ],
  transferExpenses: [
    'transfer_expenses', 'transferexpenses', 'transfer expenses',
    'sell_expenses', 'sell expenses', 'sale_expenses', 'sale expenses',
    'sell_brokerage', 'sale_brokerage', 'sell charges',
  ],
  // Zerodha-style individual charge columns (non-STT)
  brokerage: [
    'brokerage', 'brokerage charges',
  ],
  exchangeTransactionCharges: [
    'exchange transaction charges', 'exchange_transaction_charges',
    'exchange charges', 'exchange_charges', 'transaction charges',
    'exchange turnover charges', 'turnover charges',
  ],
  ipft: [
    'ipft', 'ipft charges', 'investor protection fund',
  ],
  sebiCharges: [
    'sebi charges', 'sebi_charges', 'sebi fees', 'sebi turnover fees',
  ],
  cgst: ['cgst'],
  sgst: ['sgst'],
  igst: ['igst'],
  stampDuty: [
    'stamp duty', 'stamp_duty', 'stampduty', 'stamp charges',
  ],
  stt: [
    'stt', 'securities transaction tax', 'securities_transaction_tax',
  ],
};

/**
 * Find the actual column header in the data that matches one of our known aliases.
 * Performs case-insensitive, whitespace-normalized matching.
 */
function findColumnKey(headers: string[], fieldName: string): string | null {
  const aliases = COLUMN_ALIASES[fieldName];
  if (!aliases) return null;

  const normalizedAliases = aliases.map((a) => a.toLowerCase().replace(/[\s_]+/g, ''));

  for (const header of headers) {
    const normalized = header.toLowerCase().replace(/[\s_]+/g, '');
    if (normalizedAliases.includes(normalized)) {
      return header;
    }
  }
  return null;
}

// ─── Zerodha-style individual charge column keys (non-STT) ──────────────────

const ZERODHA_CHARGE_KEYS = [
  'brokerage', 'exchangeTransactionCharges', 'ipft', 'sebiCharges',
  'cgst', 'sgst', 'igst', 'stampDuty',
] as const;

// ─── Parsing ────────────────────────────────────────────────────────────────

export interface ParseResult {
  transactions: RawTransaction[];
  errors: string[];
  /** True if per-transaction charge columns (Zerodha-style) were detected */
  chargesDetected: boolean;
  /** Total STT detected across all transactions (for display only) */
  totalSTT: number;
  /** Total non-STT charges summed from per-transaction columns */
  totalChargesFromColumns: number;
}

/**
 * Parse raw Excel JSON rows into typed transactions.
 * Automatically detects Zerodha-style individual charge columns (Brokerage,
 * Exchange Transaction Charges, IPFT, SEBI Charges, CGST, SGST, IGST,
 * Stamp Duty) and sums them into transferExpenses. STT is excluded.
 */
export function parseTransactions(
  rows: Record<string, unknown>[]
): ParseResult {
  if (!rows || rows.length === 0) {
    return { transactions: [], errors: ['No data rows found in the uploaded file.'], chargesDetected: false, totalSTT: 0, totalChargesFromColumns: 0 };
  }

  const headers = Object.keys(rows[0]);
  const errors: string[] = [];

  // Map core columns
  const buyDateCol = findColumnKey(headers, 'buyDate');
  const sellDateCol = findColumnKey(headers, 'sellDate');
  const purchaseValueCol = findColumnKey(headers, 'purchaseValue');
  const saleValueCol = findColumnKey(headers, 'saleValue');
  const purchaseExpensesCol = findColumnKey(headers, 'purchaseExpenses');
  const transferExpensesCol = findColumnKey(headers, 'transferExpenses');

  // Detect Zerodha-style individual charge columns
  const chargeColMap: Record<string, string | null> = {};
  for (const key of ZERODHA_CHARGE_KEYS) {
    chargeColMap[key] = findColumnKey(headers, key);
  }
  const sttCol = findColumnKey(headers, 'stt');

  const detectedChargeCols = ZERODHA_CHARGE_KEYS.filter(k => chargeColMap[k] !== null);
  const hasIndividualCharges = detectedChargeCols.length > 0;

  // Validate required columns
  if (!buyDateCol) errors.push('Required column "Buy_Date" not found. Expected aliases: Buy_Date, Purchase_Date, etc.');
  if (!sellDateCol) errors.push('Required column "Sell_Date" not found. Expected aliases: Sell_Date, Sale_Date, etc.');
  if (!purchaseValueCol) errors.push('Required column "Purchase_Value" not found. Expected aliases: Purchase_Value, Buy_Value, Cost, etc.');
  if (!saleValueCol) errors.push('Required column "Sale_Value" not found. Expected aliases: Sale_Value, Sell_Value, Sale_Consideration, etc.');

  if (errors.length > 0) {
    return { transactions: [], errors, chargesDetected: false, totalSTT: 0, totalChargesFromColumns: 0 };
  }

  // Determine charge handling mode
  const hasLegacyExpenses = !!(purchaseExpensesCol || transferExpensesCol);

  if (hasIndividualCharges) {
    const detectedNames = detectedChargeCols.map(k => chargeColMap[k]).join(', ');
    errors.push(`Info: Detected per-transaction charge columns: ${detectedNames}. Non-STT charges will be deducted from gains.`);
    if (sttCol) {
      errors.push('Info: STT column detected — excluded from expense deduction (not deductible under Section 48).');
    }
  } else if (!hasLegacyExpenses) {
    errors.push('Info: No per-transaction charge columns found. You can enter total charges (excl. STT) for proportional distribution.');
  }

  // Optional legacy expense columns
  if (!hasIndividualCharges) {
    if (!purchaseExpensesCol) {
      errors.push('Info: "Purchase_Expenses" column not found — defaulting to ₹0.');
    }
    if (!transferExpensesCol) {
      errors.push('Info: "Transfer_Expenses" column not found — defaulting to ₹0.');
    }
  }

  const transactions: RawTransaction[] = [];
  let totalSTT = 0;
  let totalChargesFromColumns = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // +2 for 1-indexed header row

    const buyDate = parseDate(row[buyDateCol!]);
    const sellDate = parseDate(row[sellDateCol!]);
    const purchaseValue = parseNumber(row[purchaseValueCol!]);
    const saleValue = parseNumber(row[saleValueCol!]);

    if (!buyDate) {
      errors.push(`Row ${rowNum}: Invalid Buy_Date "${row[buyDateCol!]}". Skipped.`);
      continue;
    }
    if (!sellDate) {
      errors.push(`Row ${rowNum}: Invalid Sell_Date "${row[sellDateCol!]}". Skipped.`);
      continue;
    }
    if (purchaseValue === null) {
      errors.push(`Row ${rowNum}: Invalid Purchase_Value "${row[purchaseValueCol!]}". Skipped.`);
      continue;
    }
    if (saleValue === null) {
      errors.push(`Row ${rowNum}: Invalid Sale_Value "${row[saleValueCol!]}". Skipped.`);
      continue;
    }

    let purchaseExpenses = 0;
    let transferExpenses = 0;

    if (hasIndividualCharges) {
      // Sum all non-STT charge columns into transferExpenses
      let rowCharges = 0;
      for (const key of ZERODHA_CHARGE_KEYS) {
        if (chargeColMap[key]) {
          const val = parseNumber(row[chargeColMap[key]!]);
          if (val !== null) rowCharges += val;
        }
      }
      transferExpenses = rowCharges;
      totalChargesFromColumns += rowCharges;

      // Track STT separately
      if (sttCol) {
        const sttVal = parseNumber(row[sttCol]);
        if (sttVal !== null) totalSTT += sttVal;
      }
    } else {
      // Use legacy expense columns
      purchaseExpenses = purchaseExpensesCol ? (parseNumber(row[purchaseExpensesCol]) ?? 0) : 0;
      transferExpenses = transferExpensesCol ? (parseNumber(row[transferExpensesCol]) ?? 0) : 0;
    }

    transactions.push({
      buyDate,
      sellDate,
      purchaseValue,
      saleValue,
      purchaseExpenses,
      transferExpenses,
    });
  }

  return {
    transactions,
    errors,
    chargesDetected: hasIndividualCharges,
    totalSTT,
    totalChargesFromColumns,
  };
}

function parseNumber(value: unknown): number | null {
  if (value == null || value === '') return null;
  if (typeof value === 'number') return isNaN(value) ? null : value;
  if (typeof value === 'string') {
    // Remove commas, currency symbols, spaces
    const cleaned = value.replace(/[₹,$\s,]/g, '').trim();
    if (!cleaned) return null;
    const num = Number(cleaned);
    return isNaN(num) ? null : num;
  }
  return null;
}

// ─── Classification ─────────────────────────────────────────────────────────

/**
 * Classify a raw transaction as STCG or LTCG and compute gains.
 */
export function classifyTransaction(
  tx: RawTransaction,
  holdingThreshold: number = DEFAULT_HOLDING_THRESHOLD
): ClassifiedTransaction {
  const totalPurchase = tx.purchaseValue + tx.purchaseExpenses;
  const netSaleValue = tx.saleValue - tx.transferExpenses;
  const capitalGain = netSaleValue - totalPurchase;
  const holdingDays = daysBetween(tx.buyDate, tx.sellDate);
  let gainType: GainType;
  if (holdingDays === 0) {
    gainType = 'INTRADAY';
  } else if (holdingDays > holdingThreshold) {
    gainType = 'LTCG';
  } else {
    gainType = 'STCG';
  }
  const periodIndex = mapToAdvanceTaxPeriod(tx.sellDate);
  const periodLabel = ADVANCE_TAX_PERIODS[periodIndex].label;
  const fiscalYear = getFiscalYear(tx.sellDate);

  return {
    ...tx,
    totalPurchase,
    netSaleValue,
    capitalGain,
    holdingDays,
    gainType,
    periodIndex,
    periodLabel,
    fiscalYear,
  };
}

// ─── Advance Tax Period Mapping ─────────────────────────────────────────────

/**
 * Map a sell date to one of five advance tax periods (0–4).
 * Based on the Indian advance tax schedule:
 *   0: Apr 1 – Jun 15
 *   1: Jun 16 – Sep 15
 *   2: Sep 16 – Dec 15
 *   3: Dec 16 – Mar 15
 *   4: Mar 16 – Mar 31
 */
export function mapToAdvanceTaxPeriod(sellDate: Date): number {
  const month = sellDate.getMonth(); // 0-indexed
  const day = sellDate.getDate();

  // April (3), May (4), June (5)
  if (month >= 3 && month <= 4) return 0; // Apr–May → Period 0
  if (month === 5) return day <= 15 ? 0 : 1; // Jun 1–15 → 0, Jun 16–30 → 1

  // July (6), August (7), September (8)
  if (month >= 6 && month <= 7) return 1; // Jul–Aug → Period 1
  if (month === 8) return day <= 15 ? 1 : 2; // Sep 1–15 → 1, Sep 16–30 → 2

  // October (9), November (10), December (11)
  if (month >= 9 && month <= 10) return 2; // Oct–Nov → Period 2
  if (month === 11) return day <= 15 ? 2 : 3; // Dec 1–15 → 2, Dec 16–31 → 3

  // January (0), February (1), March (2)
  if (month >= 0 && month <= 1) return 3; // Jan–Feb → Period 3
  if (month === 2) return day <= 15 ? 3 : 4; // Mar 1–15 → 3, Mar 16–31 → 4

  return 0; // Fallback (shouldn't reach here)
}

// ─── Aggregation ────────────────────────────────────────────────────────────

/**
 * Aggregate classified transactions into totals per advance tax period.
 */
export function aggregateByPeriod(
  transactions: ClassifiedTransaction[]
): PeriodAggregate[] {
  const aggregates: PeriodAggregate[] = ADVANCE_TAX_PERIODS.map((p) => ({
    periodIndex: p.index,
    periodLabel: p.label,
    intradayRaw: 0,
    stcgRaw: 0,
    ltcgRaw: 0,
    totalRaw: 0,
    transactionCount: 0,
  }));

  for (const tx of transactions) {
    const agg = aggregates[tx.periodIndex];
    agg.transactionCount++;
    if (tx.gainType === 'INTRADAY') {
      agg.intradayRaw += tx.capitalGain;
    } else if (tx.gainType === 'STCG') {
      agg.stcgRaw += tx.capitalGain;
    } else {
      agg.ltcgRaw += tx.capitalGain;
    }
    agg.totalRaw = agg.intradayRaw + agg.stcgRaw + agg.ltcgRaw;
  }

  return aggregates;
}

// ─── Loss Set-Off ───────────────────────────────────────────────────────────

/**
 * Apply chronological loss set-off algorithm.
 * Iterates from Period 0 to Period 4.
 * STCG and LTCG loss pools are kept SEPARATE.
 * If a period has net loss, it is carried forward to subtract from the next period.
 */
export function applyLossSetOff(aggregates: PeriodAggregate[]): {
  results: SetOffResult[];
  remainingIntradayLoss: number;
  remainingSTCGLoss: number;
  remainingLTCGLoss: number;
} {
  let intradayLossPool = 0;
  let stcgLossPool = 0;
  let ltcgLossPool = 0;

  const results: SetOffResult[] = [];

  for (const agg of aggregates) {
    const intradayBeforeSetOff = agg.intradayRaw;
    const stcgBeforeSetOff = agg.stcgRaw;
    const ltcgBeforeSetOff = agg.ltcgRaw;

    // Apply carried-forward losses
    let intradayNet = intradayBeforeSetOff + intradayLossPool;
    let stcgNet = stcgBeforeSetOff + stcgLossPool; // stcgLossPool is negative
    let ltcgNet = ltcgBeforeSetOff + ltcgLossPool;

    const intradayLossAbsorbed = intradayNet >= 0
      ? -intradayLossPool
      : -(intradayLossPool - (intradayNet));

    const stcgLossAbsorbed = stcgNet >= 0
      ? -stcgLossPool  // All carried loss was absorbed
      : -(stcgLossPool - (stcgNet)); // Only partial absorption

    const ltcgLossAbsorbed = ltcgNet >= 0
      ? -ltcgLossPool
      : -(ltcgLossPool - (ltcgNet));

    // Calculate new loss pools
    if (intradayNet < 0) {
      intradayLossPool = intradayNet;
      intradayNet = 0;
    } else {
      intradayLossPool = 0;
    }

    if (stcgNet < 0) {
      stcgLossPool = stcgNet; // Carry the loss forward
      stcgNet = 0;
    } else {
      stcgLossPool = 0;
    }

    if (ltcgNet < 0) {
      ltcgLossPool = ltcgNet;
      ltcgNet = 0;
    } else {
      ltcgLossPool = 0;
    }

    results.push({
      periodIndex: agg.periodIndex,
      periodLabel: agg.periodLabel,
      intradayBeforeSetOff,
      stcgBeforeSetOff,
      ltcgBeforeSetOff,
      intradayLossAbsorbed: Math.abs(intradayLossAbsorbed),
      stcgLossAbsorbed: Math.abs(stcgLossAbsorbed),
      ltcgLossAbsorbed: Math.abs(ltcgLossAbsorbed),
      intradayAfterSetOff: intradayNet,
      stcgAfterSetOff: stcgNet,
      ltcgAfterSetOff: ltcgNet,
      intradayLossCarriedForward: Math.abs(intradayLossPool),
      stcgLossCarriedForward: Math.abs(stcgLossPool),
      ltcgLossCarriedForward: Math.abs(ltcgLossPool),
    });
  }

  return {
    results,
    remainingIntradayLoss: Math.abs(intradayLossPool),
    remainingSTCGLoss: Math.abs(stcgLossPool),
    remainingLTCGLoss: Math.abs(ltcgLossPool),
  };
}

// ─── Lump-Sum Charge Distribution ───────────────────────────────────────────

/**
 * Distribute a lump-sum charge amount (excl. STT) proportionally across
 * transactions based on each transaction's trade value (buyValue + sellValue)
 * relative to the total trade value of all transactions.
 *
 * Returns new rows with the distributed charges added to transferExpenses.
 */
export function distributeLumpSumCharges(
  rows: Record<string, unknown>[],
  lumpSumAmount: number
): Record<string, unknown>[] {
  if (lumpSumAmount <= 0 || rows.length === 0) return rows;

  // Calculate total trade value across all rows to determine proportions
  const headers = Object.keys(rows[0]);
  const purchaseValueCol = findColumnKey(headers, 'purchaseValue');
  const saleValueCol = findColumnKey(headers, 'saleValue');

  if (!purchaseValueCol || !saleValueCol) return rows;

  const tradeValues = rows.map(row => {
    const buy = parseNumber(row[purchaseValueCol]) ?? 0;
    const sell = parseNumber(row[saleValueCol]) ?? 0;
    return Math.abs(buy) + Math.abs(sell);
  });

  const totalTradeValue = tradeValues.reduce((sum, v) => sum + v, 0);
  if (totalTradeValue === 0) return rows;

  // Find or determine the transfer_expenses column name
  const transferExpensesCol = findColumnKey(headers, 'transferExpenses') || 'Transfer_Expenses';

  return rows.map((row, i) => {
    const proportion = tradeValues[i] / totalTradeValue;
    const distributedCharge = lumpSumAmount * proportion;
    const existingExpense = parseNumber(row[transferExpensesCol]) ?? 0;

    return {
      ...row,
      [transferExpensesCol]: existingExpense + distributedCharge,
    };
  });
}

// ─── Main Processing Pipeline ───────────────────────────────────────────────

/**
 * Full processing pipeline: parse → classify → aggregate → set-off.
 */
export function processTransactions(
  rows: Record<string, unknown>[],
  holdingThreshold: number = DEFAULT_HOLDING_THRESHOLD
): ProcessingResult {
  // Step 1: Parse
  const {
    transactions: rawTxns,
    errors: parseErrors,
    chargesDetected,
    totalSTT,
    totalChargesFromColumns,
  } = parseTransactions(rows);

  const emptyCat = (): CategorySummary => ({
    purchaseValue: 0,
    saleValue: 0,
    sellExpenses: 0,
    gain: 0,
  });

  const emptyOverallSummary: OverallSummary = {
    intraday: emptyCat(),
    stcg: emptyCat(),
    ltcg: emptyCat(),
    total: emptyCat(),
  };

  if (rawTxns.length === 0) {
    return {
      transactions: [],
      overallSummary: emptyOverallSummary,
      periodAggregates: ADVANCE_TAX_PERIODS.map((p) => ({
        periodIndex: p.index,
        periodLabel: p.label,
        intradayRaw: 0,
        stcgRaw: 0,
        ltcgRaw: 0,
        totalRaw: 0,
        transactionCount: 0,
      })),
      setOffResults: [],
      remainingIntradayLoss: 0,
      remainingSTCGLoss: 0,
      remainingLTCGLoss: 0,
      totalTransactions: 0,
      fiscalYear: '',
      parseErrors,
      chargesDetected,
      totalChargesDeducted: 0,
      totalSTT,
    };
  }

  // Step 2: Classify
  const classified = rawTxns.map((tx) => classifyTransaction(tx, holdingThreshold));

  // Step 2.5: Build Overall Summary
  const overallSummary: OverallSummary = {
    intraday: emptyCat(),
    stcg: emptyCat(),
    ltcg: emptyCat(),
    total: emptyCat(),
  };

  let totalChargesDeducted = 0;

  for (const tx of classified) {
    let cat: CategorySummary;
    if (tx.gainType === 'INTRADAY') cat = overallSummary.intraday;
    else if (tx.gainType === 'STCG') cat = overallSummary.stcg;
    else cat = overallSummary.ltcg;

    cat.purchaseValue += tx.totalPurchase;
    cat.saleValue += tx.saleValue;
    cat.sellExpenses += tx.transferExpenses;
    cat.gain += tx.capitalGain;

    overallSummary.total.purchaseValue += tx.totalPurchase;
    overallSummary.total.saleValue += tx.saleValue;
    overallSummary.total.sellExpenses += tx.transferExpenses;
    overallSummary.total.gain += tx.capitalGain;

    totalChargesDeducted += tx.transferExpenses + tx.purchaseExpenses;
  }

  // If charges came from individual columns, use the pre-computed total
  // (avoids floating point drift from summing classified transactions)
  if (chargesDetected && totalChargesFromColumns > 0) {
    totalChargesDeducted = totalChargesFromColumns;
  }

  // Determine fiscal year from the first transaction's sell date
  const fy = getFiscalYear(classified[0].sellDate);
  const fiscalYear = `FY ${fy}–${String(fy + 1).slice(2)}`;

  // Step 3: Aggregate
  const periodAggregates = aggregateByPeriod(classified);

  // Step 4: Loss set-off
  const { results: setOffResults, remainingIntradayLoss, remainingSTCGLoss, remainingLTCGLoss } =
    applyLossSetOff(periodAggregates);

  return {
    transactions: classified,
    overallSummary,
    periodAggregates,
    setOffResults,
    remainingIntradayLoss,
    remainingSTCGLoss,
    remainingLTCGLoss,
    totalTransactions: classified.length,
    fiscalYear,
    parseErrors,
    chargesDetected,
    totalChargesDeducted,
    totalSTT,
  };
}

/**
 * Format a number as Indian Rupees.
 */
export function formatINR(amount: number, showDecimals: boolean = false): string {
  const displayAmount = showDecimals ? amount : Math.round(amount);
  const abs = Math.abs(displayAmount);
  const formatted = abs.toLocaleString('en-IN', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  });
  const prefix = displayAmount < 0 ? '-₹' : '₹';
  return `${prefix}${formatted}`;
}

/**
 * Get a summary description for gain type display.
 */
export function getGainTypeLabel(type: GainType): string {
  if (type === 'INTRADAY') return 'Intraday';
  return type === 'STCG' ? 'Short Term' : 'Long Term';
}

export { formatDate };
