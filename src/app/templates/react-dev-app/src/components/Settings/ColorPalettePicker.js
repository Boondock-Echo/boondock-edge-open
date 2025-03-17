import React, { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';

const ColorPalettePicker = ({ 
  label, 
  color, 
  onChange, 
  isDarkMode = false 
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const presetColors = [
    { name: 'Red', value: '#ef4444' },
    { name: 'Orange', value: '#f97316' },
    { name: 'Amber', value: '#f59e0b' },
    { name: 'Yellow', value: '#eab308' },
    { name: 'Lime', value: '#84cc16' },
    { name: 'Green', value: '#22c55e' },
    { name: 'Emerald', value: '#10b981' },
    { name: 'Teal', value: '#14b8a6' },
    { name: 'Cyan', value: '#06b6d4' },
    { name: 'Sky', value: '#0ea5e9' },
    { name: 'Blue', value: '#3b82f6' },
    { name: 'Indigo', value: '#6366f1' },
    { name: 'Violet', value: '#8b5cf6' },
    { name: 'Purple', value: '#a855f7' },
    { name: 'Fuchsia', value: '#d946ef' },
    { name: 'Pink', value: '#ec4899' },
    { name: 'Rose', value: '#f43f5e' },
    { name: 'Gray', value: '#6b7280' }
  ];

  return (
    <div className="space-y-2">
      <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
        {label}
      </label>
      
      <div className="relative">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all duration-200 ${
              isDarkMode 
                ? 'bg-gray-700 border-gray-600 text-white hover:bg-gray-600' 
                : 'bg-white border-gray-300 text-gray-900 hover:bg-gray-50'
            }`}
          >
            <div 
              className="w-6 h-6 rounded-md border border-gray-300"
              style={{ backgroundColor: color }}
            />
            <span className="text-sm">{color}</span>
            <ChevronDown className="w-4 h-4" />
          </button>
          
          <input
            type="color"
            value={color}
            onChange={(e) => onChange(e.target.value)}
            className="w-10 h-10 rounded cursor-pointer"
          />
        </div>

        {isOpen && (
          <div className={`absolute z-10 mt-2 p-3 rounded-lg shadow-lg border ${
            isDarkMode 
              ? 'bg-gray-800 border-gray-700' 
              : 'bg-white border-gray-200'
          }`}>
            <div className="grid grid-cols-6 gap-2 mb-3">
              {presetColors.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => {
                    onChange(preset.value);
                    setIsOpen(false);
                  }}
                  className="relative w-8 h-8 rounded-md group"
                  style={{ backgroundColor: preset.value }}
                >
                  {color === preset.value && (
                    <Check className="absolute inset-0 m-auto w-4 h-4 text-white drop-shadow-md" />
                  )}
                  <span className="sr-only">{preset.name}</span>
                  <div className="absolute inset-0 rounded-md ring-2 ring-transparent group-hover:ring-white/50" />
                </button>
              ))}
            </div>
            
            <input
              type="text"
              value={color}
              onChange={(e) => onChange(e.target.value)}
              className={`w-full px-3 py-1 text-sm rounded-lg border transition-all duration-200 ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-white' 
                  : 'bg-white border-gray-300 text-gray-900'
              }`}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default ColorPalettePicker;