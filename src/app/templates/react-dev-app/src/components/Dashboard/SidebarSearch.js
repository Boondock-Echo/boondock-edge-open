import React from "react";
import { Search } from "lucide-react";

const SidebarSearch = ({ searchQuery, setSearchQuery, isDarkMode }) => (
  <div className="relative px-4 mb-2"> {/* Reduced horizontal padding for better alignment */}
    <Search
      className={`absolute left-8 top-1/2 transform -translate-y-1/2 ${isDarkMode ? "text-gray-400" : "text-gray-500"}`}
      size={18} 
      strokeWidth={2} 
    />
    <input
      type="text"
      placeholder="Search messages..."
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
      className={`w-full pl-10 pr-3 py-1.5 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors duration-200 ${
        isDarkMode
          ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
          : "bg-gray-100 border-gray-200 text-gray-900 placeholder-gray-500"
      }`}
    />
  </div>
);

export default SidebarSearch;