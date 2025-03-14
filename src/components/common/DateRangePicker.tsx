import React, { useState, useRef, useEffect } from 'react';
import { format, subDays, subMonths, startOfMonth, endOfMonth, isValid } from 'date-fns';
import { DateRange } from '../../types';
import { Calendar, ChevronDown, ChevronUp, X } from 'lucide-react';
import { formatNZDate, getNZTimezone } from '../../services/api/utils';

interface DateRangePickerProps {
  dateRange: DateRange;
  onChange: (dateRange: DateRange) => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({ dateRange, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [localStartDate, setLocalStartDate] = useState<string>(format(dateRange.startDate, 'yyyy-MM-dd'));
  const [localEndDate, setLocalEndDate] = useState<string>(format(dateRange.endDate, 'yyyy-MM-dd'));
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const startDateInputRef = useRef<HTMLInputElement>(null);
  const endDateInputRef = useRef<HTMLInputElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
          triggerRef.current && !triggerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Update local state when props change
  useEffect(() => {
    setLocalStartDate(format(dateRange.startDate, 'yyyy-MM-dd'));
    setLocalEndDate(format(dateRange.endDate, 'yyyy-MM-dd'));
  }, [dateRange]);

  const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault(); // Prevent default form submission
    const newDate = e.target.value;
    setLocalStartDate(newDate);
    
    // Don't immediately update parent state - wait for Apply button
  };

  const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault(); // Prevent default form submission
    const newDate = e.target.value;
    setLocalEndDate(newDate);
    
    // Don't immediately update parent state - wait for Apply button
  };

  // Handle keyboard navigation in date inputs
  const handleKeyDown = (e: React.KeyboardEvent, isStartDate: boolean) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // Prevent form submission
      handleApply();
    } else if (e.key === 'Escape') {
      e.preventDefault(); // Prevent default behavior
      setIsOpen(false);
    } else if (e.key === 'Tab') {
      if (isStartDate && !e.shiftKey) {
        e.preventDefault();
        endDateInputRef.current?.focus();
      } else if (!isStartDate && e.shiftKey) {
        e.preventDefault();
        startDateInputRef.current?.focus();
      }
    }
  };

  // Format date for display in NZ format (dd/MM/yyyy)
  const formatDateForDisplay = (date: Date) => {
    return format(date, 'dd/MM/yyyy');
  };

  const handleQuickSelect = (days: number) => {
    const endDate = new Date();
    const startDate = subDays(endDate, days);
    
    setLocalStartDate(format(startDate, 'yyyy-MM-dd'));
    setLocalEndDate(format(endDate, 'yyyy-MM-dd'));
    
    onChange({
      startDate,
      endDate
    });
    
    setIsOpen(false);
  };

  const handleMonthSelect = (months: number) => {
    const endDate = new Date();
    const startDate = subMonths(endDate, months);
    
    setLocalStartDate(format(startDate, 'yyyy-MM-dd'));
    setLocalEndDate(format(endDate, 'yyyy-MM-dd'));
    
    onChange({
      startDate,
      endDate
    });
    
    setIsOpen(false);
  };

  const handleThisMonth = () => {
    const now = new Date();
    const startDate = startOfMonth(now);
    const endDate = endOfMonth(now);
    
    setLocalStartDate(format(startDate, 'yyyy-MM-dd'));
    setLocalEndDate(format(endDate, 'yyyy-MM-dd'));
    
    onChange({
      startDate,
      endDate
    });
    
    setIsOpen(false);
  };

  const handleLastMonth = () => {
    const now = new Date();
    const lastMonth = subMonths(now, 1);
    const startDate = startOfMonth(lastMonth);
    const endDate = endOfMonth(lastMonth);
    
    setLocalStartDate(format(startDate, 'yyyy-MM-dd'));
    setLocalEndDate(format(endDate, 'yyyy-MM-dd'));
    
    onChange({
      startDate,
      endDate
    });
    
    setIsOpen(false);
  };

  const handleApply = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault(); // Prevent form submission
    }
    
    try {
      // Validate dates before applying
      const startDate = new Date(localStartDate);
      const endDate = new Date(localEndDate);
      
      if (isValid(startDate) && isValid(endDate)) {
        // Ensure end date is not before start date
        if (endDate < startDate) {
          // If end date is before start date, set end date to start date
          onChange({
            startDate,
            endDate: startDate
          });
        } else {
          onChange({
            startDate,
            endDate
          });
        }
      }
      
      setIsOpen(false);
    } catch (error) {
      console.error("Error applying date range:", error);
    }
  };

  const toggleDropdown = (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent form submission
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative" ref={triggerRef}>
      <div 
        className="flex items-center justify-between w-full px-4 py-2 text-left bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 cursor-pointer"
        onClick={toggleDropdown}
      >
        <div className="flex items-center">
          <Calendar className="h-5 w-5 text-gray-500 mr-2" />
          <span className="text-sm font-medium">
            {formatDateForDisplay(dateRange.startDate)} - {formatDateForDisplay(dateRange.endDate)} (NZDT)
          </span>
        </div>
        <ChevronDown className="h-4 w-4 text-gray-500" />
      </div>

      {isOpen && (
        <div 
          ref={dropdownRef}
          className="absolute z-50 mt-2 bg-white rounded-md shadow-lg p-4 border border-gray-200 left-0 right-0"
          style={{ width: '360px' }}
        >
          <div className="flex justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-700">Select Date Range</h3>
            <button 
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
              <input
                ref={startDateInputRef}
                type="date"
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                value={localStartDate}
                onChange={handleStartDateChange}
                onKeyDown={(e) => handleKeyDown(e, true)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
              <input
                ref={endDateInputRef}
                type="date"
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
                value={localEndDate}
                onChange={handleEndDateChange}
                onKeyDown={(e) => handleKeyDown(e, false)}
              />
            </div>
          </div>
          
          <div className="mb-4">
            <h4 className="text-xs font-medium text-gray-700 mb-2">Quick Select</h4>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => handleQuickSelect(7)}
                className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700"
              >
                Last 7 days
              </button>
              <button
                onClick={() => handleQuickSelect(30)}
                className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700"
              >
                Last 30 days
              </button>
              <button
                onClick={() => handleMonthSelect(3)}
                className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700"
              >
                Last 3 months
              </button>
              <button
                onClick={() => handleMonthSelect(6)}
                className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700"
              >
                Last 6 months
              </button>
              <button
                onClick={handleThisMonth}
                className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700"
              >
                This month
              </button>
              <button
                onClick={handleLastMonth}
                className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700"
              >
                Last month
              </button>
            </div>
          </div>
          
          <div className="flex justify-end">
            <button
              onClick={handleApply}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;