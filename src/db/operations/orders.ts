import { db } from '../schema';
import { Order } from '../../types';
import { updateLastSync } from './sync';

export async function saveOrders(orders: Order[]): Promise<void> {
  try {
    await db.transaction('rw', db.orders, async () => {
      await db.orders.clear();
      await db.orders.bulkAdd(orders);
    });
    await updateLastSync('orders');
  } catch (error) {
    console.error('Error saving orders:', error);
    throw error;
  }
}

export async function getOrders(): Promise<Order[]> {
  try {
    // Ensure the database is initialized before accessing
    await db.initializeDatabase();
    return await db.orders.toArray();
  } catch (error) {
    console.error('Error getting orders:', error);
    return [];
  }
}