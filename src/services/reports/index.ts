import { DateRange, Order, Product, Expense, AdditionalRevenue } from '../../types';
import { fetchOrders, fetchProducts, fetchInventory, fetchOverheadCosts } from '../api';
import { getExpenses } from '../../db/operations/expenses';
import { getAdditionalRevenue } from '../../db/operations/additionalRevenue';
import { calculateProfitAndLoss } from '../pnl';
import { 
  generateSalesReport, 
  generateProductsReport, 
  generateExpensesReport, 
  generateProfitabilityReport,
  generateAdditionalRevenueReport
} from './generators';

// Load all report data
export const loadReportData = async (
  dateRange: DateRange, 
  periodType: string
) => {
  try {
    console.log('Loading report data for date range:', {
      startDate: dateRange.startDate.toISOString(),
      endDate: dateRange.endDate.toISOString(),
      periodType
    });
    
    // Fetch data
    const ordersData = await fetchOrders();
    console.log(`Fetched ${ordersData.length} orders`);
    
    const productsData = await fetchProducts();
    console.log(`Fetched ${productsData.length} products`);
    
    const inventoryData = await fetchInventory();
    console.log(`Fetched ${inventoryData.length} inventory items`);
    
    const overheadCosts = await fetchOverheadCosts();
    console.log(`Fetched ${overheadCosts.length} overhead costs`);
    
    const expensesData = await getExpenses(dateRange.startDate, dateRange.endDate);
    console.log(`Fetched ${expensesData.length} expenses for date range`);
    
    const additionalRevenueData = await getAdditionalRevenue(dateRange.startDate, dateRange.endDate);
    console.log(`Fetched ${additionalRevenueData.length} additional revenue items for date range`);
    
    // Calculate profit and margins with expenses
    const result = await calculateProfitAndLoss(
      ordersData,
      inventoryData,
      overheadCosts,
      dateRange,
      additionalRevenueData
    );
    
    // Filter orders by date range
    const filteredOrders = result.orders.filter(order => {
      const orderDate = new Date(order.date_created);
      return orderDate >= dateRange.startDate && orderDate <= dateRange.endDate;
    });
    
    console.log(`Filtered to ${filteredOrders.length} orders within date range`);
    
    // Debug order totals
    if (filteredOrders.length > 0) {
      console.log('Sample order data:', {
        firstOrder: {
          id: filteredOrders[0].id,
          date: filteredOrders[0].date_created,
          total: filteredOrders[0].total,
          parsedTotal: parseFloat(filteredOrders[0].total)
        }
      });
    }
    
    // Generate report data
    const salesData = generateSalesReport(filteredOrders, periodType);
    const productData = generateProductsReport(filteredOrders, productsData, periodType);
    const expenseData = generateExpensesReport(expensesData, periodType);
    const additionalRevenueReport = generateAdditionalRevenueReport(additionalRevenueData, periodType);
    const profitabilityData = generateProfitabilityReport(filteredOrders, expensesData, additionalRevenueData, periodType);
    
    console.log('Generated profitability data:', {
      periods: profitabilityData.length,
      samplePeriod: profitabilityData.length > 0 ? profitabilityData[0] : null
    });
    
    // Calculate totals with robust error handling
    const totalRevenue = filteredOrders.reduce((sum, order) => {
      if (!order.total) return sum;
      const orderTotal = parseFloat(order.total);
      return sum + (isNaN(orderTotal) ? 0 : orderTotal);
    }, 0);
    
    const totalAdditionalRevenue = additionalRevenueData.reduce((sum, revenue) => {
      const amount = revenue.amount || 0;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    
    const totalExpenses = expensesData.reduce((sum, expense) => {
      const amount = expense.amount || 0;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);
    
    const totalProfit = totalRevenue + totalAdditionalRevenue - totalExpenses;
    
    console.log('Final totals:', {
      totalRevenue,
      totalAdditionalRevenue,
      totalExpenses,
      totalProfit
    });
    
    return {
      orders: filteredOrders,
      products: productsData,
      expenses: expensesData,
      additionalRevenue: additionalRevenueData,
      salesData,
      productData,
      expenseData,
      additionalRevenueReport,
      profitabilityData,
      totalRevenue,
      totalAdditionalRevenue,
      totalExpenses,
      totalProfit
    };
  } catch (error) {
    console.error('Error loading report data:', error);
    throw error;
  }
};

// Export all report generators
export * from './generators';
export * from './utils';