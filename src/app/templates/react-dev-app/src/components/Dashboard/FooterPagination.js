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
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16 space-x-4">
          {/* Previous Page Button */}
          <button
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className={`flex items-center px-4 py-2 rounded-lg ${commonStyles.buttonBackground} ${commonStyles.buttonHoverBackground} ${commonStyles.borderColor} ${commonStyles.disabledOpacity} transition-all duration-300 group`}
          >
            <ChevronLeft
              size={16}
              className={`mr-2 ${commonStyles.secondaryTextColor} group-hover:transform group-hover:-translate-x-0.5 transition-transform`}
            />
            <span className={`${commonStyles.secondaryTextColor} font-medium`}>NEW</span>
          </button>

          {/* Records Info */}
          <div className={`flex-1 text-center px-4 py-1.5 rounded-lg ${commonStyles.borderBackground} ${commonStyles.borderColor}`}>
            <span className="text-sm font-medium">
              Showing{' '}
              <span className={commonStyles.secondaryTextColor}>
                {startRecord}-{endRecord}
              </span>{' '}
              of{' '}
              <span className={commonStyles.secondaryTextColor}>
                {totalMessages}
              </span>{' '}
              records
            </span>
          </div>

          {/* Records Per Page Dropdown */}
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium">Records Per Page:</label>
            <select
              value={recordsPerPage}
              onChange={(e) => setRecordsPerPage(Number(e.target.value))}
              className={`px-2 py-1 rounded border ${isDarkMode ? 'bg-gray-800 text-white' : 'bg-white text-gray-800'} focus:ring focus:ring-orange-300 focus:outline-none`}
            >
              {[10, 20, 50, 100].map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          {/* Next Page Button */}
          <button
            onClick={() =>
              setCurrentPage((prev) =>
                Math.min(totalPages, prev + 1)
              )
            }
            disabled={currentPage === totalPages}
            className={`flex items-center px-4 py-2 rounded-lg ${commonStyles.buttonBackground} ${commonStyles.buttonHoverBackground} ${commonStyles.borderColor} ${commonStyles.disabledOpacity} transition-all duration-300 group`}
          >
            <span className={`${commonStyles.secondaryTextColor} font-medium`}>OLD</span>
            <ChevronRight
              size={16}
              className={`ml-2 ${commonStyles.secondaryTextColor} group-hover:transform group-hover:translate-x-0.5 transition-transform`}
            />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FooterPagination;
