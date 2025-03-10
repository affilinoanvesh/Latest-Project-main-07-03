import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  srLabel?: string;
  disabled?: boolean;
}

export const Switch: React.FC<SwitchProps> = ({
  checked,
  onChange,
  label,
  srLabel,
  disabled = false
}) => {
  return (
    <label className="inline-flex items-center cursor-pointer">
      {label && <span className="mr-3 text-sm font-medium text-gray-700">{label}</span>}
      <div className="relative">
        <input
          type="checkbox"
          className="sr-only peer"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          aria-label={srLabel}
        />
        <div
          className={`w-11 h-6 rounded-full peer ${
            disabled
              ? 'bg-gray-200'
              : 'bg-gray-200 peer-checked:bg-blue-600'
          } peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600`}
        ></div>
      </div>
    </label>
  );
}; 