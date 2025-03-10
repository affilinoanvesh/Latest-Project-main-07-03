import { Order } from '../../types';
import { updateLastSync } from './sync';
import { settingsService, ordersService } from '../../services';

export async function saveOrders(orders: Order[]): Promise<void> {
  try {
    await ordersService.deleteAll();
    await ordersService.bulkAdd(orders);
    await updateLastSync('orders');
  } catch (error) {
    console.error('Error saving orders:', error);
    throw error;
  }
}

export async function getOrders(): Promise<Order[]> {
  try {
    const allOrders = await ordersService.getAll();
    return allOrders;
  } catch (error) {
    console.error('Error getting orders:', error);
    return [];
  }
}