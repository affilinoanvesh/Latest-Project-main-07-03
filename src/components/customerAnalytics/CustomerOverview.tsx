import React, { ReactNode } from 'react';

interface CustomerOverviewProps {
  icon: ReactNode;
  title: string;
  value: number;
  color: 'indigo' | 'emerald' | 'blue' | 'amber' | 'rose';
}

const colorClasses = {
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200'
};

const CustomerOverview: React.FC<CustomerOverviewProps> = ({ icon, title, value, color }) => {
  return (
    <div className={`rounded-lg border p-4 ${colorClasses[color]} bg-opacity-50`}>
      <div className="flex items-center mb-2">
        {icon}
        <h3 className="ml-2 text-sm font-medium">{title}</h3>
      </div>
      <div className="text-2xl font-bold">{value.toLocaleString()}</div>
    </div>
  );
};

export default CustomerOverview; 