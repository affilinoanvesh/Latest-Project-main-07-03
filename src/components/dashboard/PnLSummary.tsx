import React from 'react';
import { 
  ArrowUpRight, ArrowDownRight, DollarSign, TrendingUp, 
  ShoppingCart, Percent, BarChart2, ArrowRight, 
  PieChart, Wallet, CreditCard, ShoppingBag
} from 'lucide-react';

interface PnLSummaryProps {
  summary: {
    totalRevenue: number;
    totalCost: number;
    totalProfit: number;
    totalExpenses: number;
    netProfit: number;
    averageMargin: number;
    orderCount: number;
    itemCount: number;
    expensesByCategory?: Record<string, number>;
  };
  previousPeriod?: {
    totalRevenue: number;
    totalProfit: number;
    netProfit: number;
  };
  periodLabel: string;
}

const PnLSummary: React.FC<PnLSummaryProps> = ({ 
  summary, 
  previousPeriod,
  periodLabel
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const calculateChange = (current: number, previous: number) => {
    if (!previous) return null;
    return ((current - previous) / previous) * 100;
  };

  const renderChangeIndicator = (change: number | null) => {
    if (change === null) return null;
    
    const isPositive = change >= 0;
    return (
      <div className={`flex items-center ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
        {isPositive ? <ArrowUpRight className="h-4 w-4 mr-1" /> : <ArrowDownRight className="h-4 w-4 mr-1" />}
        <span className="text-sm font-medium">{Math.abs(change).toFixed(1)}%</span>
      </div>
    );
  };

  // Calculate profit margin percentage
  const profitMargin = summary.totalRevenue > 0 
    ? (summary.totalProfit / summary.totalRevenue) * 100 
    : 0;
  
  // Calculate net profit margin percentage
  const netProfitMargin = summary.totalRevenue > 0 
    ? (summary.netProfit / summary.totalRevenue) * 100 
    : 0;

  // Calculate changes if previous period data is available
  const revenueChange = previousPeriod 
    ? calculateChange(summary.totalRevenue, previousPeriod.totalRevenue) 
    : null;
  
  const profitChange = previousPeriod 
    ? calculateChange(summary.totalProfit, previousPeriod.totalProfit) 
    : null;
  
  const netProfitChange = previousPeriod 
    ? calculateChange(summary.netProfit, previousPeriod.netProfit) 
    : null;

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 flex items-center">
          <PieChart className="h-5 w-5 mr-2 text-blue-600" />
          Profit & Loss Summary
        </h2>
        <p className="text-sm text-gray-500 mt-1">{periodLabel}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-gray-200">
        {/* Revenue Section */}
        <div className="p-6 bg-blue-50/50">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4 flex items-center">
            <Wallet className="h-4 w-4 mr-2 text-blue-500" />
            Revenue
          </h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-600">Total Revenue</span>
                {revenueChange !== null && renderChangeIndicator(revenueChange)}
              </div>
              <div className="text-2xl font-bold text-blue-600">{formatCurrency(summary.totalRevenue)}</div>
              <div className="text-xs text-gray-500 mt-1">From {summary.orderCount} orders</div>
            </div>
            
            <div className="pt-3 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Average Order Value</span>
              </div>
              <div className="text-xl font-semibold text-blue-600">
                {formatCurrency(summary.orderCount ? summary.totalRevenue / summary.orderCount : 0)}
              </div>
              <div className="text-xs text-gray-500 mt-1">{summary.itemCount} items sold</div>
            </div>
          </div>
        </div>
        
        {/* Costs Section */}
        <div className="p-6 bg-red-50/50">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4 flex items-center">
            <CreditCard className="h-4 w-4 mr-2 text-red-500" />
            Costs
          </h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-600">Cost of Goods</span>
              </div>
              <div className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalCost)}</div>
              <div className="text-xs text-gray-500 mt-1">
                {formatPercentage(summary.totalRevenue > 0 ? (summary.totalCost / summary.totalRevenue) * 100 : 0)} of revenue
              </div>
            </div>
            
            <div className="pt-3 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-600">Expenses</span>
              </div>
              <div className="text-xl font-semibold text-red-600">{formatCurrency(summary.totalExpenses)}</div>
              <div className="text-xs text-gray-500 mt-1">
                {formatPercentage(summary.totalRevenue > 0 ? (summary.totalExpenses / summary.totalRevenue) * 100 : 0)} of revenue
              </div>
            </div>
          </div>
        </div>
        
        {/* Profit Section */}
        <div className="p-6 bg-green-50/50">
          <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-4 flex items-center">
            <TrendingUp className="h-4 w-4 mr-2 text-green-500" />
            Profit
          </h3>
          
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-600">Gross Profit</span>
                {profitChange !== null && renderChangeIndicator(profitChange)}
              </div>
              <div className="flex items-center">
                <div className={`text-2xl font-bold ${summary.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(summary.totalProfit)}
                </div>
                <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full ${
                  summary.totalProfit >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {summary.totalProfit >= 0 ? 'Profit' : 'Loss'}
                </span>
              </div>
              
              {/* Profit margin progress bar */}
              <div className="mt-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-gray-500">Margin: {formatPercentage(profitMargin)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`${summary.totalProfit >= 0 ? 'bg-green-500' : 'bg-red-500'} h-2 rounded-full`} 
                    style={{ width: `${Math.min(Math.abs(profitMargin), 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
            
            <div className="pt-3 border-t border-gray-100">
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm font-medium text-gray-600">Net Profit</span>
                {netProfitChange !== null && renderChangeIndicator(netProfitChange)}
              </div>
              <div className="flex items-center">
                <div className={`text-2xl font-bold ${summary.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(summary.netProfit)}
                </div>
                <span className={`ml-2 px-2 py-0.5 text-xs font-medium rounded-full ${
                  summary.netProfit >= 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {summary.netProfit >= 0 ? 'Profit' : 'Loss'}
                </span>
              </div>
              
              {/* Net profit margin progress bar */}
              <div className="mt-2">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-medium text-gray-500">Margin: {formatPercentage(netProfitMargin)}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`${summary.netProfit >= 0 ? 'bg-green-500' : 'bg-red-500'} h-2 rounded-full`}
                    style={{ width: `${Math.min(Math.abs(netProfitMargin), 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Key Metrics Footer */}
      <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-gray-200 border-t border-gray-200 bg-gray-50">
        <div className="p-4 text-center">
          <div className="text-sm font-medium text-gray-500 mb-1 flex items-center justify-center">
            <ShoppingCart className="h-4 w-4 mr-1 text-blue-500" />
            Orders
          </div>
          <div className="text-xl font-bold text-gray-800">{summary.orderCount}</div>
        </div>
        
        <div className="p-4 text-center">
          <div className="text-sm font-medium text-gray-500 mb-1 flex items-center justify-center">
            <ShoppingBag className="h-4 w-4 mr-1 text-blue-500" />
            Items Sold
          </div>
          <div className="text-xl font-bold text-gray-800">{summary.itemCount}</div>
        </div>
        
        <div className="p-4 text-center">
          <div className="text-sm font-medium text-gray-500 mb-1 flex items-center justify-center">
            <BarChart2 className="h-4 w-4 mr-1 text-green-500" />
            Avg. Margin
          </div>
          <div className="text-xl font-bold text-gray-800">{formatPercentage(summary.averageMargin)}</div>
        </div>
        
        <div className="p-4 text-center">
          <div className="text-sm font-medium text-gray-500 mb-1 flex items-center justify-center">
            <DollarSign className="h-4 w-4 mr-1 text-blue-500" />
            Avg. Order Value
          </div>
          <div className="text-xl font-bold text-gray-800">
            {formatCurrency(summary.orderCount ? summary.totalRevenue / summary.orderCount : 0)}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PnLSummary; 