// Main API service entry point
import { ApiCredentials, Order, Product, InventoryItem } from '../../types';

// Re-export all API services
export * from './credentials';
export * from './products';
export * from './orders';
export * from './inventory';
export * from './overhead';
export * from './sync';
export * from './utils';

// Export testApiCredentials from credentials
export { testApiCredentials } from './credentials';

// Export order-related functions
export { 
  deleteOrder, 
  syncOrdersByYear, 
  syncOrdersByMonth,
  syncOrdersByDateRange,
  forceDecemberSync,
  processOrdersWithVariations
} from './orders';