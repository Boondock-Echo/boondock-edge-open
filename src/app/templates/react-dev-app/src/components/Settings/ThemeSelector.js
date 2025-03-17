import React from 'react';
import { Palette } from 'lucide-react';

const ThemeSelector = ({ onThemeSelect, isDarkMode }) => {
  const themes = [
    {
      name: 'Police',
      colors: { primary: '#003087', secondary: '#1E90FF', accent: '#FFD700' },
      font: 'roboto',
      description: 'Traditional law enforcement colors'
    },
    {
      name: 'Fire Service',
      colors: { primary: '#8B0000', secondary: '#FF4500', accent: '#FFD700' },
      font: 'poppins',
      description: 'Bold firefighter-inspired tones'
    },
    {
      name: 'EMS',
      colors: { primary: '#006400', secondary: '#98FB98', accent: '#FF0000' },
      font: 'opensans',
      description: 'Emergency medical service palette'
    },
    {
      name: 'Ambulance',
      colors: { primary: '#FFFFFF', secondary: '#FF0000', accent: '#0000FF' },
      font: 'inter',
      description: 'High-visibility ambulance colors'
    },
    {
      name: 'HAM Radio',
      colors: { primary: '#2F4F4F', secondary: '#708090', accent: '#FF8C00' },
      font: 'roboto',
      description: 'Amateur radio community tones'
    },
    {
      name: 'Dispatch',
      colors: { primary: '#191970', secondary: '#4682B4', accent: '#00CED1' },
      font: 'poppins',
      description: 'Control center inspired hues'
    },
    {
      name: 'Search & Rescue',
      colors: { primary: '#FF4500', secondary: '#228B22', accent: '#FFFF00' },
      font: 'inter',
      description: 'High-visibility SAR colors'
    },
    {
      name: 'Coast Guard',
      colors: { primary: '#000080', secondary: '#FF4500', accent: '#FFFFFF' },
      font: 'opensans',
      description: 'Maritime rescue palette'
    },
    {
      name: 'Emergency Management',
      colors: { primary: '#4B0082', secondary: '#9400D3', accent: '#FFD700' },
      font: 'roboto',
      description: 'Command center aesthetics'
    },
    {
      name: 'CB Radio',
      colors: { primary: '#654321', secondary: '#DAA520', accent: '#8B4513' },
      font: 'poppins',
      description: 'Classic citizens band radio feel'
    }
  ];

  const handleThemeSelect = (theme) => {
    onThemeSelect({
      brand_colors: theme.colors,
      font: theme.font
    });
  };

  return (
    <div className="mb-8">
      <h3
        className={`text-xl font-semibold mb-6 flex items-center ${
          isDarkMode ? 'text-gray-200' : 'text-gray-800'
        }`}
      >
        <Palette className="w-6 h-6 mr-2" />
         Themes
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {themes.map((theme) => (
          <button
            key={theme.name}
            onClick={() => handleThemeSelect(theme)}
            className={`p-4 rounded-xl border shadow-sm transition-all duration-300 transform hover:scale-105 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 ${
              isDarkMode
                ? 'bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-750 focus:ring-gray-500'
                : 'bg-white border-gray-200 text-gray-800 hover:bg-gray-50 focus:ring-gray-300'
            }`}
          >
            <div className="space-y-3">
              {/* Theme Name */}
              <div className="flex items-center justify-between">
                <span className="font-medium text-sm tracking-wide">{theme.name}</span>
                <div
                  className="w-2 h-2 rounded-full animate-pulse"
                  style={{ backgroundColor: theme.colors.accent }}
                />
              </div>

              {/* Color Swatches */}
              <div className="flex space-x-2">
                <div
                  className="w-5 h-5 rounded-full border transition-transform duration-300 group-hover:scale-110"
                  style={{
                    backgroundColor: theme.colors.primary,
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                  }}
                />
                <div
                  className="w-5 h-5 rounded-full border transition-transform duration-300 group-hover:scale-110"
                  style={{
                    backgroundColor: theme.colors.secondary,
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                  }}
                />
                <div
                  className="w-5 h-5 rounded-full border transition-transform duration-300 group-hover:scale-110"
                  style={{
                    backgroundColor: theme.colors.accent,
                    borderColor: isDarkMode ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'
                  }}
                />
              </div>

              {/* Font Preview */}
              <div
                className="text-xs capitalize opacity-75 truncate"
                style={{ fontFamily: theme.font }}
              >
                {theme.font}
              </div>

              {/* Description */}
              <div
                className={`text-xs italic ${
                  isDarkMode ? 'text-gray-400' : 'text-gray-600'
                }`}
              >
                {theme.description}
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ThemeSelector;