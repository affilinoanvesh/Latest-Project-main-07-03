import { Expense, ExpenseCategory, ExpenseImport } from '../types';
import { SupabaseService } from './supabaseService';
import { supabase } from './supabase';

/**
 * Expenses service for Supabase
 */
export class ExpensesService extends SupabaseService<Expense> {
  constructor() {
    super('expenses');
  }

  /**
   * Get expenses by category
   */
  async getExpensesByCategory(category: string): Promise<Expense[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('category', category);

    if (error) {
      console.error('Error fetching expenses by category:', error);
      throw error;
    }

    return data as Expense[];
  }

  /**
   * Get expenses by period
   */
  async getExpensesByPeriod(period: string): Promise<Expense[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('period', period);

    if (error) {
      console.error('Error fetching expenses by period:', error);
      throw error;
    }

    return data as Expense[];
  }

  /**
   * Get expenses by date range
   */
  async getExpensesByDateRange(startDate: Date, endDate: Date): Promise<Expense[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString());

    if (error) {
      console.error('Error fetching expenses by date range:', error);
      throw error;
    }

    return data as Expense[];
  }
}

/**
 * Expense categories service for Supabase
 */
export class ExpenseCategoriesService extends SupabaseService<ExpenseCategory> {
  constructor() {
    super('expense_categories');
  }

  /**
   * Get a category by name
   */
  async getCategoryByName(name: string): Promise<ExpenseCategory | null> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('name', name)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Record not found
        return null;
      }
      console.error('Error fetching expense category by name:', error);
      throw error;
    }

    return data as ExpenseCategory;
  }
}

/**
 * Expense imports service for Supabase
 */
export class ExpenseImportsService extends SupabaseService<ExpenseImport> {
  constructor() {
    super('expense_imports');
  }

  /**
   * Get imports by date range
   */
  async getImportsByDateRange(startDate: Date, endDate: Date): Promise<ExpenseImport[]> {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .gte('date', startDate.toISOString())
      .lte('date', endDate.toISOString());

    if (error) {
      console.error('Error fetching expense imports by date range:', error);
      throw error;
    }

    return data as ExpenseImport[];
  }
}

// Export instances of the services
export const expensesService = new ExpensesService();
export const expenseCategoriesService = new ExpenseCategoriesService();
export const expenseImportsService = new ExpenseImportsService(); 