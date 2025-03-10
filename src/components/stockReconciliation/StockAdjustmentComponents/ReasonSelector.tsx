import React from 'react';
import { AlertTriangle, Trash2, RotateCcw, Zap, HelpCircle } from 'lucide-react';

// Import the MovementReason type from the types file
import { MovementReason } from '../../../types';

interface ReasonSelectorProps {
  reason: MovementReason;
  setReason: (reason: MovementReason) => void;
}

const ReasonSelector: React.FC<ReasonSelectorProps> = ({ reason, setReason }) => {
  // Define reason options with icons and descriptions
  const reasonOptions = [
    {
      value: 'expiry' as MovementReason,
      label: 'Expiry',
      icon: <AlertTriangle size={16} className="text-amber-500" />,
      description: 'Product has expired and needs to be removed from inventory'
    },
    {
      value: 'damage' as MovementReason,
      label: 'Damage',
      icon: <Trash2 size={16} className="text-red-500" />,
      description: 'Product was damaged and cannot be sold'
    },
    {
      value: 'theft' as MovementReason,
      label: 'Theft',
      icon: <Zap size={16} className="text-purple-500" />,
      description: 'Product was stolen or is missing'
    },
    {
      value: 'correction' as MovementReason,
      label: 'Correction',
      icon: <RotateCcw size={16} className="text-blue-500" />,
      description: 'Correcting inventory count discrepancy'
    },
    {
      value: 'other' as MovementReason,
      label: 'Other',
      icon: <HelpCircle size={16} className="text-gray-500" />,
      description: 'Other reason not listed above'
    }
  ];

  return (
    <div className="mb-4">
      <label htmlFor="reason" className="block text-sm font-medium text-gray-700 mb-1">
        Reason
      </label>
      <div className="grid grid-cols-1 gap-2">
        {reasonOptions.map((option) => (
          <div
            key={option.value}
            onClick={() => setReason(option.value)}
            className={`
              flex items-center p-3 border rounded-lg cursor-pointer transition-all
              ${reason === option.value 
                ? 'border-blue-500 bg-blue-50 shadow-sm' 
                : 'border-gray-200 hover:border-blue-200 hover:bg-blue-50/30'}
            `}
          >
            <div className={`
              flex items-center justify-center w-6 h-6 rounded-full mr-3
              ${reason === option.value ? 'bg-blue-100' : 'bg-gray-100'}
            `}>
              {option.icon}
            </div>
            <div className="flex-grow">
              <div className="font-medium">{option.label}</div>
              <div className="text-xs text-gray-500">{option.description}</div>
            </div>
            <div className="flex items-center justify-center w-5 h-5">
              <div className={`
                w-4 h-4 rounded-full border-2 flex items-center justify-center
                ${reason === option.value 
                  ? 'border-blue-500' 
                  : 'border-gray-300'}
              `}>
                {reason === option.value && (
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ReasonSelector; 