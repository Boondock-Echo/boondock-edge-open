import React, { useEffect } from 'react';
import {
  RadioTower,
  X,
  Volume2,
  User2,
  Tag,
  ActivitySquare,
  Languages,
  Palette,
  Network,
  Sliders
} from 'lucide-react';
import ColorPalettePicker from './ColorPalettePicker';

const LANGUAGES = [
  "english", "spanish", "french", "german", "italian",
  "portuguese", "chinese", "japanese", "korean", "arabic"
];

const ChannelEditModal = ({
  editingChannel,
  tempChannel,
  frequencies,
  isDarkMode,
  isSaving,
  onClose,
  onSave,
  onFieldChange,
  onFrequencyChange,
}) => {
  // Move useEffect before any conditional returns
  useEffect(() => {
    // Only run the effect if all dependencies are available
    if (editingChannel && frequencies && tempChannel) {
      // Find a frequency where the name matches the channel name
      const matchingFreq = frequencies.find(freq => 
        freq.name && tempChannel.name && 
        freq.name.toLowerCase() === tempChannel.name.toLowerCase()
      );
      
      if (matchingFreq && (!tempChannel.frequency_id || tempChannel.frequency_id === '')) {
        onFrequencyChange(matchingFreq.id);
      }
    }
  }, [editingChannel, frequencies, tempChannel, onFrequencyChange]);

  // Early return after the hooks
  if (!editingChannel || !tempChannel) return null;

  const handleFrequencyChange = (frequencyId) => {
    onFrequencyChange(frequencyId);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 overflow-y-auto py-6">
      <div className={`relative w-full max-w-2xl p-4 md:p-5 rounded-xl shadow-xl transition-all duration-300 transform ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'} border ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
        <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${isDarkMode ? 'from-gray-800/50 to-blue-900/30' : 'from-blue-100/30 to-purple-100/30'} opacity-70`} />

        {/* Modal Header */}
        <div className={`relative flex items-center justify-between pb-3 border-b ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2">
            <RadioTower className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <h3 className="text-lg font-semibold tracking-tight">
              Edit Channel #{editingChannel.id}
            </h3>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 rounded-full transition-colors ${isDarkMode ? 'hover:bg-gray-800 text-gray-400 hover:text-gray-200' : 'hover:bg-gray-200 text-gray-500 hover:text-gray-700'}`}
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="relative space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Frequency Selection - Made Larger/More Prominent */}
            <div className="space-y-1.5 col-span-1 md:col-span-3">
              <label className={`text-sm font-medium flex items-center gap-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <Volume2 className="w-4 h-4" />
                Frequency Selection
              </label>
              <select
                value={tempChannel.frequency_id || ''}
                onChange={(e) => handleFrequencyChange(e.target.value)}
                className={`w-full px-3 py-2 rounded-md border text-sm transition-all duration-200 focus:ring-2 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100 focus:ring-blue-500' : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-400'}`}
              >
                <option value="">Select Frequency</option>
                {frequencies.map((freq) => (
                  <option key={freq.id} value={freq.id}>
                    {freq.name} - {freq.frequency} MHz ({freq.type}) - ({freq.tone})
                  </option>
                ))}
              </select>
            </div>

            {/* Channel Details Section */}
            <div className="md:col-span-3 pt-2">
              <h4 className={`text-sm font-medium mb-3 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                Channel Details
              </h4>
            </div>

            {/* Person Field */}
            <div className="space-y-1.5">
              <label className={`text-xs font-medium flex items-center gap-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <User2 className="w-3.5 h-3.5" />
                Person
              </label>
              <input
                type="text"
                value={tempChannel.person || ''}
                onChange={(e) => onFieldChange("person", e.target.value)}
                className={`w-full px-3 py-2 rounded-md border text-sm transition-all duration-200 focus:ring-2 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100 focus:ring-blue-500' : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-400'}`}
              />
            </div>

            {/* Tag Field */}
            <div className="space-y-1.5">
              <label className={`text-xs font-medium flex items-center gap-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <Tag className="w-3.5 h-3.5" />
                Tag
              </label>
              <input
                type="text"
                value={tempChannel.tag || ''}
                onChange={(e) => onFieldChange("tag", e.target.value)}
                className={`w-full px-3 py-2 rounded-md border text-sm transition-all duration-200 focus:ring-2 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100 focus:ring-blue-500' : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-400'}`}
              />
            </div>

            {/* MAC Address Field */}
            <div className="space-y-1.5">
              <label className={`text-xs font-medium flex items-center gap-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <Network className="w-3.5 h-3.5" />
                MAC Address
              </label>
              <input
                type="text"
                value={tempChannel.mac || ''}
                onChange={(e) => onFieldChange("mac", e.target.value)}
                placeholder="e.g., 00:1A:2B:3C:4D:5E"
                className={`w-full px-3 py-2 rounded-md border text-sm transition-all duration-200 focus:ring-2 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100 focus:ring-blue-500' : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-400'}`}
              />
            </div>

            {/* Status Field */}
            <div className="space-y-1.5">
              <label className={`text-xs font-medium flex items-center gap-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <ActivitySquare className="w-3.5 h-3.5" />
                Status
              </label>
              <select
                value={tempChannel.status || ''}
                onChange={(e) => onFieldChange("status", e.target.value)}
                className={`w-full px-3 py-2 rounded-md border text-sm transition-all duration-200 focus:ring-2 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100 focus:ring-blue-500' : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-400'}`}
              >
                <option value="resumed">Enabled</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>

            {/* Language Selection */}
            <div className="space-y-1.5">
              <label className={`text-xs font-medium flex items-center gap-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <Languages className="w-3.5 h-3.5" />
                Language
              </label>
              <select
                value={tempChannel.src_language || ''}
                onChange={(e) => onFieldChange("src_language", e.target.value)}
                className={`w-full px-3 py-2 rounded-md border text-sm transition-all duration-200 focus:ring-2 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100 focus:ring-blue-500' : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-400'}`}
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang} value={lang} className="capitalize">
                    {lang}
                  </option>
                ))}
              </select>
            </div>

            {/* Hidden Name Field */}
            <div className="hidden">
              <label className={`text-xs font-medium flex items-center gap-1.5 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <RadioTower className="w-3.5 h-3.5" />
                Name
              </label>
              <input
                type="text"
                value={tempChannel.name || ''}
                onChange={(e) => onFieldChange("name", e.target.value)}
                className={`w-full px-3 py-2 rounded-md border text-sm transition-all duration-200 focus:ring-2 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-100 focus:ring-blue-500' : 'bg-white border-gray-300 text-gray-900 focus:ring-blue-400'}`}
              />
            </div>

            {/* Hidden Frequency fields */}
            <div className="hidden">
              <input
                type="number"
                step="0.001"
                value={tempChannel.frequency || ''}
                onChange={(e) => onFieldChange("frequency", e.target.value)}
              />
              <input
                type="text"
                value={tempChannel.type || ''}
                onChange={(e) => onFieldChange("type", e.target.value)}
              />
              <input
                type="text"
                value={tempChannel.tone || ''}
                onChange={(e) => onFieldChange("tone", e.target.value)}
              />
            </div>

            {/* Color Settings - Now Separated to its own section */}
            <div className="col-span-1 md:col-span-3 space-y-3 pt-2">
              <h4 className={`text-sm font-medium ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                <div className="flex items-center gap-1.5">
                  <Palette className="w-4 h-4" />
                  Visual Settings
                </div>
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <ColorPalettePicker
                  label="Background Color"
                  color={tempChannel.background_color || '#ffffff'}
                  onChange={(value) => onFieldChange("background_color", value)}
                  isDarkMode={isDarkMode}
                />
                <ColorPalettePicker
                  label="Team Color"
                  color={tempChannel.team_color || '#166ddf'}
                  onChange={(value) => onFieldChange("team_color", value)}
                  isDarkMode={isDarkMode}
                />
                <ColorPalettePicker
                  label="Text Color"
                  color={tempChannel.color || '#0d0c0c'}
                  onChange={(value) => onFieldChange("color", value)}
                  isDarkMode={isDarkMode}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className={`relative flex justify-end pt-3 mt-2 border-t ${isDarkMode ? 'border-gray-800' : 'border-gray-200'}`}>
          <button
            onClick={onClose}
            disabled={isSaving}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 ${isDarkMode
              ? 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300 hover:text-gray-900'
            } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={isSaving}
            className={`px-4 py-2 ml-3 rounded-md text-sm font-medium bg-gradient-to-r ${isDarkMode
              ? 'from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
              : 'from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600'
            } text-white transition-all duration-200 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isSaving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};
export default ChannelEditModal;