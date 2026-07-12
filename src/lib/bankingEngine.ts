import { parseDate } from './dateUtils';

export type BankingCategory = 
  | 'SALARY' 
  | 'DIVIDEND' 
  | 'INTEREST' 
  | 'CASH_DEPOSIT' 
  | 'WITHDRAWAL' 
  | 'INVESTMENT'
  | 'OTHER_CREDIT' 
  | 'UNKNOWN';

export interface BankTransaction {
  id: string;
  date: Date;
  description: string;
  withdrawal: number;
  deposit: number;
  balance: number;
  category: BankingCategory;
  raw: Record<string, unknown>;
}

export interface BankingSummary {
  totalSalary: number;
  totalDividend: number;
  totalInterest: number;
  totalCashDeposit: number;
  totalOtherCredit: number;
  totalWithdrawal: number;
  totalInvestment: number;
  totalTransactions: number;
}

export interface BankingProcessingResult {
  transactions: BankTransaction[];
  summary: BankingSummary;
  parseErrors: string[];
}

function parseNumber(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/,/g, '').trim();
    const num = Number(cleaned);
    return isNaN(num) ? 0 : num;
  }
  return 0;
}

export function classifyBankTransaction(
  desc: string,
  withdrawal: number,
  deposit: number
): BankingCategory {
  const text = desc.toUpperCase();

  if (withdrawal > 0) {
    if (text.includes('INDIAN CLEARING CORP') || text.includes('MUTUAL FUND') || text.includes('SIP ') || text.includes('AMC')) {
      return 'INVESTMENT';
    }
    return 'WITHDRAWAL';
  }

  if (deposit > 0) {
    if (text.includes('SALARY') || text.includes('PAYROLL') || text.includes('SAL ')) {
      return 'SALARY';
    }
    if (text.includes('DIVIDEND') || text.includes('DIV ') || text.includes('ACH/DIV') || text.includes('ACH-DIV') || (text.includes('ACH/') && !text.includes('INDIAN CLEARING CORP'))) {
      return 'DIVIDEND';
    }
    if (text.includes('INTEREST') || text.includes('INT.PD') || text.includes('SB INT') || text.includes('SAVING INT') || text.includes('INT-')) {
      return 'INTEREST';
    }
    if (text.includes('BY CASH') || text.includes('CASH DEP') || text.includes('CASH DEPOSIT')) {
      return 'CASH_DEPOSIT';
    }
    return 'OTHER_CREDIT';
  }

  return 'UNKNOWN';
}

export function recalculateBankingSummary(transactions: BankTransaction[]): BankingSummary {
  const summary: BankingSummary = {
    totalSalary: 0,
    totalDividend: 0,
    totalInterest: 0,
    totalCashDeposit: 0,
    totalOtherCredit: 0,
    totalWithdrawal: 0,
    totalInvestment: 0,
    totalTransactions: transactions.length,
  };

  transactions.forEach((tx) => {
    if (tx.category === 'SALARY') summary.totalSalary += tx.deposit;
    if (tx.category === 'DIVIDEND') summary.totalDividend += tx.deposit;
    if (tx.category === 'INTEREST') summary.totalInterest += tx.deposit;
    if (tx.category === 'CASH_DEPOSIT') summary.totalCashDeposit += tx.deposit;
    if (tx.category === 'OTHER_CREDIT') summary.totalOtherCredit += tx.deposit;
    if (tx.category === 'WITHDRAWAL') summary.totalWithdrawal += tx.withdrawal;
    if (tx.category === 'INVESTMENT') summary.totalInvestment += tx.withdrawal;
  });

  return summary;
}

export function processBankingTransactions(rows: Record<string, unknown>[]): BankingProcessingResult {
  const transactions: BankTransaction[] = [];
  const parseErrors: string[] = [];


  rows.forEach((row, index) => {
    const withdrawal = Math.abs(parseNumber(row.withdrawal || row.debit || row.dr || row.withdrawalAmount));
    const deposit = Math.abs(parseNumber(row.deposit || row.credit || row.cr || row.depositAmount));

    if (withdrawal === 0 && deposit === 0) {
      // Might be a header row or empty line inside data, skip silently
      return;
    }

    // Try to extract date
    const dateRaw = row.date || row.transactionDate || row.valueDate;
    const date = parseDate(dateRaw);
    if (!date) {
      parseErrors.push(`Row ${index + 1}: Invalid or missing date '${dateRaw}'`);
      return;
    }

    const description = String(row.description || row.narration || row.transactionRemarks || row.particulars || '').trim();
    if (!description) {
      parseErrors.push(`Row ${index + 1}: Missing description/narration`);
      return;
    }

    const balance = parseNumber(row.balance || row.bal);

    const category = classifyBankTransaction(description, withdrawal, deposit);

    const tx: BankTransaction = {
      id: crypto.randomUUID(),
      date,
      description,
      withdrawal,
      deposit,
      balance,
      category,
      raw: row,
    };

    transactions.push(tx);
  });

  const summary = recalculateBankingSummary(transactions);

  return {
    transactions,
    summary,
    parseErrors,
  };
}
