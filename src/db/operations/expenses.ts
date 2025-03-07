import { Expense, ExpenseCategory, ExpenseImport } from '../../types';
import { format } from 'date-fns';
import { convertToNZTimezone } from '../../services/api/utils';
import { expensesService, expenseCategoriesService, expenseImportsService } from '../../services';
import { supabase } from '../../services/supabase';

// Expense operations
export async function saveExpense(expense: Expense): Promise<number> {
  try {
    const result = await expensesService.add(expense);
    return result.id!;
  } catch (error) {
    console.error('Error saving expense:', error);
    throw error;
  }
}

export async function updateExpense(id: number, expense: Partial<Expense>): Promise<void> {
  try {
    await expensesService.update(id, expense);
  } catch (error) {
    console.error('Error updating expense:', error);
    throw error;
  }
}

export async function deleteExpense(id: number): Promise<void> {
  try {
    await expensesService.delete(id);
  } catch (error) {
    console.error('Error deleting expense:', error);
    throw error;
  }
}

export async function getExpenses(startDate?: Date, endDate?: Date): Promise<Expense[]> {
  try {
    if (startDate && endDate) {
      return await expensesService.getExpensesByDateRange(startDate, endDate);
    } else {
      return await expensesService.getAll();
    }
  } catch (error) {
    console.error('Error getting expenses:', error);
    throw error;
  }
}

export async function getExpensesByCategory(category: string, startDate?: Date, endDate?: Date): Promise<Expense[]> {
  try {
    let expenses = await expensesService.getExpensesByCategory(category);
    
    // Filter by date range if provided
    if (startDate && endDate) {
      expenses = expenses.filter(expense => {
        const expenseDate = new Date(expense.date);
        return expenseDate >= startDate && expenseDate <= endDate;
      });
    }
    
    return expenses;
  } catch (error) {
    console.error('Error getting expenses by category:', error);
    throw error;
  }
}

export async function getExpenseCategories(): Promise<ExpenseCategory[]> {
  try {
    return await expenseCategoriesService.getAll();
  } catch (error) {
    console.error('Error getting expense categories:', error);
    throw error;
  }
}

export async function saveExpenseCategory(category: ExpenseCategory): Promise<number> {
  try {
    const result = await expenseCategoriesService.add(category);
    return result.id!;
  } catch (error) {
    console.error('Error saving expense category:', error);
    throw error;
  }
}

export async function updateExpenseCategory(id: number, category: Partial<ExpenseCategory>): Promise<void> {
  try {
    await expenseCategoriesService.update(id, category);
  } catch (error) {
    console.error('Error updating expense category:', error);
    throw error;
  }
}

export async function deleteExpenseCategory(id: number): Promise<void> {
  try {
    await expenseCategoriesService.delete(id);
  } catch (error) {
    console.error('Error deleting expense category:', error);
    throw error;
  }
}

export async function getExpensesByPeriod(period: 'daily' | 'weekly' | 'monthly' | 'yearly', startDate?: Date, endDate?: Date): Promise<Record<string, number>> {
  try {
    // Get expenses filtered by date range if provided
    const expenses = await getExpenses(startDate, endDate);
    
    // Group expenses by period
    const groupedExpenses: Record<string, number> = {};
    
    for (const expense of expenses) {
      const expenseDate = new Date(expense.date);
      let key: string;
      
      switch (period) {
        case 'daily':
          key = format(expenseDate, 'yyyy-MM-dd');
          break;
        case 'weekly':
          key = `Week ${getWeekNumber(expenseDate)}, ${format(expenseDate, 'yyyy')}`;
          break;
        case 'monthly':
          key = format(expenseDate, 'yyyy-MM');
          break;
        case 'yearly':
          key = format(expenseDate, 'yyyy');
          break;
      }
      
      if (!groupedExpenses[key]) {
        groupedExpenses[key] = 0;
      }
      
      groupedExpenses[key] += expense.amount;
    }
    
    return groupedExpenses;
  } catch (error) {
    console.error('Error getting expenses by period:', error);
    throw error;
  }
}

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

export async function saveExpenseImport(importData: ExpenseImport): Promise<number> {
  try {
    const result = await expenseImportsService.add(importData);
    return result.id!;
  } catch (error) {
    console.error('Error saving expense import:', error);
    throw error;
  }
}

export async function getExpenseImports(): Promise<ExpenseImport[]> {
  try {
    return await expenseImportsService.getAll();
  } catch (error) {
    console.error('Error getting expense imports:', error);
    throw error;
  }
}

export async function processExpenseImport(
  csvData: string,
  columnMapping: Record<string, string>,
  defaultCategory: string
): Promise<{ imported: number, skipped: number, importId: number }> {
  try {
    // Parse CSV data
    const lines = csvData.split('\n');
    if (lines.length < 2) {
      throw new Error('CSV file is empty or invalid');
    }
    
    // Get header row and trim whitespace
    const headers = parseCSVLine(lines[0]).map(header => header.trim());
    
    // Validate required columns
    const requiredColumns = ['date', 'amount'];
    for (const column of requiredColumns) {
      if (!columnMapping[column] || !headers.includes(columnMapping[column])) {
        throw new Error(`Required column '${column}' is not mapped or not found in CSV`);
      }
    }
    
    // Map column indices
    const columnIndices: Record<string, number> = {};
    for (const [key, value] of Object.entries(columnMapping)) {
      const index = headers.indexOf(value);
      if (index !== -1) {
        columnIndices[key] = index;
      }
    }
    
    // Process data rows
    const expenses: Expense[] = [];
    const skippedRows: number[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines
      
      try {
        const values = parseCSVLine(line);
        
        // Extract values based on column mapping
        const dateStr = columnIndices.date !== undefined ? values[columnIndices.date].trim() : '';
        const amountStr = columnIndices.amount !== undefined ? values[columnIndices.amount].trim() : '';
        const description = columnIndices.description !== undefined ? values[columnIndices.description].trim() : '';
        const category = columnIndices.category !== undefined ? values[columnIndices.category].trim() : defaultCategory;
        const reference = columnIndices.reference !== undefined ? values[columnIndices.reference].trim() : '';
        const paymentMethod = columnIndices.payment_method !== undefined ? values[columnIndices.payment_method].trim() : '';
        
        // Parse date and amount
        const date = parseDate(dateStr);
        const amount = parseAmount(amountStr);
        
        // Validate parsed values
        if (!isValidDate(date) || isNaN(amount) || amount <= 0) {
          skippedRows.push(i);
          continue;
        }
        
        // Create expense object
        const expense: Expense = {
          date,
          amount,
          description,
          category,
          reference,
          payment_method: paymentMethod,
          tax_deductible: false // Default value
        };
        
        expenses.push(expense);
      } catch (error) {
        console.error(`Error processing row ${i}:`, error);
        skippedRows.push(i);
      }
    }
    
    // Save expenses to database
    let importId = 0;
    let imported = 0;
    
    if (expenses.length > 0) {
      // Create import record
      const importRecord: ExpenseImport = {
        date: new Date(),
        filename: 'CSV Import',
        items_imported: expenses.length,
        items_skipped: skippedRows.length
      };
      
      importId = await saveExpenseImport(importRecord);
      
      // Save expenses
      for (const expense of expenses) {
        await saveExpense(expense);
        imported++;
      }
    }
    
    return {
      imported,
      skipped: skippedRows.length,
      importId
    };
  } catch (error) {
    console.error('Error processing expense import:', error);
    throw error;
  }
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  // Add the last field
  result.push(current);
  
  return result;
}

function parseDate(dateStr: string): Date {
  // Try different date formats
  const formats = [
    // ISO format
    /^(\d{4})-(\d{2})-(\d{2})$/,
    // DD/MM/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // MM/DD/YYYY
    /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
    // DD-MM-YYYY
    /^(\d{1,2})-(\d{1,2})-(\d{4})$/,
    // DD.MM.YYYY
    /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/
  ];
  
  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      if (format === formats[0]) {
        // ISO format: YYYY-MM-DD
        const [_, year, month, day] = match;
        return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      } else {
        // Other formats
        const [_, first, second, year] = match;
        
        // Determine if it's DD/MM or MM/DD based on values
        const firstNum = parseInt(first);
        const secondNum = parseInt(second);
        
        if (format === formats[2]) {
          // MM/DD/YYYY format
          return new Date(parseInt(year), firstNum - 1, secondNum);
        } else {
          // DD/MM/YYYY format
          return new Date(parseInt(year), secondNum - 1, firstNum);
        }
      }
    }
  }
  
  // Try parsing as-is
  const date = new Date(dateStr);
  if (isValidDate(date)) {
    return date;
  }
  
  // Return invalid date
  return new Date('Invalid Date');
}

function parseAmount(amountStr: string): number {
  // Remove currency symbols and commas
  const cleanedStr = amountStr.replace(/[$£€,]/g, '').trim();
  
  // Handle negative amounts (with parentheses)
  if (cleanedStr.startsWith('(') && cleanedStr.endsWith(')')) {
    return -parseFloat(cleanedStr.substring(1, cleanedStr.length - 1));
  }
  
  return parseFloat(cleanedStr);
}

function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}