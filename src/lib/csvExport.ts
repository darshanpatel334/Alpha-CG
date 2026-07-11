/**
 * CSV Export Utility
 * Generates and downloads CSV files from structured data using the browser's Blob API.
 */

export interface CSVRow {
  [key: string]: string | number;
}

/**
 * Convert an array of objects to a CSV string.
 * Handles proper escaping of values containing commas, quotes, or newlines.
 */
function toCSVString(data: CSVRow[], columns: string[]): string {
  const lines: string[] = [];

  // Header row
  lines.push(columns.map(escapeCSV).join(','));

  // Data rows
  for (const row of data) {
    const values = columns.map((col) => {
      const val = row[col];
      if (val == null) return '';
      return escapeCSV(String(val));
    });
    lines.push(values.join(','));
  }

  return lines.join('\r\n');
}

/**
 * Escape a CSV field value. Wraps in quotes if the value contains
 * commas, double quotes, or newlines.
 */
function escapeCSV(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n') || value.includes('\r')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Export data as a CSV file and trigger a browser download.
 */
export function exportToCSV(
  data: CSVRow[],
  columns: string[],
  filename: string = 'capital_gains_summary.csv'
): void {
  const csvContent = toCSVString(data, columns);
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  // Cleanup
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 100);
}
