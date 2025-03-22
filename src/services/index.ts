// Export the Supabase client
export { supabase, supabaseAdmin } from './supabase';

// Export all services
export { productsService, productVariationsService } from './productsService';
export { ordersService } from './ordersService';
export { inventoryService } from './inventoryService';
export { expensesService, expenseCategoriesService, expenseImportsService } from './expensesService';
export { credentialsService } from './credentialsService';
export { syncService } from './syncService';
export { suppliersService, supplierImportsService, supplierImportItemsService } from './supplierService';
export { productExpiryService } from './expiryService';
export { purchaseOrdersService, purchaseOrderItemsService } from './purchaseOrdersService';
export { additionalRevenueService, additionalRevenueCategoriesService } from './additionalRevenueService';
export { overheadCostsService } from './overheadService';
export { settingsService } from './settingsService';
export { customersService } from './customerService';

// Export the base service class
export { SupabaseService } from './supabaseService';

// Export the new modular customer services
export * from './customer';
