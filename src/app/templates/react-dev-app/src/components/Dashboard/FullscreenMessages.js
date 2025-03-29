import React, { useRef, useEffect, useState, useCallback } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import axios from "axios";

const FullscreenMessages = ({ 
  edgeServerEndpoint,
  messages, 
  channels,
  showTime,
  showCar,
  showChannel,
  showPerson,
  formatTime,
  timezone,
  highlightText,
  searchQuery,
  handlePlayAudio,
  AudioIcon,
  isFullscreen,
  onToggleFullscreen,
  isDarkMode,
  setMessages,
  isMobile
}) => {
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const toastTimeoutRef = useRef(null);
  const toastIdRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [deletingIds, setDeletingIds] = useState(new Set());
  const [hiddenMessages, setHiddenMessages] = useState(new Set());

  const showToast = useCallback((message, type = 'success') => {
    const toastOptions = {
      position: isMobile ? 'bottom-center' : 'top-right',
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      theme: isDarkMode ? "dark" : "light",
    };

    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    if (toastIdRef.current) toast.dismiss(toastIdRef.current);

    toastTimeoutRef.current = setTimeout(() => {
      toastIdRef.current = type === 'success'
        ? toast.success(message, toastOptions)
        : toast.error(message, toastOptions);
    }, 100);
  }, [isDarkMode, isMobile]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      if (toastIdRef.current) toast.dismiss(toastIdRef.current);
    };
  }, []);

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    setIsAtBottom(Math.abs(scrollHeight - scrollTop - clientHeight) < 10);
  };

  useEffect(() => {
    if (isAtBottom && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isAtBottom]);

  const deleteMessage = async (id) => {
    setHiddenMessages(prev => new Set([...prev, id]));
    setDeletingIds(prev => new Set([...prev, id]));
    
    try {
      await axios.delete(`${edgeServerEndpoint}/recordings/${id}`);
      setMessages(prev => prev.filter(msg => msg.id !== id));
      showToast("Message deleted", "success");
    } catch (error) {
      console.error("Error deleting message:", error);
      setHiddenMessages(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
      showToast("Failed to delete message", "error");
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  return (
    <div className={`relative ${isDarkMode ? "bg-gray-900" : "bg-white"} ${isFullscreen ? "fixed inset-0 z-50" : "flex-1"}`}>
      <div 
        ref={messagesContainerRef}
        className={`overflow-y-auto ${isDarkMode ? "dark-mode-scrollbar" : ""} ${
          isFullscreen 
            ? "h-screen p-4 sm:p-6" 
            : "flex-1 max-h-[calc(100vh-100px)] p-2 sm:p-4"
        }`}
        onScroll={handleScroll}
      >
        <div className={`${isMobile ? 'space-y-1' : 'max-w-6xl mx-auto space-y-2'}`}>
          {messages.map((item, index) => !hiddenMessages.has(item.id) && (
            <div
              key={index}
              className={`flex items-start space-x-2 mb-2 min-w-0 ${isFullscreen && !isMobile ? "mx-auto" : ""}`}
              style={{ 
                backgroundColor: channels[item.channel]?.background_color || "transparent",
              }}
            >
              {showTime && (
                <span className={`flex-shrink-0 text-gray-400 ${isMobile ? 'text-xs' : 'text-sm'} font-mono`}>
                  [{formatTime(item.time, timezone)}]
                </span>
              )}

              <span
                className={`flex-shrink-0 font-semibold whitespace-nowrap ${isMobile ? 'text-sm' : ''}`}
                style={{ color: channels[item.channel]?.team_color }}
              >
                {[
                  showCar && channels[item.channel]?.tag,
                  showChannel && channels[item.channel]?.name,
                  showPerson && `(${channels[item.channel]?.person || "Driver"})`,
                ]
                  .filter(Boolean)
                  .join("-")}
              </span>

              <div
                className="flex-grow min-w-0 cursor-pointer group"
                onClick={() => item.url && handlePlayAudio(item.url)}
              >
                <div className={`break-words ${isMobile ? 'text-sm' : ''}`} style={{ color: channels[item.channel]?.color }}>
                  {item.message !== "No transcription available" && highlightText(item.message, searchQuery)}
                  {item.message === "No transcription available" && item.status === "queued" && (
                    <span className={`inline-block ml-2 px-2 py-1 ${isMobile ? 'text-xs' : 'text-xs'} font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300`}>
                      {item.status}
                    </span>
                  )}
                  {item.message === "No transcription available" && item.status === "queue_failed" && (
                    <span className={`inline-block ml-2 px-2 py-1 ${isMobile ? 'text-xs' : 'text-xs'} font-medium rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300`}>
                      failed Job
                    </span>
                  )}
                  {item.url && (
                    <span className="inline-flex ml-2">
                      <AudioIcon url={item.url} />
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => deleteMessage(item.id)}
                className={`p-2 text-red-500 hover:text-red-700 disabled:text-red-300 ${isMobile ? 'p-1' : 'p-2'}`}
                disabled={deletingIds.has(item.id)}
                title="Delete Message"
              >
                {deletingIds.has(item.id) ? (
                  <Loader2 className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'} animate-spin`} />
                ) : (
                  <Trash2 className={`${isMobile ? 'w-4 h-4' : 'w-5 h-5'}`} />
                )}
              </button>
            </div>
          ))}
          <div ref={messagesEndRef} className="h-px" />
        </div>
      </div>
    </div>
  );
};
export default FullscreenMessages;