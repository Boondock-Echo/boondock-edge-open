import React, { useState, useEffect } from "react";
import { Volume, Volume1, Volume2, WifiOff, Activity, Loader2  ,CircleDashed } from "lucide-react";

const ChannelItem = ({ 
  channel, 
  isActive, 
  channelMessageCounts, 
  isDarkMode, 
  handleToggleChannel, 
  handleSettingsClick 
}) => {
  const messageCount = channelMessageCounts[channel.id] || 0;
  const formattedCount = messageCount < 1000 ? messageCount.toString() : `${(messageCount / 1000).toFixed(2)}K`;
  
  // State for volume icon animation
  const [volumeIconIndex, setVolumeIconIndex] = useState(0);
  
  // Animation effect for volume icons when recording
  useEffect(() => {
    let interval;
    if (channel.status === 'record_begin') {
      interval = setInterval(() => {
        setVolumeIconIndex((prev) => (prev + 1) % 3);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [channel.status]);

  // Volume icons array for animation
  const VolumeIcons = [Volume, Volume1, Volume2];

  // Function to determine which icon to show based on channel status
  const StatusIcon = () => {
    switch (channel.status) {
      case 'record_begin': {
        const CurrentVolumeIcon = VolumeIcons[volumeIconIndex];
        return (
          <div className="relative">
            <div className="relative">
              <CurrentVolumeIcon 
                className={`h-4 w-4 transition-all duration-300 ${
                  isDarkMode ? "text-green-400" : "text-green-600"
                }`}
              />
              {/* <div className="absolute -inset-0.5 rounded-full bg-current opacity-10 animate-ping" /> */}
            </div>
            {/* <div className="absolute -right-4 top-1/2 -translate-y-1/2 flex items-center space-x-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`w-0.5 h-2 rounded-full transition-all duration-300 ${
                    isDarkMode ? "bg-green-400" : "bg-green-600"
                  }`}
                  style={{
                    animation: `typing 1s ease-in-out infinite ${i * 0.2}s`,
                    height: `${6 + Math.sin((Date.now() / 300) + i) * 4}px`
                  }}
                />
              ))}
            </div> */}
          </div>
        );
      }
      case 'record_end':
        return (
          <div className="relative">
            <Volume2 
              className={`h-4 w-4 transition-colors duration-300 ${
                isDarkMode ? "text-gray-400" : "text-gray-500"
              } opacity-50`}
            />
          </div>
        );
      case 'offline':
        return (
          <div className="relative">
            <Volume 
              className={`h-4 w-4 transition-colors duration-300 ${
                isDarkMode ? "text-red-400" : "text-red-500"
              }`}
            />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-px bg-red-500 rotate-45" />
          </div>
        );
      case 'online':
        return (
          <div className="relative">
            <Volume2
              className={`h-4 w-4 transition-colors duration-300 ${
                isDarkMode ? "text-green-400" : "text-green-500"
              }`}
            />
            <div className="absolute -right-1 -top-1">
              <div className="h-1.5 w-1.5 rounded-full text-green-400 bg-current animate-pulse opacity-75" />
            </div>
          </div>
        );
      case 'busy':
        return (
          <div className="relative">
            {/* <Volume1
              className={`h-4 w-4 transition-colors duration-300 ${
                isDarkMode ? "text-amber-400" : "text-amber-500"
              }`}
            /> */}
            <div className=" right-0 top-0 flex space-x-0.5">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className={`w-1 h-1 rounded-full ${
                    isDarkMode ? "bg-amber-400" : "bg-amber-500"
                  }`}
                  style={{
                    animation: `bounce 1s ease-in-out infinite ${i * 0.2}s`
                  }}
                />
              ))}
            </div>
          </div>
        );
      default:
        return (
          <Volume1
            className={`h-4 w-4 ${isDarkMode ? "text-blue-400" : "text-blue-500"}`}
          />
        );
    }
  };

  return (
    <div
      onClick={() => handleSettingsClick(channel)}
      className={`group flex justify-between items-center p-2 rounded-md transition-all duration-300 cursor-pointer text-sm ${
        isDarkMode
          ? isActive
            ? "bg-gray-700/90 shadow-lg shadow-blue-800/10"
            : "hover:bg-gray-700/80"
          : isActive
            ? "bg-white/90 shadow-sm"
            : "hover:bg-gray-100/80"
      }`}
    >
      {/* Channel Info */}
      <div className="flex items-center space-x-2 truncate min-w-0">
        <div 
          className="w-2 h-2 rounded-full flex-shrink-0" 
           onClick={() => handleSettingsClick(channel)}
          style={{ backgroundColor: channel.team_color }}
        />
        <span className={`truncate ${
          isDarkMode 
            ? (isActive ? "text-white" : "text-gray-400") 
            : (isActive ? "text-gray-800" : "text-gray-500")
        }`}
        
         >
          {channel.name}
        </span>
      </div>
      
      {/* Stats and Controls */}
      <div className="flex items-center space-x-3 ml-2">
        <span className={`px-2 py-0.5 text-xs rounded-full ${
          isDarkMode 
            ? "bg-blue-900/50 text-blue-300" 
            : "bg-blue-100 text-blue-700"
        }`}
        
        >
          {formattedCount}
        </span>
        
        <StatusIcon
        
          />

        <label className="relative inline-flex items-center"
        onClick={(e) => e.stopPropagation()}
        >
          <input 
            type="checkbox" 
            className="sr-only peer" 
            checked={isActive} 
            onChange={() => handleToggleChannel(channel.id)} 
          />
          <div className={`w-8 h-4 rounded-full peer transition-all duration-300 ${
            isDarkMode 
              ? "bg-gray-600 peer-checked:bg-blue-600" 
              : "bg-gray-300 peer-checked:bg-blue-500"
          } after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-3 after:w-3 after:transition-all after:duration-300 peer-checked:after:translate-x-4`} />
        </label>
      </div>
    </div>
  );
};

export default ChannelItem;