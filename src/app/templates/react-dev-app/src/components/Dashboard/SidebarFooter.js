import React from "react";
import { useAuth } from "../AuthContext"; // Adjust the import path
import { LogOut, Settings } from "lucide-react"; // Lucide icons

const SidebarFooter = ({ activeChannels, isDarkMode }) => {
  // const activeCount = Object.values(activeChannels).filter(Boolean).length;
  const { logout, user } = useAuth();

  const handleLogout = () => {
    logout();
    // Optional: redirect after logout
    // window.location.href = '/login';
  };

  const getInitials = (name) => {
    if (!name) return "U";
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  };

  // Get version from .env
  const appVersion = process.env.REACT_APP_VERSION || "v1.0.0"; // Fallback if not set
  const buildDate = process.env.REACT_APP_BUILD_DATE || "Unknown";
  return (
    <div
      className={`mt-auto p-4 border-t transition-colors duration-200 ${
        isDarkMode ? "border-gray-800" : "border-gray-200"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        {/* Avatar and Info Section */}
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium overflow-hidden ${
              isDarkMode
                ? "bg-gray-700 text-gray-200"
                : "bg-gray-200 text-gray-700"
            }`}
          >
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt="User avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              getInitials(user?.name || "User")
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <span
              className={`text-xs truncate ${
                isDarkMode ? "text-gray-400" : "text-black-500"
              }`}
            >
              {user?.name || "Guest"}
            </span>
            <span
            className={`text-[8px]  py-0.5 rounded-md ${
              isDarkMode
                ? "text-gray-400 bg-gray-800/50"
                : "text-gray-500 bg-gray-200/50"
            }`}
          >
            {appVersion} | {buildDate}
          </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleLogout}
            className={`p-1 rounded-md transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-1 ${
              isDarkMode
                ? "text-gray-400 hover:bg-gray-800 focus:ring-gray-600"
                : "text-gray-500 hover:bg-gray-200 focus:ring-gray-400"
            }`}
            title="Logout"
          >
            <LogOut className="w-5 h-5" />
          </button>
          
        </div>
      </div>
    </div>
  );
};

export default SidebarFooter;