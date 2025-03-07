import { AdditionalRevenue, AdditionalRevenueCategory } from '../../types';
import { format } from 'date-fns';
import { convertToNZTimezone } from '../../services/api/utils';
import { additionalRevenueService, additionalRevenueCategoriesService } from '../../services';

// Additional Revenue operations
export async function saveAdditionalRevenue(revenue: AdditionalRevenue): Promise<number> {
  try {
    const result = await additionalRevenueService.add(revenue);
    return result.id!;
  } catch (error) {
    console.error('Error saving additional revenue:', error);
    throw error;
  }
}

export async function updateAdditionalRevenue(id: number, revenue: Partial<AdditionalRevenue>): Promise<void> {
  try {
    await additionalRevenueService.update(id, revenue);
  } catch (error) {
    console.error('Error updating additional revenue:', error);
    throw error;
  }
}

export async function deleteAdditionalRevenue(id: number): Promise<void> {
  try {
    await additionalRevenueService.delete(id);
  } catch (error) {
    console.error('Error deleting additional revenue:', error);
    throw error;
  }
}

export async function getAdditionalRevenue(startDate?: Date, endDate?: Date): Promise<AdditionalRevenue[]> {
  try {
    if (startDate && endDate) {
      return await additionalRevenueService.getRevenueByDateRange(startDate, endDate);
    } else {
      return await additionalRevenueService.getAll();
    }
  } catch (error) {
    console.error('Error getting additional revenue:', error);
    throw error;
  }
}

export async function getAdditionalRevenueWithCategories(): Promise<(AdditionalRevenue & { category: AdditionalRevenueCategory })[]> {
  try {
    return await additionalRevenueService.getRevenueWithCategories();
  } catch (error) {
    console.error('Error getting additional revenue with categories:', error);
    throw error;
  }
}

export async function getAdditionalRevenueByCategory(categoryId: number, startDate?: Date, endDate?: Date): Promise<AdditionalRevenue[]> {
  try {
    let revenues = await additionalRevenueService.getRevenueByCategory(categoryId);
    
    // Filter by date range if provided
    if (startDate && endDate) {
      revenues = revenues.filter(revenue => {
        const revenueDate = new Date(revenue.date);
        return revenueDate >= startDate && revenueDate <= endDate;
      });
    }
    
    return revenues;
  } catch (error) {
    console.error('Error getting additional revenue by category:', error);
    throw error;
  }
}

export async function getAdditionalRevenueCategories(): Promise<AdditionalRevenueCategory[]> {
  try {
    return await additionalRevenueCategoriesService.getAll();
  } catch (error) {
    console.error('Error getting additional revenue categories:', error);
    throw error;
  }
}

export async function saveAdditionalRevenueCategory(category: AdditionalRevenueCategory): Promise<number> {
  try {
    const result = await additionalRevenueCategoriesService.add(category);
    return result.id!;
  } catch (error) {
    console.error('Error saving additional revenue category:', error);
    throw error;
  }
}

export async function updateAdditionalRevenueCategory(id: number, category: Partial<AdditionalRevenueCategory>): Promise<void> {
  try {
    await additionalRevenueCategoriesService.update(id, category);
  } catch (error) {
    console.error('Error updating additional revenue category:', error);
    throw error;
  }
}

export async function deleteAdditionalRevenueCategory(id: number): Promise<void> {
  try {
    await additionalRevenueCategoriesService.delete(id);
  } catch (error) {
    console.error('Error deleting additional revenue category:', error);
    throw error;
  }
}

export async function getAdditionalRevenueByPeriod(period: 'daily' | 'weekly' | 'monthly' | 'yearly', startDate?: Date, endDate?: Date): Promise<Record<string, number>> {
  try {
    // Get revenues filtered by date range if provided
    const revenues = await getAdditionalRevenue(startDate, endDate);
    
    // Group revenues by period
    const groupedRevenues: Record<string, number> = {};
    
    for (const revenue of revenues) {
      const revenueDate = new Date(revenue.date);
      let key: string;
      
      switch (period) {
        case 'daily':
          key = format(revenueDate, 'yyyy-MM-dd');
          break;
        case 'weekly':
          key = `Week ${getWeekNumber(revenueDate)}, ${format(revenueDate, 'yyyy')}`;
          break;
        case 'monthly':
          key = format(revenueDate, 'yyyy-MM');
          break;
        case 'yearly':
          key = format(revenueDate, 'yyyy');
          break;
      }
      
      if (!groupedRevenues[key]) {
        groupedRevenues[key] = 0;
      }
      
      groupedRevenues[key] += revenue.amount;
    }
    
    return groupedRevenues;
  } catch (error) {
    console.error('Error getting additional revenue by period:', error);
    throw error;
  }
}

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
} 