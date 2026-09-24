// ---------------------------------------------------------------------------
// portfolioStorage.ts – localStorage-backed CRUD for individuals & holdings
// Storage key: 'nivezotax_portfolios'
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'nivezotax_portfolios';

// ── Interfaces ──────────────────────────────────────────────────────────────

export interface HoldingEntry {
  id: string;
  stockName: string;
  currentValue: number; // in INR
}

export interface Individual {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  holdings: HoldingEntry[];
  createdAt: number;
  updatedAt: number;
}

export interface AggregatedHoldingBreakdown {
  individualId: string;
  individualName: string;
  holding: HoldingEntry;
}

export interface AggregatedHolding {
  groupKey: string;
  stockName: string;
  totalValue: number;
  percentOfTotal: number;
  breakdown: AggregatedHoldingBreakdown[];
}

// ── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Normalise a stock name to create a strong grouping key.
 * Removes common suffixes (ltd, limited, eq), spaces, and special characters.
 */
export function getStockGroupingKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/\b(ltd\.?|limited|limite|eq|equity|tech|technology|technologies|ind|india)\b/g, '') // remove common suffixes
    .replace(/&/g, 'and')                           // normalize ampersand
    .replace(/[^a-z0-9]/g, '');                     // remove spaces and special chars
}

/**
 * Combine duplicate holdings using the strong grouping key.
 */
export function combineHoldingsList(holdings: HoldingEntry[]): HoldingEntry[] {
  const map = new Map<string, HoldingEntry>();
  for (const h of holdings) {
    const key = getStockGroupingKey(h.stockName);
    const finalKey = key || h.stockName.toLowerCase().trim();
    const existing = map.get(finalKey);
    if (existing) {
      existing.currentValue += h.currentValue;
      if (h.stockName.length < existing.stockName.length && h.stockName.length > 3) {
        existing.stockName = h.stockName.trim();
      }
    } else {
      map.set(finalKey, { ...h, stockName: h.stockName.trim() });
    }
  }
  return Array.from(map.values());
}

function readStore(): Individual[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Individual[];
  } catch (err) {
    console.error('[portfolioStorage] Failed to read store:', err);
    return [];
  }
}

function writeStore(data: Individual[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('[portfolioStorage] Failed to write store:', err);
  }
}

// ── Individual CRUD ─────────────────────────────────────────────────────────

/** Get all individuals from localStorage. */
export function getIndividuals(): Individual[] {
  try {
    const data = readStore();
    let migrated = false;

    for (const ind of data) {
      const combined = combineHoldingsList(ind.holdings);
      if (combined.length !== ind.holdings.length) {
        ind.holdings = combined;
        migrated = true;
      }
    }

    if (migrated) {
      writeStore(data);
    }
    
    return data;
  } catch (err) {
    console.error('[portfolioStorage] getIndividuals failed:', err);
    return [];
  }
}

/** Upsert an individual – adds if new, replaces if same id exists. */
export function saveIndividual(individual: Individual): void {
  try {
    const data = readStore();
    const idx = data.findIndex((i) => i.id === individual.id);
    if (idx !== -1) {
      data[idx] = { ...individual, updatedAt: Date.now() };
    } else {
      data.push(individual);
    }
    writeStore(data);
  } catch (err) {
    console.error('[portfolioStorage] saveIndividual failed:', err);
  }
}

/** Delete an individual by id. */
export function deleteIndividual(id: string): void {
  try {
    const data = readStore().filter((i) => i.id !== id);
    writeStore(data);
  } catch (err) {
    console.error('[portfolioStorage] deleteIndividual failed:', err);
  }
}

// ── Holding CRUD ────────────────────────────────────────────────────────────

/** Append holdings to an individual's holdings array. */
export function addHoldings(individualId: string, holdings: HoldingEntry[]): void {
  try {
    const data = readStore();
    const individual = data.find((i) => i.id === individualId);
    if (!individual) {
      console.warn(`[portfolioStorage] Individual ${individualId} not found`);
      return;
    }
    individual.holdings = combineHoldingsList([...individual.holdings, ...holdings]);
    individual.updatedAt = Date.now();
    writeStore(data);
  } catch (err) {
    console.error('[portfolioStorage] addHoldings failed:', err);
  }
}

/** Remove a single holding by holdingId from an individual. */
export function removeHolding(individualId: string, holdingId: string): void {
  try {
    const data = readStore();
    const individual = data.find((i) => i.id === individualId);
    if (!individual) {
      console.warn(`[portfolioStorage] Individual ${individualId} not found`);
      return;
    }
    individual.holdings = individual.holdings.filter((h) => h.id !== holdingId);
    individual.updatedAt = Date.now();
    writeStore(data);
  } catch (err) {
    console.error('[portfolioStorage] removeHolding failed:', err);
  }
}

/** Update a single holding entry (matched by holding.id). */
export function updateHolding(individualId: string, holding: HoldingEntry): void {
  try {
    const data = readStore();
    const individual = data.find((i) => i.id === individualId);
    if (!individual) {
      console.warn(`[portfolioStorage] Individual ${individualId} not found`);
      return;
    }
    const idx = individual.holdings.findIndex((h) => h.id === holding.id);
    if (idx === -1) {
      console.warn(`[portfolioStorage] Holding ${holding.id} not found`);
      return;
    }
    individual.holdings[idx] = holding;
    individual.holdings = combineHoldingsList(individual.holdings);
    individual.updatedAt = Date.now();
    writeStore(data);
  } catch (err) {
    console.error('[portfolioStorage] updateHolding failed:', err);
  }
}

/** Clear all holdings for an individual. */
export function clearHoldings(individualId: string): void {
  try {
    const data = readStore();
    const individual = data.find((i) => i.id === individualId);
    if (!individual) {
      console.warn(`[portfolioStorage] Individual ${individualId} not found`);
      return;
    }
    individual.holdings = [];
    individual.updatedAt = Date.now();
    writeStore(data);
  } catch (err) {
    console.error('[portfolioStorage] clearHoldings failed:', err);
  }
}

// ── Aggregation ─────────────────────────────────────────────────────────────

// (Moving getStockGroupingKey up)

/**
 * Aggregate holdings across all supplied individuals.
 * Stocks are combined by name using a strong grouping key to handle variations.
 * Results are sorted by totalValue descending.
 */
export function getAggregatedHoldings(individuals: Individual[]): AggregatedHolding[] {
  try {
    const map = new Map<
      string,
      { displayName: string; totalValue: number; breakdown: AggregatedHoldingBreakdown[] }
    >();

    for (const individual of individuals) {
      for (const h of individual.holdings) {
        const key = getStockGroupingKey(h.stockName);
        
        // If key is empty after strip (unlikely), fallback to original string
        const finalKey = key || h.stockName.toLowerCase().trim();
        
        const existing = map.get(finalKey);
        if (existing) {
          existing.totalValue += h.currentValue;
          existing.breakdown.push({
            individualId: individual.id,
            individualName: individual.name,
            holding: h,
          });
          // Keep the shorter/cleaner display name if possible
          if (h.stockName.length < existing.displayName.length && h.stockName.length > 3) {
            existing.displayName = h.stockName.trim();
          }
        } else {
          map.set(finalKey, {
            displayName: h.stockName.trim(),
            totalValue: h.currentValue,
            breakdown: [{
              individualId: individual.id,
              individualName: individual.name,
              holding: h,
            }],
          });
        }
      }
    }

    const grandTotal = Array.from(map.values()).reduce((sum, v) => sum + v.totalValue, 0);

    return Array.from(map.entries())
      .map(([groupKey, { displayName, totalValue, breakdown }]) => ({
        groupKey,
        stockName: displayName,
        totalValue,
        percentOfTotal: grandTotal > 0 ? (totalValue / grandTotal) * 100 : 0,
        breakdown: breakdown.sort((a, b) => b.holding.currentValue - a.holding.currentValue),
      }))
      .sort((a, b) => b.totalValue - a.totalValue);
  } catch (err) {
    console.error('[portfolioStorage] getAggregatedHoldings failed:', err);
    return [];
  }
}

// ── Factory helpers ─────────────────────────────────────────────────────────

/** Create a new Individual object with a generated id and timestamps. */
export function createIndividual(
  name: string,
  email?: string,
  phone?: string,
): Individual {
  const now = Date.now();
  return {
    id: crypto.randomUUID(),
    name,
    email,
    phone,
    holdings: [],
    createdAt: now,
    updatedAt: now,
  };
}

/** Create a new HoldingEntry with a generated id. */
export function createHolding(stockName: string, currentValue: number): HoldingEntry {
  return {
    id: crypto.randomUUID(),
    stockName,
    currentValue,
  };
}
