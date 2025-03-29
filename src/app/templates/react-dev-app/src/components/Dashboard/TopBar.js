import React, { useState } from 'react';
import { Filter, X, Clock, Car, Tag, Radio, User } from 'lucide-react';

const TopBar = ({
  timeFilter,
  setTimeFilter,
  TIME_FILTERS,
  showTime,
  setShowTime,
  showCar,
  setShowCar,
  showChannel,
  setShowChannel,
  showPerson,
  setShowPerson,
  branding,
  isDarkMode,
  timezone,
  setTimezone,
  isMobile
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isModalClosing, setIsModalClosing] = useState(false);

  const closeModal = () => {
    setIsModalClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsModalClosing(false);
    }, 300);
  };

  const commonStyles = {
    modalBackground: isDarkMode ? 'bg-gray-900' : 'bg-white',
    borderColor: isDarkMode ? 'border-gray-700' : 'border-gray-200',
    textColor: isDarkMode ? 'text-white' : 'text-gray-800',
    secondaryTextColor: isDarkMode ? 'text-gray-400' : 'text-gray-500',
    buttonBackground: isDarkMode ? 'bg-gray-800' : 'bg-gray-100',
    buttonHoverBackground: isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-200',
    toggleInactive: isDarkMode ? 'bg-gray-700' : 'bg-gray-200',
    inputBackground: isDarkMode ? 'bg-gray-800' : 'bg-gray-50',
  };


  return (
    <>
     <div className={`sticky top-0 z-20 ${isDarkMode ? 'bg-gray-900/95' : 'bg-white/95'} backdrop-blur-md border-b ${commonStyles.borderColor} shadow-sm transition-colors duration-300`}>
        <div className={`${isMobile ? 'px-2' : 'max-w-7xl mx-auto px-4 sm:px-6'}`}>
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center">
                <h2 
                  className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold tracking-wide transition-all duration-300`}
                  style={{ color: branding.brandColors.primary }}
                >
                  MESSAGES
                </h2>
                <div 
                  className={`h-1 ${isMobile ? 'w-8' : 'w-12'} ml-2 rounded-full opacity-80 transition-all duration-300`}
                  style={{ backgroundColor: branding.brandColors.primary }}
                />
              </div>
              
              {timezone && !isMobile && (
                <div className={`hidden md:flex items-center px-3 py-1 rounded-full ${commonStyles.buttonBackground} ${commonStyles.secondaryTextColor} text-xs font-medium transition-all duration-300`}>
                  <Clock className="h-3 w-3 mr-1.5 opacity-70" />
                  {timezone}
                </div>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setIsOpen(true)}
                className={`relative group inline-flex items-center justify-center ${isMobile ? 'h-8 w-8' : 'h-9 w-9'} rounded-full ${commonStyles.buttonBackground} ${commonStyles.buttonHoverBackground} transition-all duration-300`}
                aria-label="Open settings"
              >
                <Filter 
                  className={`${isMobile ? 'h-3.5 w-3.5' : 'h-4 w-4'} group-hover:scale-110 transition-all duration-300`}
                  style={{ color: branding.brandColors.primary }}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {isOpen && (
        <div 
          className={`fixed inset-0 ${isDarkMode ? 'bg-gray-900/80' : 'bg-gray-800/30'} backdrop-blur-md z-30 flex items-center justify-center transitionuffed transition-opacity duration-300 ${isModalClosing ? 'opacity-0' : 'opacity-100'}`}
        >
          <div 
            className={`${commonStyles.modalBackground} rounded-2xl w-full max-w-[90%] md:max-w-md mx-4 shadow-2xl relative border ${commonStyles.borderColor} overflow-hidden transition-transform duration-300 ${isModalClosing ? 'scale-95' : 'scale-100'}`}
          >
            <div 
              className="absolute top-0 left-0 w-full h-1 transition-colors duration-300"
              style={{ backgroundColor: branding.brandColors.primary }}
            />

            <div className={`relative flex items-center justify-between p-3 md:p-4 border-b ${commonStyles.borderColor}`}>
              <h3 className={`text-base md:text-lg font-bold tracking-wide ${commonStyles.textColor} transition-colors duration-300`}>
                SETTINGS
              </h3>
              <button
                onClick={closeModal}
                className={`p-1 md:p-1.5 rounded-full ${isDarkMode ? 'bg-gray-800 hover:bg-gray-700' : 'bg-gray-100 hover:bg-gray-200'} transition-colors duration-200`}
                aria-label="Close settings"
              >
                <X className={`h-4 w-4 ${commonStyles.secondaryTextColor}`} />
              </button>
            </div>

            <div className="relative p-4 md:p-6 space-y-4 md:space-y-6">
              <div className="space-y-2">
                <label 
                  className={`flex items-center gap-2 text-xs font-semibold tracking-wide transition-colors duration-300`}
                  style={{ color: branding.brandColors.primary }}
                >
                  <Clock className="h-3.5 w-3.5" style={{ color: branding.brandColors.primary }} />
                  TIME RANGE
                </label>
                <div className={`relative rounded-lg border ${commonStyles.borderColor} transition-colors duration-300`}>
                  <select
                    value={timeFilter}
                    onChange={(e) => setTimeFilter(e.target.value)}
                    className={`w-full appearance-none rounded-lg ${commonStyles.inputBackground} px-2 md:px-3 py-2 text-sm ${commonStyles.textColor} focus:outline-none transition-colors duration-300`}
                    style={{ borderColor: branding.brandColors.primary + '40' }}
                  >
                    {Object.values(TIME_FILTERS).map((filter) => (
                      <option key={filter} value={filter} className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'}`}>
                        {filter}
                      </option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 md:px-3">
                    <svg className={`h-4 w-4 ${commonStyles.secondaryTextColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="space-y-2 md:space-y-3">
                {[
                  { label: 'TIMING', icon: Clock, state: showTime, setState: setShowTime },
                  { label: 'TAG', icon: Tag, state: showCar, setState: setShowCar },
                  { label: 'CHANNEL', icon: Radio, state: showChannel, setState: setShowChannel },
                  { label: 'PERSON', icon: User, state: showPerson, setState: setShowPerson },
                ].map(({ label, icon: Icon, state, setState }) => (
                  <div 
                    key={label} 
                    className={`flex items-center justify-between p-2 md:p-3 rounded-lg border ${state ? 'border-opacity-50' : 'border-opacity-20'} transition-all duration-300`}
                    style={{ 
                      borderColor: state ? branding.brandColors.primary : commonStyles.borderColor,
                      backgroundColor: state ? branding.brandColors.primary + '10' : (isDarkMode ? 'rgb(31 41 55)' : 'rgb(249 250 251)')
                    }}
                  >
                    <div className="flex items-center gap-2 md:gap-3">
                      <div className={`p-1 md:p-1.5 rounded-lg ${state ? '' : commonStyles.buttonBackground} transition-all duration-300`}
                        style={{ backgroundColor: state ? branding.brandColors.primary + '30' : '' }}
                      >
                        <Icon 
                          className="h-3.5 w-3.5 transition-all duration-300"
                          style={{ color: branding.brandColors.primary }}
                        />
                      </div>
                      <span className={`text-xs font-semibold tracking-wide ${commonStyles.textColor} transition-colors duration-300`}>
                        {label}
                      </span>
                    </div>
                    <button
                      onClick={() => setState(!state)}
                      className={`relative inline-flex h-4 md:h-5 w-8 md:w-9 items-center rounded-full transition-all duration-300 ease-out focus:outline-none`}
                      style={{ backgroundColor: state ? branding.brandColors.primary : commonStyles.toggleInactive }}
                      aria-checked={state}
                      role="switch"
                    >
                      <span 
                        className={`inline-block h-3 md:h-4 w-3 md:w-4 transform rounded-full bg-white shadow-md transition-all duration-300 ease-out ${state ? 'translate-x-4 md:translate-x-4' : 'translate-x-0.5'}`} 
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className={`relative flex justify-end px-4 md:px-6 py-3 md:py-4 border-t ${commonStyles.borderColor} transition-colors duration-300`}>
              <button
                onClick={closeModal}
                className={`px-4 md:px-5 py-1.5 md:py-2 rounded-lg text-sm font-medium text-white shadow-md transition-all duration-300 hover:shadow-lg active:scale-95`}
                style={{ backgroundColor: branding.brandColors.primary, outline: 'none' }}
              >
                APPLY
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TopBar;