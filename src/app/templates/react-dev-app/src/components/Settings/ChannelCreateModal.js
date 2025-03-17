import React, { useState } from 'react';
import {
  RadioTower,
  X,
  Volume2,
  User2,
  Wifi,
  Tag,
  ActivitySquare,
  Languages,
  Palette
} from 'lucide-react';
import ColorPalettePicker from './ColorPalettePicker';

const LANGUAGES = [
  "english", "spanish", "french", "german", "italian",
  "portuguese", "chinese", "japanese", "korean", "arabic"
];

const ChannelCreateModal = ({
  isOpen,
  onClose,
  frequencies,
  edgeServerEndpoint,
  isDarkMode,
  onChannelCreated,
}) => {
  const [newChannel, setNewChannel] = useState({
    name: '',
    frequency_id: '',
    person: '',
    tag: '',
    status: 'active',
    src_language: 'english',
    backgroundColor: '#ffffff',
    team_color: '#166ddf',
    color: '#0d0c0c',
    mac: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleFieldChange = (field, value) => {
    setNewChannel(prev => ({ ...prev, [field]: value }));
  };

  const handleFrequencyChange = (frequencyId) => {
    const selectedFrequency = frequencies.find(f => f.id === parseInt(frequencyId));
    if (selectedFrequency) {
      setNewChannel(prev => ({
        ...prev,
        frequency_id: selectedFrequency.id,
        frequency: selectedFrequency.frequency,
        name: selectedFrequency.name,
        type: selectedFrequency.type,
        tone: selectedFrequency.tone,
      }));
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
  
    // Client-side validation could go here
    if (!newChannel.name.trim() || !newChannel.frequency_id) {
      setError('Please fill out all required fields.');
      setIsSaving(false);
      return;
    }
  
    try {
      const response = await fetch(`${edgeServerEndpoint}/channel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newChannel),
      });
  
      if (!response.ok) {
        const errorText = await response.text(); // or response.json() if the server returns JSON
        throw new Error(`Failed to create channel: ${errorText || 'Unknown error'}`);
      }
  
      const data = await response.json();
      if (onChannelCreated) {
        onChannelCreated(data.channel_id);
      }
      onClose();
    } catch (err) {
      setError(err.message || 'An error occurred while creating the channel.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className={`relative w-full max-w-2xl p-6 rounded-2xl shadow-2xl transition-transform duration-300 transform scale-95 hover:scale-100 ${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 opacity-50 rounded-2xl" />

        {/* Modal Header */}
        <div className={`relative flex items-center justify-between pb-4 border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <div className="flex items-center gap-3">
            <RadioTower className={`w-6 h-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            <h3 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Create New Channel
            </h3>
          </div>
          <button
            onClick={onClose}
            className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}`}
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="relative space-y-6 py-6">
          <div className="grid grid-cols-2 gap-6">
            {/* Frequency Selection */}
            <div className="space-y-2 col-span-2">
              <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Volume2 className="w-4 h-4" />
                  Frequency
                </div>
              </label>
              <select
                value={newChannel.frequency_id || ''}
                onChange={(e) => handleFrequencyChange(e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border transition-all duration-200 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              >
                <option value="">Select Frequency</option>
                {frequencies.map((freq) => (
                  <option key={freq.id} value={freq.id}>
                    {freq.name} - {freq.frequency} MHz ({freq.type})
                  </option>
                ))}
              </select>
            </div>

            {/* Name Field */}
            <div className="space-y-2 col-span-2">
              <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <RadioTower className="w-4 h-4" />
                  Name
                </div>
              </label>
              <input
                type="text"
                value={newChannel.name}
                onChange={(e) => handleFieldChange("name", e.target.value)}
                className={`w-full px-4 py-2 rounded-lg border transition-all duration-200 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              />
            </div>

            {/* MAC Address Field */}
            <div className="space-y-2 col-span-2">
              <label className={`text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Wifi className="w-4 h-4" />
                  MAC Address
                </div>
              </label>
              <input
                type="text"
                value={newChannel.mac}
                onChange={(e) => handleFieldChange("mac", e.target.value)}
                placeholder="XX:XX:XX:XX:XX:XX"
                pattern="^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$"
                className={`w-full px-4 py-2 rounded-lg border transition-all duration-200 ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'}`}
              />
            </div>

            {/* Other fields similar to ChannelEditModal */}
            {/* ... */}
            
            {/* Color Settings */}
            <div className="col-span-2">
              <h4 className={`text-sm font-medium mb-4 flex items-center gap-2 ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                <Palette className="w-4 h-4" />
                Color Settings
              </h4>
              <div className="flex flex-wrap gap-4">
                <ColorPalettePicker
                  label="Background Color"
                  color={newChannel.backgroundColor}
                  onChange={(value) => handleFieldChange("backgroundColor", value)}
                  isDarkMode={isDarkMode}
                />
                <ColorPalettePicker
                  label="Team Color"
                  color={newChannel.team_color}
                  onChange={(value) => handleFieldChange("team_color", value)}
                  isDarkMode={isDarkMode}
                />
                <ColorPalettePicker
                  label="Text Color"
                  color={newChannel.color}
                  onChange={(value) => handleFieldChange("color", value)}
                  isDarkMode={isDarkMode}
                />
              </div>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="text-red-500 text-sm mt-4">{error}</div>
          )}
        </div>

        {/* Modal Footer */}
        <div className={`relative flex justify-end pt-4 border-t ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}>
          <button
            onClick={onClose}
            disabled={isSaving}
            className={`px-4 py-2 rounded-lg transition-colors duration-200 ${isDarkMode
              ? 'bg-gray-700 hover:bg-gray-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
            } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !newChannel.frequency_id || !newChannel.name}
            className={`px-4 py-2 ml-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors duration-200 ${isSaving ? 'opacity-50 cursor-not-allowed' : ''
              }`}
          >
            {isSaving ? 'Creating...' : 'Create Channel'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChannelCreateModal;