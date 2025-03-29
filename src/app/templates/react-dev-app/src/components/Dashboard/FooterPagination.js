import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const FooterPagination = ({
  currentPage,
  setCurrentPage,
  getFilteredMessages,
  isDarkMode,
  setIsDarkMode,
  getTotalPages,
  recordsPerPage,
  setRecordsPerPage,
  isMobile
}) => {
  const totalMessages = getFilteredMessages().length;
  const totalPages = getTotalPages(totalMessages);

  const startRecord = (currentPage - 1) * recordsPerPage + 1;
  const endRecord = Math.min(currentPage * recordsPerPage, totalMessages);

  const commonStyles = {
    background: isDarkMode ? 'bg-gray-900' : 'bg-white',
    borderColor: isDarkMode ? 'border-[#ff8b2d]/30' : 'border-gray-300',
    textColor: isDarkMode ? 'text-white' : 'text-gray-800',
    secondaryTextColor: isDarkMode ? 'text-[#ff8b2d]' : 'text-orange-600',
    buttonBackground: isDarkMode ? 'bg-[#ff8b2d]/10' : 'bg-gray-200',
    buttonHoverBackground: isDarkMode ? 'hover:bg-[#ff8b2d]/20' : 'hover:bg-gray-300',
    disabledOpacity: isDarkMode ? 'disabled:opacity-30' : 'disabled:opacity-50',
    borderBackground: isDarkMode ? 'bg-[#ff8b2d]/5' : 'bg-gray-100',
  };

  return (
    <div
      className={`sticky bottom-0 ${commonStyles.background} border-t ${commonStyles.borderColor} ${commonStyles.textColor} z-10`}
    >
      <div className="max-w-7xl mx-auto px-2 md:px-4">
        <div className={`flex items-center ${isMobile ? 'flex-col space-y-2 py-2' : 'justify-between h-16 space-x-4'}`}>
          <button
            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className={`flex items-center px-3 py-1.5 md:px-4 md:py-2 rounded-lg ${commonStyles.buttonBackground} ${commonStyles.buttonHoverBackground} ${commonStyles.borderColor} ${commonStyles.disabledOpacity} transition-all duration-300 group`}
          >
            <ChevronLeft
              size={isMobile ? 14 : 16}
              className={`mr-1 md:mr-2 ${commonStyles.secondaryTextColor} group-hover:transform group-hover:-translate-x-0.5 transition-transform`}
            />
            <span className={`${commonStyles.secondaryTextColor} font-medium text-sm md:text-base`}>NEW</span>
          </button>

          <div className={`text-center px-3 py-1 rounded-lg ${commonStyles.borderBackground} ${commonStyles.borderColor} ${isMobile ? 'w-full' : 'flex-1'}`}>
            <span className="text-xs md:text-sm font-medium">
              Showing{' '}
              <span className={commonStyles.secondaryTextColor}>
                {startRecord}-{endRecord}
              </span>{' '}
              of{' '}
              <span className={commonStyles.secondaryTextColor}>
                {totalMessages}
              </span>
            </span>
          </div>

          <div className={`flex items-center ${isMobile ? 'w-full justify-center' : 'space-x-2'}`}>
            {!isMobile && <label className="text-sm font-medium">Records:</label>}
            <select
              value={recordsPerPage}
              onChange={(e) => setRecordsPerPage(Number(e.target.value))}
              className={`px-2 py-1 rounded border ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} text-xs md:text-sm focus:ring focus:ring-orange-300 focus:outline-none`}
            >
              {[10, 20, 50, 100].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className={`flex items-center px-3 py-1.5 md:px-4 md:py-2 rounded-lg ${commonStyles.buttonBackground} ${commonStyles.buttonHoverBackground} ${commonStyles.borderColor} ${commonStyles.disabledOpacity} transition-all duration-300 group`}
          >
            <span className={`${commonStyles.secondaryTextColor} font-medium text-sm md:text-base`}>OLD</span>
            <ChevronRight
              size={isMobile ? 14 : 16}
              className={`ml-1 md:ml-2 ${commonStyles.secondaryTextColor} group-hover:transform group-hover:translate-x-0.5 transition-transform`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FooterPagination;