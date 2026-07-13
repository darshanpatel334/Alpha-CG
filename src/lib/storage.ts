import type { OverallSummary, PeriodAggregate } from './taxEngine';

export interface SavedReport {
  id: string;
  name: string;
  year: string;
  timestamp: number;
  overallSummary: OverallSummary;
  periodAggregates: PeriodAggregate[];
  totalTransactions: number;
  fiscalYear: string;
}

const STORAGE_KEY = 'nivezotax_saved_reports';

/**
 * Retrieve all saved reports from local storage.
 */
export function getSavedReports(): SavedReport[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) as SavedReport[];
  } catch (error) {
    console.error('Failed to parse saved reports:', error);
    return [];
  }
}

/**
 * Save a new report to local storage.
 */
export function saveReport(
  name: string,
  year: string,
  overallSummary: OverallSummary,
  periodAggregates: PeriodAggregate[],
  totalTransactions: number,
  fiscalYear: string
): void {
  const reports = getSavedReports();
  const newReport: SavedReport = {
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(),
    name,
    year,
    timestamp: Date.now(),
    overallSummary,
    periodAggregates,
    totalTransactions,
    fiscalYear,
  };
  reports.push(newReport);
  
  // Sort descending by timestamp (newest first)
  reports.sort((a, b) => b.timestamp - a.timestamp);
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}

/**
 * Delete a saved report by ID.
 */
export function deleteReport(id: string): void {
  let reports = getSavedReports();
  reports = reports.filter(r => r.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reports));
}
