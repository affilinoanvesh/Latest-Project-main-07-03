import React, { useState, useEffect } from 'react';
import { customersService } from '../../services/customerService';
import { Customer } from '../../types';
import CustomerSegmentList from './CustomerSegmentList';
import RFMSegmentList from './RFMSegmentList';
import { supabase } from '../../services/supabase';

// The UI component for displaying customer analytics data
const CustomerAnalyticsData: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [customersBySegment, setCustomersBySegment] = useState<Record<string, Customer[]>>({});
  const [runningRFM, setRunningRFM] = useState<boolean>(false);
  const [rfmSuccess, setRfmSuccess] = useState<boolean | null>(null);
  const [fixingZeroOrderCustomers, setFixingZeroOrderCustomers] = useState<boolean>(false);
  
  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const analyticsData = await customersService.getCustomerAnalytics();
        setCustomersBySegment(analyticsData.customersBySegment || {});
      } catch (err) {
        console.error('Error loading customer analytics data:', err);
        setError('Failed to load customer analytics data');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);
  
  // Handle running RFM analysis
  const handleRunRFMAnalysis = async () => {
    try {
      setRunningRFM(true);
      setRfmSuccess(null);
      
      // First calculate RFM scores
      await customersService.calculateRFMScores();
      
      // Then update customer segments
      await customersService.updateCustomerSegments();
      
      // Reload data
      const analyticsData = await customersService.getCustomerAnalytics();
      setCustomersBySegment(analyticsData.customersBySegment || {});
      
      setRfmSuccess(true);
    } catch (err) {
      console.error('Error running RFM analysis:', err);
      setRfmSuccess(false);
    } finally {
      setRunningRFM(false);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setRfmSuccess(null);
      }, 5000);
    }
  };

  // Handle fixing zero-order customers that are incorrectly categorized as "new"
  const handleFixZeroOrderCustomers = async () => {
    try {
      setFixingZeroOrderCustomers(true);
      
      // Use the service method to update all zero-order customers
      await customersService.forceUpdateZeroOrderCustomers();
      
      // Reload data to see changes
      const analyticsData = await customersService.getCustomerAnalytics();
      setCustomersBySegment(analyticsData.customersBySegment || {});
      
      // Show success alert
      setRfmSuccess(true);
      
    } catch (err) {
      console.error('Error fixing zero-order customers:', err);
      setRfmSuccess(false);
    } finally {
      setFixingZeroOrderCustomers(false);
      
      // Clear success message after 5 seconds
      setTimeout(() => {
        setRfmSuccess(null);
      }, 5000);
    }
  };
  
  // Default segment colors
  const segmentColors: Record<string, string> = {
    'new': '#4f46e5',      // Indigo
    'active': '#10b981',   // Emerald
    'at-risk': '#f59e0b',  // Amber
    'lost': '#ef4444',     // Red
    'loyal': '#8b5cf6'     // Purple
  };
  
  // Human-readable segment labels
  const segmentLabels: Record<string, string> = {
    'new': 'New Customers',
    'active': 'Active Customers',
    'at-risk': 'At-Risk Customers',
    'lost': 'Lost Customers',
    'loyal': 'Loyal Customers'
  };
  
  if (loading) {
    return (
      <div className="py-12 flex justify-center items-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="py-8">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      </div>
    );
  }
  
  return (
    <div className="p-5">
      <div className="flex flex-col md:flex-row justify-between mb-6 items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-gray-800">Customer Analytics</h2>
          <p className="text-gray-600">Analyze your customer base with RFM segmentation</p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={handleFixZeroOrderCustomers}
            disabled={fixingZeroOrderCustomers}
            className="px-4 py-2 bg-amber-600 text-white rounded-md hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {fixingZeroOrderCustomers ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Fixing Zero-Order Customers...
              </>
            ) : (
              'Fix Zero-Order Customers'
            )}
          </button>
          
          <button
            onClick={handleRunRFMAnalysis}
            disabled={runningRFM}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {runningRFM ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Running RFM Analysis...
              </>
            ) : (
              'Run RFM Analysis'
            )}
          </button>
        </div>
      </div>
      
      {rfmSuccess !== null && (
        <div className={`mb-6 rounded-md px-4 py-3 ${rfmSuccess ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          {rfmSuccess 
            ? 'Operation completed successfully! Customer segments have been updated.' 
            : 'Failed to update customer segments. Please try again or check the console for errors.'}
        </div>
      )}
      
      {/* Customer Tables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <CustomerSegmentList 
          customersBySegment={customersBySegment} 
          segmentColors={segmentColors}
          segmentLabels={segmentLabels}
        />
      </div>
      
      {/* RFM Segment List */}
      <div className="mb-6">
        <RFMSegmentList segmentColors={segmentColors} />
      </div>
    </div>
  );
};

export default CustomerAnalyticsData; 