import React from 'react';
import { Calendar } from 'lucide-react';
import { format } from 'date-fns';

interface DateSelectorProps {
  date: Date;
  setDate: (date: Date) => void;
}

const DateSelector: React.FC<DateSelectorProps> = ({ date, setDate }) => {
  return (
    <div className="mb-4">
      <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
        Date
      </label>
      <div className="relative">
        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
          <Calendar size={16} className="text-gray-500" />
        </div>
        <input
          type="date"
          id="date"
          value={format(date, 'yyyy-MM-dd')}
          onChange={(e) => setDate(new Date(e.target.value))}
          className="border rounded-lg p-2 pl-10 w-full focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 transition-all"
        />
      </div>
      <p className="text-xs text-gray-500 mt-1 ml-1">
        Date when this adjustment was made
      </p>
    </div>
  );
};

export default DateSelector; 