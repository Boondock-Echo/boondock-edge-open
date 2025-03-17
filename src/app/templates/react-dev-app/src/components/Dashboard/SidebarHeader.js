import React from "react";
import { Moon, Sun, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

const SidebarHeader = ({ isDarkMode, toggleTheme }) => {
  const navigate = useNavigate();

  return (
    <div className="px-6 py-4 bg-inherit">
      <div className="flex items-center justify-between ">
        <h3 className={`text-lg font-semibold ${isDarkMode ? "text-white" : "text-gray-800"}`}>
          Channels
        </h3>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-all duration-200 ${isDarkMode ? "text-gray-400 hover:bg-gray-800" : "text-gray-500 hover:bg-gray-100"}`}
          >
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>
          <button
            onClick={() => navigate("/settings")}
            className={`p-2 rounded-lg transition-all duration-200 ${isDarkMode ? "text-gray-400 hover:bg-gray-800" : "text-gray-500 hover:bg-gray-100"}`}
          >
            <Settings size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SidebarHeader;