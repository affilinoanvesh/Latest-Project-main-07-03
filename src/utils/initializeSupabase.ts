import * as services from '../services';

/**
 * Initialize Supabase with default data (no migration)
 */
export async function initializeSupabase(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('Initializing Supabase...');

    // Initialize default expense categories
    const defaultExpenseCategories = [
      { name: 'Rent', description: 'Office or workspace rent', color: '#4f46e5', is_tax_deductible: true },
      { name: 'Utilities', description: 'Electricity, water, internet, etc.', color: '#0ea5e9', is_tax_deductible: true },
      { name: 'Salaries', description: 'Employee salaries and wages', color: '#10b981', is_tax_deductible: true },
      { name: 'Marketing', description: 'Advertising and marketing expenses', color: '#f59e0b', is_tax_deductible: true },
      { name: 'Software', description: 'Software subscriptions and licenses', color: '#8b5cf6', is_tax_deductible: true },
      { name: 'Office Supplies', description: 'Office supplies and equipment', color: '#ec4899', is_tax_deductible: true },
      { name: 'Travel', description: 'Business travel expenses', color: '#f43f5e', is_tax_deductible: true },
      { name: 'Shipping', description: 'Shipping and postage costs', color: '#6366f1', is_tax_deductible: true },
      { name: 'Insurance', description: 'Business insurance premiums', color: '#14b8a6', is_tax_deductible: true },
      { name: 'Other', description: 'Miscellaneous expenses', color: '#64748b', is_tax_deductible: false }
    ];

    // Initialize default additional revenue categories
    const defaultRevenueCategories = [
      { name: 'Offline Sales', description: 'Sales made offline or in-person', color: '#4f46e5', is_taxable: true },
      { name: 'GST Returns', description: 'GST tax returns', color: '#0ea5e9', is_taxable: false },
      { name: 'Refunds', description: 'Refunds from suppliers or services', color: '#10b981', is_taxable: false },
      { name: 'Grants', description: 'Business grants or subsidies', color: '#f59e0b', is_taxable: true },
      { name: 'Investments', description: 'Investment returns', color: '#8b5cf6', is_taxable: true },
      { name: 'Other', description: 'Other revenue sources', color: '#64748b', is_taxable: true }
    ];

    // Check if expense categories already exist
    const existingExpenseCategories = await services.expenseCategoriesService.getAll();
    if (existingExpenseCategories.length === 0) {
      console.log('Adding default expense categories...');
      await services.expenseCategoriesService.bulkAdd(defaultExpenseCategories);
    }

    // Check if revenue categories already exist
    const existingRevenueCategories = await services.additionalRevenueCategoriesService.getAll();
    if (existingRevenueCategories.length === 0) {
      console.log('Adding default additional revenue categories...');
      await services.additionalRevenueCategoriesService.bulkAdd(defaultRevenueCategories);
    }

    // Set a flag in localStorage to indicate Supabase is initialized
    localStorage.setItem('supabase_initialized', 'true');
    
    console.log('Supabase initialization completed successfully!');
    return { success: true, message: 'Supabase initialization completed successfully!' };
  } catch (error) {
    console.error('Error during Supabase initialization:', error);
    return { 
      success: false, 
      message: `Supabase initialization failed: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
} 