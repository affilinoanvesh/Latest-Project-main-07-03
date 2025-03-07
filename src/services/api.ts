// Re-export from modular API services
export * from './api/index';
export * from './api/credentials';
export * from './api/products';
export * from './api/orders';
export * from './api/inventory';
export * from './api/overhead';
export * from './api/sync';

// Export deleteOrder and syncOrdersByYear functions
export { deleteOrder, syncOrdersByYear } from './api/orders';