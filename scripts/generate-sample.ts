/**
 * Generate a sample XLSX file for testing.
 * Run with: npx tsx scripts/generate-sample.ts
 */
import * as XLSX from 'xlsx';

const sampleData = [
  // Period i: Apr 1 – Jun 15 (STCG gains + LTCG loss)
  { Buy_Date: '01/01/2025', Sell_Date: '15/04/2025', Purchase_Value: 100000, Sale_Value: 115000, Purchase_Expenses: 500, Transfer_Expenses: 300 },
  { Buy_Date: '01/03/2024', Sell_Date: '10/05/2025', Purchase_Value: 200000, Sale_Value: 180000, Purchase_Expenses: 800, Transfer_Expenses: 600 },

  // Period ii: Jun 16 – Sep 15 (both gains)
  { Buy_Date: '15/06/2025', Sell_Date: '20/07/2025', Purchase_Value: 50000, Sale_Value: 62000, Purchase_Expenses: 200, Transfer_Expenses: 150 },
  { Buy_Date: '10/01/2024', Sell_Date: '01/08/2025', Purchase_Value: 300000, Sale_Value: 360000, Purchase_Expenses: 1200, Transfer_Expenses: 900 },

  // Period iii: Sep 16 – Dec 15 (STCG loss)
  { Buy_Date: '01/08/2025', Sell_Date: '20/10/2025', Purchase_Value: 150000, Sale_Value: 130000, Purchase_Expenses: 600, Transfer_Expenses: 400 },
  { Buy_Date: '15/10/2024', Sell_Date: '01/11/2025', Purchase_Value: 80000, Sale_Value: 95000, Purchase_Expenses: 300, Transfer_Expenses: 200 },

  // Period iv: Dec 16 – Mar 15 (mixed)
  { Buy_Date: '01/11/2025', Sell_Date: '15/01/2026', Purchase_Value: 120000, Sale_Value: 140000, Purchase_Expenses: 500, Transfer_Expenses: 350 },
  { Buy_Date: '20/12/2024', Sell_Date: '20/02/2026', Purchase_Value: 250000, Sale_Value: 230000, Purchase_Expenses: 1000, Transfer_Expenses: 700 },

  // Period v: Mar 16 – Mar 31 (STCG gain)
  { Buy_Date: '01/02/2026', Sell_Date: '25/03/2026', Purchase_Value: 75000, Sale_Value: 82000, Purchase_Expenses: 300, Transfer_Expenses: 200 },
  { Buy_Date: '15/01/2025', Sell_Date: '30/03/2026', Purchase_Value: 180000, Sale_Value: 210000, Purchase_Expenses: 700, Transfer_Expenses: 500 },
];

const ws = XLSX.utils.json_to_sheet(sampleData);
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, 'Transactions');
XLSX.writeFile(wb, 'sample_broker_statement.xlsx');

console.log('✓ Created sample_broker_statement.xlsx with', sampleData.length, 'transactions');
