import React, { useState, useEffect } from "react";
import SidebarHeader from "./SidebarHeader";
import SidebarSearch from "./SidebarSearch";
import ChannelItem from "./ChannelItem";
import KeywordsSection from "./KeywordsSection";
import SidebarFooter from "./SidebarFooter";
import ChannelSettingsModal from "./ChannelSettingsModal";
import axios from "axios";

const TeamsSidebar = ({
  isDarkMode,
  toggleTheme,
  setIsDarkMode,
  channels,
  setChannels,
  activeChannels,
  setActiveChannels,
  activeKeywords,
  toggleKeyword,
  searchQuery,
  setSearchQuery,
  keywordCounts,
  channelMessageCounts,
  API_BASE_URL,
  isMobile,
  closeSidebar
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState("channels");

  useEffect(() => {
    const storedActiveChannels = JSON.parse(localStorage.getItem("activeChannels"));
    if (storedActiveChannels) setActiveChannels(storedActiveChannels);
  }, [setActiveChannels]);

  const handleToggleChannel = (channelId) => {
    setActiveChannels((prev) => {
      const updatedChannels = { ...prev, [channelId]: !prev[channelId] };
      localStorage.setItem("activeChannels", JSON.stringify(updatedChannels));
      return updatedChannels;
    });
  };

  const handleSettingsClick = (channel) => {
    setSelectedChannel(channel);
    setIsSettingsOpen(true);
  };

  const handleSave = async (channelId, updatedChannel) => {
    setIsSaving(true);
    try {
      const response = await axios.put(`${API_BASE_URL}/channel/${channelId}`, updatedChannel);
      if (response.data) {
        setChannels((prevChannels) => ({
          ...prevChannels,
          [channelId]: { ...prevChannels[channelId], ...updatedChannel },
        }));
      }
      setIsSettingsOpen(false);
    } catch (error) {
      console.error("Error updating channel:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeywordClick = (keyword) => toggleKeyword(keyword);

  return (
    <div
      className={`flex flex-col h-full transition-colors duration-300 ${
        isDarkMode ? "bg-gray-900 border-gray-700" : "bg-gray-50 border-gray-200"
      } ${isMobile ? 'w-full' : 'w-72'}`}
    >
      <SidebarHeader 
        isDarkMode={isDarkMode} 
        toggleTheme={toggleTheme}
        isMobile={isMobile}
        closeSidebar={closeSidebar}
      />
      <SidebarSearch 
        searchQuery={searchQuery} 
        setSearchQuery={setSearchQuery} 
        isDarkMode={isDarkMode}
      />

      {/* Tab Navigation */}
      <div className="flex border-b px-4 sm:px-6">
        <button
          className={`flex-1 py-2 text-sm font-medium ${
            activeTab === "channels"
              ? isDarkMode
                ? "text-white border-b-2 border-blue-500"
                : "text-gray-900 border-b-2 border-blue-500"
              : isDarkMode
              ? "text-gray-400 hover:text-white"
              : "text-gray-500 hover:text-gray-900"
          }`}
          onClick={() => setActiveTab("channels")}
        >
          Channels
        </button>
        <button
          className={`flex-1 py-2 text-sm font-medium ${
            activeTab === "keywords"
              ? isDarkMode
                ? "text-white border-b-2 border-blue-500"
                : "text-gray-900 border-b-2 border-blue-500"
              : isDarkMode
              ? "text-gray-400 hover:text-white"
              : "text-gray-500 hover:text-gray-900"
          }`}
          onClick={() => setActiveTab("keywords")}
        >
          Keyword Tracker
        </button>
      </div>

      {/* Tab Content */}
      <div className={`flex-grow overflow-auto px-4 py-2 pb-6 ${isDarkMode ? "dark-mode-scrollbar" : ""}`}>
        {activeTab === "channels" && (
          <div className="space-y-2 mb-6">
            {Object.entries(channels).map(([channelId, channel]) => (
              <ChannelItem
                key={channelId}
                channel={channel}
                isActive={activeChannels[channelId]}
                channelMessageCounts={channelMessageCounts}
                isDarkMode={isDarkMode}
                handleToggleChannel={() => handleToggleChannel(channelId)}
                handleSettingsClick={handleSettingsClick}
              />
            ))}
          </div>
        )}

        {activeTab === "keywords" && (
          <KeywordsSection
            keywordCounts={keywordCounts}
            activeKeywords={activeKeywords}
            handleKeywordClick={handleKeywordClick}
            isDarkMode={isDarkMode}
          />
        )}
      </div>

      <SidebarFooter activeChannels={activeChannels} isDarkMode={isDarkMode} />
      <ChannelSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        channel={selectedChannel}
        onSave={handleSave}
        isSaving={isSaving}
        isDarkMode={isDarkMode}
      />
    </div>
  );
};

export default TeamsSidebar;