import { OverheadCost } from '../../types';
import { overheadCostsService } from '../../services';
import { formatErrorMessage } from '../../utils/errorHandling';

// Fetch overhead costs from Supabase
export const fetchOverheadCosts = async (): Promise<OverheadCost[]> => {
  try {
    return await overheadCostsService.getAll();
  } catch (error) {
    console.error('Error fetching overhead costs:', error);
    throw error;
  }
};

// Save overhead costs to Supabase
export const saveOverheadCosts = async (costs: OverheadCost[]): Promise<void> => {
  try {
    // Delete existing overhead costs
    await overheadCostsService.deleteAll();
    
    // Add new overhead costs
    if (costs.length > 0) {
      await overheadCostsService.bulkAdd(costs);
    }
  } catch (error) {
    console.error('Error saving overhead costs:', error);
    throw error; // Re-throw the error to be handled by the caller
  }
};