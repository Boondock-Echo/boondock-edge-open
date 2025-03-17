import React from 'react';
import { X, Save } from 'lucide-react';
import { CTCSS_TONES, DCS_CODES } from "../tone-codes";

export const FrequencyForm = ({ 
  formData, 
  onSubmit, 
  onChange, 
  onClose, 
  mode,
  isDarkMode 
}) => (
  <form onSubmit={onSubmit}>
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">Name</label>
        <input
          type="text"
          name="name"
          value={formData.name}
          onChange={onChange}
          className={`w-full px-4 py-2 rounded-lg border ${
            isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50 border-gray-300'
          }`}
        />
      </div>
      {/* Rest of the form fields... */}
      <div className="pt-4 flex justify-end space-x-4">
        <button
          type="button"
          onClick={onClose}
          className={`px-4 py-2 rounded-lg border ${
            isDarkMode ? 'border-gray-600 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-100'
          }`}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2"
        >
          <Save className="w-4 h-4" />
          <span>{mode === 'create' ? 'Create' : 'Save Changes'}</span>
        </button>
      </div>
    </div>
  </form>
);