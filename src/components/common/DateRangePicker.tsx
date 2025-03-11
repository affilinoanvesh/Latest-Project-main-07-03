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
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });

  // Calculate dropdown position when it opens
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const isMobile = window.innerWidth < 768;
      
      // For mobile devices, position the dropdown in the center of the screen
      if (isMobile) {
        setDropdownPosition({
          top: window.scrollY + (window.innerHeight / 2) - 200,
          right: window.innerWidth / 2 - 150
        });
      } else if (spaceBelow < 400 && spaceAbove > spaceBelow) {
        // Position above for desktop
        setDropdownPosition({
          top: window.scrollY + rect.top - 10,
          right: window.innerWidth - (window.scrollX + rect.right)
        });
      } else {
        // Position below for desktop
        setDropdownPosition({
          top: window.scrollY + rect.bottom + 10,
          right: window.innerWidth - (window.scrollX + rect.right)
        });
      }
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
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
    // NZ date format: day/month/year
    return formatNZDate(date);
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
    <div className="relative" ref={dropdownRef}>
      <div 
        ref={triggerRef}
        className="flex items-center p-2 border rounded-md cursor-pointer bg-white hover:bg-gray-50"
        onClick={toggleDropdown}
      >
        <Calendar className="h-5 w-5 mr-2 text-gray-500" />
        <span className="text-gray-700">
          {formatDateForDisplay(dateRange.startDate)} - {formatDateForDisplay(dateRange.endDate)} ({getNZTimezone()})
        </span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 ml-2 text-gray-500" />
        ) : (
          <ChevronDown className="h-4 w-4 ml-2 text-gray-500" />
        )}
      </div>
      
      {isOpen && (
        <>
          {/* Semi-transparent backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-30 z-40"
            onClick={() => setIsOpen(false)}
          />
          
          <div 
            className="fixed bg-white border rounded-md shadow-lg p-4 pt-8 z-50 md:w-80 w-[90vw] max-h-[90vh] overflow-y-auto"
            style={{
              top: `${dropdownPosition.top}px`,
              right: `${dropdownPosition.right}px`,
            }}
          >
            {/* Title and close button */}
            <div className="absolute top-0 left-0 right-0 flex justify-between items-center p-2 border-b bg-gray-50">
              <h2 className="text-sm font-medium text-gray-700">Date Range</h2>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-500 hover:text-gray-700 p-1 rounded-full hover:bg-gray-100"
                aria-label="Close date picker"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Quick Select</h3>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <button 
                  type="button"
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                  onClick={() => handleQuickSelect(7)}
                >
                  Last 7 days
                </button>
                <button 
                  type="button"
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                  onClick={() => handleQuickSelect(30)}
                >
                  Last 30 days
                </button>
                <button 
                  type="button"
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                  onClick={() => handleQuickSelect(90)}
                >
                  Last 90 days
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <button 
                  type="button"
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                  onClick={() => handleMonthSelect(3)}
                >
                  Last 3 months
                </button>
                <button 
                  type="button"
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                  onClick={() => handleMonthSelect(6)}
                >
                  Last 6 months
                </button>
                <button 
                  type="button"
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                  onClick={() => handleMonthSelect(12)}
                >
                  Last 12 months
                </button>
              </div>
            </div>
            
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Month Periods</h3>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  type="button"
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                  onClick={handleThisMonth}
                >
                  This Month
                </button>
                <button 
                  type="button"
                  className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
                  onClick={handleLastMonth}
                >
                  Last Month
                </button>
              </div>
            </div>
            
            <form onSubmit={(e) => e.preventDefault()}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="start-date">Start Date</label>
                  <input 
                    type="date" 
                    id="start-date"
                    ref={startDateInputRef}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={localStartDate}
                    onChange={handleStartDateChange}
                    onKeyDown={(e) => handleKeyDown(e, true)}
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor="end-date">End Date</label>
                  <input 
                    type="date" 
                    id="end-date"
                    ref={endDateInputRef}
                    className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={localEndDate}
                    onChange={handleEndDateChange}
                    onKeyDown={(e) => handleKeyDown(e, false)}
                  />
                </div>
              </div>
              
              <div className="mt-4 flex justify-end">
                <button 
                  type="button"
                  className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                  onClick={handleApply}
                >
                  Apply
                </button>
              </div>
            </form>
            
            <div className="mt-2 text-xs text-gray-500">
              All dates are in New Zealand timezone ({getNZTimezone()})
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DateRangePicker;