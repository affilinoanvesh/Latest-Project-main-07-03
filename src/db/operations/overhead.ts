import { db } from '../schema';
import { OverheadCost } from '../../types';

export async function saveOverheadCosts(costs: OverheadCost[]): Promise<void> {
  try {
    await db.transaction('rw', db.overheadCosts, async () => {
      await db.overheadCosts.clear();
      await db.overheadCosts.bulkAdd(costs);
    });
  } catch (error) {
    console.error('Error saving overhead costs:', error);
    throw error;
  }
}

export async function getOverheadCosts(): Promise<OverheadCost[]> {
  try {
    // Ensure the database is initialized before accessing
    await db.initializeDatabase();
    return await db.overheadCosts.toArray();
  } catch (error) {
    console.error('Error getting overhead costs:', error);
    return [];
  }
}