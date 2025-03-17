import React from "react";

const KeywordsSection = ({ keywordCounts, activeKeywords, handleKeywordClick, isDarkMode }) => (
  <div className="mb-6">
    {/* <h4 className={`text-sm font-semibold mb-3 ${isDarkMode ? "text-gray-300" : "text-gray-700"}`}>
      Keyword Tracker
    </h4> */}
    <div className={`flex flex-wrap gap-2 overflow-y-auto ${isDarkMode ? 'dark-mode-scrollbar' : ''}`}>
      {Object.entries(keywordCounts).map(([keyword, count]) => (
        <button
          key={keyword}
          onClick={() => handleKeywordClick(keyword)}
          className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 ${activeKeywords.has(keyword)
            ? isDarkMode
              ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50"
              : "bg-blue-500 text-white"
            : isDarkMode
              ? "bg-gray-800 text-gray-300 hover:bg-gray-700"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          <span>{keyword}</span>
          <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${isDarkMode ? "bg-blue-900 text-blue-300" : "bg-blue-100 text-blue-700"}`}>
            {count}
          </span>
        </button>
      ))}
    </div>
  </div>
);

export default KeywordsSection;