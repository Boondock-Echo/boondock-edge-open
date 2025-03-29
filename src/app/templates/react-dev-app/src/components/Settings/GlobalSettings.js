import React, { useState, useEffect } from 'react';
import { 
  Globe, DatabaseZap, Settings, Radio, 
  ToggleLeft, Network, Server, Cloud, Check, Moon, Sun,
  Clock
} from 'lucide-react';

const LANGUAGES = [
  "english", "spanish", "french", "german", "italian", "portuguese",
  "chinese", "japanese", "korean", "arabic",
];

const WHISPER_MODELS = [
  { value: "small", label: "Fastest", speed: "1-2s", accuracy: "89%" },
  { value: "medium", label: "Fast", speed: "2-4s", accuracy: "94%" },
  { value: "large", label: "Normal", speed: "4-6s", accuracy: "98%" },
];

const TIMEZONES = [
  // UTC
  { value: "UTC", label: "UTC (Coordinated Universal Time)" },
  
  // North America - US Timezones
  { value: "America/New_York", label: "US Eastern Time (ET)" },
  { value: "America/Chicago", label: "US Central Time (CT)" },
  { value: "America/Denver", label: "US Mountain Time (MT)" },
  { value: "America/Phoenix", label: "US Arizona Time (AZ)" },
  { value: "America/Los_Angeles", label: "US Pacific Time (PT)" },
  { value: "America/Anchorage", label: "US Alaska Time (AKT)" },
  { value: "America/Adak", label: "US Hawaii-Aleutian Time (HST)" },
  { value: "Pacific/Honolulu", label: "US Hawaii Time (HST)" },
  
  // North America - Canada
  { value: "America/Vancouver", label: "Canada Pacific Time" },
  { value: "America/Edmonton", label: "Canada Mountain Time" },
  { value: "America/Winnipeg", label: "Canada Central Time" },
  { value: "America/Toronto", label: "Canada Eastern Time" },
  { value: "America/Halifax", label: "Canada Atlantic Time" },
  { value: "America/St_Johns", label: "Canada Newfoundland Time" },
  
  // Mexico
  { value: "America/Mexico_City", label: "Mexico Central Time" },
  { value: "America/Tijuana", label: "Mexico Pacific Time" },
  
  // South America
  { value: "America/Bogota", label: "Colombia Time (COT)" },
  { value: "America/Lima", label: "Peru Time (PET)" },
  { value: "America/Santiago", label: "Chile Time (CLT)" },
  { value: "America/Argentina/Buenos_Aires", label: "Argentina Time (ART)" },
  { value: "America/Sao_Paulo", label: "Brazil Time (BRT)" },
  
  // Europe
  { value: "Europe/London", label: "UK - Greenwich Mean Time (GMT)/British Summer Time (BST)" },
  { value: "Europe/Dublin", label: "Ireland Time" },
  { value: "Europe/Lisbon", label: "Portugal Time" },
  { value: "Europe/Paris", label: "France - Central European Time (CET)" },
  { value: "Europe/Berlin", label: "Germany - Central European Time (CET)" },
  { value: "Europe/Madrid", label: "Spain Time" },
  { value: "Europe/Rome", label: "Italy Time" },
  { value: "Europe/Amsterdam", label: "Netherlands Time" },
  { value: "Europe/Brussels", label: "Belgium Time" },
  { value: "Europe/Vienna", label: "Austria Time" },
  { value: "Europe/Zurich", label: "Switzerland Time" },
  { value: "Europe/Stockholm", label: "Sweden Time" },
  { value: "Europe/Oslo", label: "Norway Time" },
  { value: "Europe/Copenhagen", label: "Denmark Time" },
  { value: "Europe/Warsaw", label: "Poland Time" },
  { value: "Europe/Athens", label: "Greece Time" },
  { value: "Europe/Helsinki", label: "Finland Time" },
  { value: "Europe/Moscow", label: "Russia - Moscow Time (MSK)" },
  
  // Middle East
  { value: "Asia/Istanbul", label: "Turkey Time (TRT)" },
  { value: "Asia/Dubai", label: "United Arab Emirates Time (GST)" },
  { value: "Asia/Riyadh", label: "Saudi Arabia Time (AST)" },
  { value: "Asia/Tel_Aviv", label: "Israel Time (IST)" },
  { value: "Asia/Tehran", label: "Iran Time (IRST)" },
  
  // Asia
  { value: "Asia/Kolkata", label: "India Time (IST)" },
  { value: "Asia/Kathmandu", label: "Nepal Time (NPT)" },
  { value: "Asia/Dhaka", label: "Bangladesh Time (BST)" },
  { value: "Asia/Colombo", label: "Sri Lanka Time" },
  { value: "Asia/Bangkok", label: "Thailand Time (ICT)" },
  { value: "Asia/Singapore", label: "Singapore Time (SGT)" },
  { value: "Asia/Kuala_Lumpur", label: "Malaysia Time (MYT)" },
  { value: "Asia/Jakarta", label: "Indonesia Western Time (WIB)" },
  { value: "Asia/Manila", label: "Philippines Time (PHT)" },
  { value: "Asia/Hong_Kong", label: "Hong Kong Time (HKT)" },
  { value: "Asia/Shanghai", label: "China Time (CST)" },
  { value: "Asia/Taipei", label: "Taiwan Time (CST)" },
  { value: "Asia/Seoul", label: "Korea Time (KST)" },
  { value: "Asia/Tokyo", label: "Japan Time (JST)" },
  
  // Australia & Pacific
  { value: "Australia/Perth", label: "Australia Western Time (AWST)" },
  { value: "Australia/Adelaide", label: "Australia Central Time (ACST)" },
  { value: "Australia/Darwin", label: "Australia Central Time - NT (ACST)" },
  { value: "Australia/Brisbane", label: "Australia Eastern Time - QLD (AEST)" },
  { value: "Australia/Sydney", label: "Australia Eastern Time - NSW (AEST)" },
  { value: "Australia/Melbourne", label: "Australia Eastern Time - VIC (AEST)" },
  { value: "Australia/Hobart", label: "Australia Eastern Time - TAS (AEST)" },
  { value: "Pacific/Auckland", label: "New Zealand Time (NZST)" },
  { value: "Pacific/Fiji", label: "Fiji Time (FJT)" },
  
  // Africa
  { value: "Africa/Johannesburg", label: "South Africa Time (SAST)" },
  { value: "Africa/Cairo", label: "Egypt Time (EET)" },
  { value: "Africa/Nairobi", label: "East Africa Time (EAT)" },
  { value: "Africa/Lagos", label: "West Africa Time (WAT)" },
  { value: "Africa/Casablanca", label: "Morocco Time" }
];

const SelectCard = ({ selected, label, value, onClick, children, isDarkMode }) => (
  <div 
    onClick={onClick}
    className={`relative p-4 rounded-xl cursor-pointer transition-all duration-300 transform hover:scale-102 ${
      selected 
        ? isDarkMode 
          ? 'bg-blue-900/50 border-2 border-blue-400 shadow-lg' 
          : 'bg-blue-50 border-2 border-blue-500 shadow-lg'
        : isDarkMode
          ? 'bg-gray-800 border-2 border-gray-700 hover:border-gray-600'
          : 'bg-white border-2 border-gray-200 hover:border-gray-300'
    }`}
  >
    {selected && (
      <div className="absolute top-3 right-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
        <Check size={14} className="text-white" />
      </div>
    )}
    <div className={isDarkMode ? 'text-gray-200' : 'text-gray-900'}>
      {children}
    </div>
  </div>
);

const Toggle = ({ checked, onChange, label, icon: Icon, description, metric, isDarkMode }) => (
  <div className="group relative">
    <button
      onClick={() => onChange(!checked)}
      className={`w-full p-5 rounded-xl border-2 transition-all duration-300 transform hover:scale-102 ${
        checked 
          ? isDarkMode
            ? 'bg-blue-900/30 border-blue-400 shadow-lg'
            : 'bg-blue-50 border-blue-500 shadow-lg'
          : isDarkMode
            ? 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
            : 'bg-white border-gray-200 hover:border-gray-300'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className={`p-3 rounded-xl transition-all duration-300 ${
            checked 
              ? isDarkMode 
                ? 'bg-blue-500/20 shadow-inner' 
                : 'bg-blue-500 shadow-inner'
              : isDarkMode 
                ? 'bg-gray-700' 
                : 'bg-gray-100'
          }`}>
            <Icon size={24} className={checked 
              ? isDarkMode 
                ? 'text-blue-300' 
                : 'text-white'
              : isDarkMode 
                ? 'text-gray-400' 
                : 'text-gray-500'
            } />
          </div>
          <div className="text-left">
            <h4 className={`font-semibold text-lg ${
              isDarkMode 
                ? checked 
                  ? 'text-blue-300' 
                  : 'text-gray-300'
                : checked 
                  ? 'text-blue-900' 
                  : 'text-gray-700'
            }`}>
              {label}
            </h4>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              {description}
            </p>
            {metric && (
              <div className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                isDarkMode 
                  ? 'bg-blue-900/50 text-blue-300' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {metric}
              </div>
            )}
          </div>
        </div>
        <div className="relative">
          <div className={`w-12 h-6 rounded-full transition-colors duration-300 ${
            checked 
              ? isDarkMode 
                ? 'bg-blue-500' 
                : 'bg-blue-500'
              : isDarkMode 
                ? 'bg-gray-700' 
                : 'bg-gray-200'
          }`}>
            <div className={`absolute w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 top-0.5 ${
              checked ? 'translate-x-6 left-1' : 'translate-x-0 left-1'
            }`} />
          </div>
        </div>
      </div>
    </button>
  </div>
);

// Time Zone Component
const TimeZoneSelector = ({ selectedTimezone, onChange, isDarkMode }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const filteredTimeZones = searchTerm
    ? TIMEZONES.filter(tz => 
        tz.label.toLowerCase().includes(searchTerm.toLowerCase()) || 
        tz.value.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : TIMEZONES;

  const selectedTZ = TIMEZONES.find(tz => tz.value === selectedTimezone) || TIMEZONES[0];

  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-3">
        <Clock size={18} className="text-blue-500" />
        <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
          Time Zone
        </label>
      </div>
      
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all duration-300 ${
          isDarkMode
            ? 'bg-gray-800 border-gray-700 text-gray-200 hover:border-gray-600'
            : 'bg-white border-gray-200 text-gray-900 hover:border-gray-300'
        }`}
      >
        <span>{selectedTZ.label}</span>
        <svg 
          className={`h-5 w-5 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'} transition-transform duration-200 ${isOpen ? 'transform rotate-180' : ''}`} 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 20 20" 
          fill="currentColor"
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {isOpen && (
        <div className={`absolute z-10 mt-1 w-full rounded-xl ${
          isDarkMode 
            ? 'bg-gray-800 border border-gray-700 shadow-lg' 
            : 'bg-white border border-gray-200 shadow-lg'
        }`}>
          <div className="p-2">
            <input
              type="text"
              placeholder="Search time zones..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full p-2 rounded-lg border ${
                isDarkMode 
                  ? 'bg-gray-700 border-gray-600 text-gray-200 placeholder-gray-400'
                  : 'bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-500'
              }`}
            />
          </div>
          <div className="max-h-60 overflow-y-auto">
            {filteredTimeZones.map((tz) => (
              <button
                key={tz.value}
                onClick={() => {
                  onChange(tz.value);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className={`w-full text-left p-3 hover:opacity-80 transition-colors duration-200 ${
                  selectedTimezone === tz.value 
                    ? isDarkMode 
                      ? 'bg-blue-900/40 text-blue-300' 
                      : 'bg-blue-50 text-blue-800'
                    : isDarkMode 
                      ? 'text-gray-300 hover:bg-gray-700/50' 
                      : 'text-gray-900 hover:bg-gray-50'
                }`}
              >
                {tz.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const GlobalSettings = ({ 
  globalSettings = {
    target_language: "english",
    hallucination: "False",
    model: "medium",
    transcribe_node: "True",
    transcribe_openai: "False",
    transcribe_local: "False",
    timezone: "UTC"
  }, 
  handleGlobalChange = () => {}, 
  keywords = [], 
  newKeyword = '', 
  setNewKeyword = () => {}, 
  handleAddKeyword = () => {}, 
  handleRemoveKeyword = () => {}, 
  isDarkMode = false,
  toggleDarkMode = () => {} 
}) => {
  const [hideHallucination, setHideHallucination] = useState(() => {
    return JSON.parse(localStorage.getItem('hideHallucination')) || false;
  });

  // Effect for local storage
  useEffect(() => {
    localStorage.setItem('hideHallucination', JSON.stringify(hideHallucination));
  }, [hideHallucination]);

  // Get browser timezone as default if not set
  useEffect(() => {
    if (!globalSettings.timezone) {
      try {
        const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        handleGlobalChange("timezone", browserTimezone);
      } catch (error) {
        // Fallback to UTC if browser API fails
        handleGlobalChange("timezone", "UTC");
      }
    }
  }, []);

  return (
    <div className={`mx-auto space-y-8 p-6 transition-colors duration-300 ${isDarkMode ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header with Dark Mode Toggle */}
     

      {/* Global Settings Section */}
      <div className={`bg-gradient-to-br rounded-2xl shadow-lg p-8 transition-all duration-300 ${
        isDarkMode
          ? 'from-gray-800/70 to-gray-900/90 border border-gray-700'
          : 'from-white to-gray-50 border border-gray-100'
      }`}>
        <div className="flex items-center gap-4 mb-8">
          <div className={`p-3 rounded-2xl shadow-md ${isDarkMode ? 'bg-blue-600' : 'bg-blue-500'}`}>
            <Settings size={24} className="text-white" />
          </div>
          <div>
            <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
              Global Settings
            </h2>
            <p className={`mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Configure your application preferences
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div>
              <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                <div className="flex items-center gap-2 mb-3">
                  <Globe size={18} className="text-blue-500" />
                  Target Language
                </div>
                <select
                  value={globalSettings.target_language || 'english'}
                  onChange={(e) => handleGlobalChange("target_language", e.target.value)}
                  className={`w-full p-3 rounded-xl border-2 transition-all duration-300 ${
                    isDarkMode
                      ? 'bg-gray-800 border-gray-700 text-gray-200 focus:border-blue-400'
                      : 'bg-white border-gray-200 text-gray-900 focus:border-blue-500'
                  } focus:ring focus:ring-blue-200/50`}
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang} value={lang} className={isDarkMode ? 'bg-gray-800' : 'bg-white'}>
                      {lang.charAt(0).toUpperCase() + lang.slice(1)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
 {/* Time Zone Component */}
 <TimeZoneSelector 
              selectedTimezone={globalSettings.timezone || "UTC"}
              onChange={(value) => handleGlobalChange("timezone", value)}
              isDarkMode={isDarkMode}
            />
            <Toggle
              checked={globalSettings.hallucination === "True"}
              onChange={(checked) => handleGlobalChange("hallucination", checked ? "True" : "False")}
              label="Hide Hallucination"
              icon={ToggleLeft}
              description="Enable this to hide hallucinations in transcriptions."
              isDarkMode={isDarkMode}
            />

           
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-3">
              <DatabaseZap size={18} className="text-blue-500" />
              <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Model Selection
              </label>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {WHISPER_MODELS.map((model) => (
                <SelectCard
                  key={model.value}
                  selected={globalSettings.model === model.value}
                  onClick={() => handleGlobalChange("model", model.value)}
                  isDarkMode={isDarkMode}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <h4 className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                        {model.label}
                      </h4>
                      <p className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                        Processing time: {model.speed}
                      </p>
                    </div>
                    <div className={`text-sm font-medium ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>
                      {model.accuracy}
                    </div>
                  </div>
                </SelectCard>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Services Section */}
      <div className={`bg-gradient-to-br rounded-2xl shadow-lg p-8 transition-all duration-300 ${
        isDarkMode
          ? 'from-gray-800/70 to-gray-900/90 border border-gray-700'
          : 'from-white to-gray-50 border border-gray-100'
      }`}>
        <div className="flex items-center gap-4 mb-8">
          <div className={`p-3 rounded-2xl shadow-md ${isDarkMode ? 'bg-blue-600' : 'bg-blue-500'}`}>
            <Radio size={24} className="text-white" />
          </div>
          <div>
            <h2 className={`text-2xl font-bold ${isDarkMode ? 'text-gray-100' : 'text-gray-900'}`}>
              Transcription Services
            </h2>
            <p className={`mt-1 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              Manage your transcription providers
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <Toggle
            checked={globalSettings.transcribe_node === "True"}
            onChange={(checked) => handleGlobalChange("transcribe_node", checked ? "True" : "False")}
            label="Node Transcription"
            icon={Network}
            description="Use Boondock Echo's fine-tuned servers for processing. Best for very large traffic and high-quality transcriptions."
            metric="Recommended"
            isDarkMode={isDarkMode}
          />

          <Toggle
            checked={globalSettings.transcribe_openai === "True"}
            onChange={(checked) => handleGlobalChange("transcribe_openai", checked ? "True" : "False")}
            label="OpenAI Transcription"
            icon={Cloud}
            description="Good for standard language translation. Uses OpenAI's API."
            isDarkMode={isDarkMode}
          />

          <Toggle
            checked={globalSettings.transcribe_local === "True"}
            onChange={(checked) => handleGlobalChange("transcribe_local", checked ? "True" : "False")}
            label="Local Transcription"
            icon={Server}
            description="Slowest option. Use this option if you have poor or no internet connectivity."
            isDarkMode={isDarkMode}
          />
        </div>
      </div>
      
      {/* Footer */}
      <div className={`text-center py-6 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
        <p className="text-sm">Configuration changes are saved automatically</p>
      </div>
    </div>
  );
};

export default GlobalSettings;