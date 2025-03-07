import React from 'react';

interface StatCardProps {
  title: React.ReactNode;
  value: string | number;
  icon: React.ReactNode;
  change?: string;
  isPositive?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, change, isPositive }) => {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-start">
        <div>
          <div className="text-sm font-medium text-gray-500">{title}</div>
          <p className="text-2xl font-bold mt-1">{value}</p>
          
          {change && (
            <div className="flex items-center mt-2">
              <span className={`text-sm font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                {change}
              </span>
            </div>
          )}
        </div>
        
        <div className="p-3 bg-indigo-100 rounded-full">
          {icon}
        </div>
      </div>
    </div>
  );
};

export default StatCard;