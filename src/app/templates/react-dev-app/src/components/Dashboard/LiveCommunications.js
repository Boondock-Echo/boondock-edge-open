import React, { useEffect, useRef, useState } from "react";
import TeamsSidebar from "./Sidebar";
import { Volume2, Volume1, ChevronLeft, ChevronRight, Menu, X } from "lucide-react";
import TopBar from "./TopBar";
import FooterPagination from "./FooterPagination";
import FullscreenMessages from './FullscreenMessages';
import FloatingChatbot from './FloatingChatbot';

const channelColors = {
  0: "#f43f5e",
  1: "#ff8b2d",
  2: "#2d84ff",
  3: "#34d399",
  4: "#6b7280",
};
const ITEMS_PER_PAGE = 100;
const TIME_FILTERS = {
  ALL: 'All',
  '30MIN': 'Last 30 mins',
  '1HOUR': 'Last 1 hour',
  '2HOUR': 'Last 2 hours',
  '4HOUR': 'Last 4 hours',
  '8HOUR': 'Last 8 hours',
  '24HOUR': 'Last 1 Day',
  '48HOUR': 'Last 2 Days',
  '168HOUR': 'Last Week',
};

const LiveCommunications = ({ edgeServerEndpoint, toggleTheme, channels, timezone, isDarkMode, setMessages, setIsDarkMode, messages, keywords }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeKeywords, setActiveKeywords] = useState(new Set());
  const [isVolumeOn, setIsVolumeOn] = useState(false);
  const [keywordCounts, setKeywordCounts] = useState({});
  const [playingAudio, setPlayingAudio] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [timeFilter, setTimeFilter] = useState(() => {
    const savedTimeFilter = localStorage.getItem('timeFilter');
    return savedTimeFilter || TIME_FILTERS.ALL;
  });
  const [activeAudioUrl, setActiveAudioUrl] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const audioRef = useRef(new Audio());
  const [iconToggle, setIconToggle] = useState(false);
  const [channelMessageCounts, setChannelMessageCounts] = useState({});
  const [activeChannels, setActiveChannels] = useState(
    Object.keys(channels).reduce((acc, channelId) => {
      acc[channelId] = channels[channelId]?.isActive || true;
      return acc;
    }, {})
  );
  const [isFullscreen, setIsFullscreen] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesListRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [previousMessages, setPreviousMessages] = useState([]);
  const [newMessages, setNewMessages] = useState(false);
  const [recordsPerPage, setRecordsPerPage] = useState(20);
  
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const isMobile = windowWidth < 768;

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const API_BASE_URL = `${edgeServerEndpoint}`;

  const [branding, setBranding] = useState({
    organizationName: 'Boondock Edge',
    tagline: 'Justice in Motion',
    brandColors: { accent: '#ff2424', primary: '#0a58ff', secondary: '#b15990' },
    font: 'Poppins',
    assets: { logo: null, favicon: null, loader: null }
  });
  const [brandingLoaded, setBrandingLoaded] = useState(false);

  // Toggle sidebar and log state for debugging
  const toggleSidebar = (e) => {
    e.stopPropagation();
    console.log("Menu button clicked, current isSidebarOpen:", isSidebarOpen);
    setIsSidebarOpen(prev => {
      const newState = !prev;
      console.log("New sidebar state:", newState);
      return newState;
    });
  };

  // Close sidebar when clicking outside on mobile
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (isMobile && isSidebarOpen && !e.target.closest('.sidebar-container')) {
        console.log("Clicked outside, closing sidebar");
        setIsSidebarOpen(false);
      }
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [isMobile, isSidebarOpen]);

  

  useEffect(() => {
    const fetchBrandingData = async () => {
      try {
        const response = await fetch(`${edgeServerEndpoint}/branding`);
        if (!response.ok) throw new Error('Failed to fetch branding data');
        const data = await response.json();
        setBranding({
          organizationName: data.organization_name || 'Boondock Edge',
          tagline: data.tagline || 'Justice in Motion',
          brandColors: {
            accent: data.brand_colors?.accent || '#ff2424',
            primary: data.brand_colors?.primary || '#0a58ff',
            secondary: data.brand_colors?.secondary || '#b15990'
          },
          font: data.font || 'Poppins',
          assets: {
            logo: data.assets?.logo ? `data:image/jpeg;base64,${data.assets.logo}` : null,
            favicon: data.assets?.favicon ? `data:image/x-icon;base64,${data.assets.favicon}` : null,
            loader: data.assets?.loader ? `data:image/gif;base64,${data.assets.loader}` : null
          }
        });
      } catch (error) {
        console.error('Error fetching branding data:', error);
      } finally {
        setBrandingLoaded(true);
      }
    };
    fetchBrandingData();
  }, [edgeServerEndpoint]);

  useEffect(() => {
    if (brandingLoaded && branding.assets.favicon) {
      const link = document.querySelector("link[rel*='icon']") || document.createElement('link');
      link.type = 'image/x-icon';
      link.rel = 'shortcut icon';
      link.href = branding.assets.favicon;
      document.getElementsByTagName('head')[0].appendChild(link);
    }
  }, [brandingLoaded, branding.assets.favicon]);

  const filterMessagesByTime = (messages) => {
    if (timeFilter === TIME_FILTERS.ALL) return messages;
    const now = new Date();
    const filterMinutes = {
      [TIME_FILTERS['30MIN']]: 30,
      [TIME_FILTERS['1HOUR']]: 60,
      [TIME_FILTERS['2HOUR']]: 120,
      [TIME_FILTERS['4HOUR']]: 240,
      [TIME_FILTERS['8HOUR']]: 480,
      [TIME_FILTERS['24HOUR']]: 1440,
      [TIME_FILTERS['48HOUR']]: 2880,
      [TIME_FILTERS['168HOUR']]: 10080,
    }[timeFilter];
    const cutoffTime = new Date(now - filterMinutes * 60000);
    return messages.filter(message => {
      const messageTime = parseTimestamp(message.time);
      return messageTime >= cutoffTime;
    });
  };

  useEffect(() => {
    localStorage.setItem('timeFilter', timeFilter);
  }, [timeFilter]);

  useEffect(() => {
    const filteredMessages = filterMessagesByTime(messages);
    const counts = {};
    filteredMessages.forEach((message) => {
      counts[message.channel] = (counts[message.channel] || 0) + 1;
    });
    setChannelMessageCounts(counts);
  }, [messages, timeFilter]);

  const paginateMessages = (messages) => {
    const totalMessages = messages.length;
    const endIndex = totalMessages - (currentPage - 1) * recordsPerPage;
    const startIndex = Math.max(endIndex - recordsPerPage, 0);
    return messages.slice(startIndex, endIndex);
  };

  const getFilteredMessages = () => {
    let filtered = messages.filter((message) => {
      const channelActive = activeChannels[message.channel];
      const matchesSearch = searchQuery
        ? message.message.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      const matchesKeywords =
        activeKeywords.size === 0 ||
        [...activeKeywords].some((keyword) =>
          message.message.toLowerCase().includes(keyword.toLowerCase())
        );
      return channelActive && matchesSearch && matchesKeywords;
    });
    filtered = filterMessagesByTime(filtered);
    return filtered.slice().reverse();
  };

  const getTotalPages = (messagesCount) => Math.ceil(messagesCount / recordsPerPage);

  const handlePlayAudio = (url) => {
    if (playingAudio === url) {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play();
        setIsPlaying(true);
      }
    } else {
      if (audioRef.current) audioRef.current.pause();
      audioRef.current.src = url;
      audioRef.current.play();
      setPlayingAudio(url);
      setIsPlaying(true);
    }
  };

  useEffect(() => {
    audioRef.current.onended = () => {
      setIsPlaying(false);
      setPlayingAudio(null);
    };
  }, []);

  useEffect(() => {
    let interval;
    if (isPlaying) {
      interval = setInterval(() => setIconToggle(prev => !prev), 500);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    if (!keywords?.length) return;
    const filteredMessages = filterMessagesByTime(messages);
    const counts = {};
    keywords.forEach(keyword => {
      let count = 0;
      filteredMessages.forEach(msg => {
        const regex = new RegExp(keyword, 'gi');
        const matches = msg.message.match(regex);
        if (matches) count += matches.length;
      });
      if (count > 0) counts[keyword] = count;
    });
    setKeywordCounts(counts);
  }, [messages, keywords, timeFilter]);

  const AudioIcon = ({ url }) => {
    const isCurrentlyPlaying = playingAudio === url && isPlaying;
    return isCurrentlyPlaying ? (
      iconToggle ? (
        <Volume2 className="inline ml-2 text-blue-500 cursor-pointer" size={18} />
      ) : (
        <Volume1 className="inline ml-2 text-blue-500 cursor-pointer" size={18} />
      )
    ) : (
      <Volume1 className="inline ml-2 text-gray-400 cursor-pointer" size={18} />
    );
  };

  const toggleKeyword = (keywordId) => {
    setActiveKeywords((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(keywordId)) newSet.delete(keywordId);
      else newSet.add(keywordId);
      return newSet;
    });
  };

  const parseTimestamp = (timestamp) => {
    const year = parseInt(timestamp.substring(0, 4));
    const month = parseInt(timestamp.substring(4, 6)) - 1;
    const day = parseInt(timestamp.substring(6, 8));
    const hours = parseInt(timestamp.substring(9, 11));
    const minutes = parseInt(timestamp.substring(11, 13));
    const seconds = parseInt(timestamp.substring(13, 15));
    const utcDate = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
    return utcDate;
  };

  const formatTime = (timestamp, timezone = "America/Chicago") => {
    const date = parseTimestamp(timestamp);
    const options = { timeZone: timezone };
    const now = new Date();
    const todayInTimezone = new Date(now.toLocaleString("en-US", options));
    const yesterdayInTimezone = new Date(todayInTimezone);
    yesterdayInTimezone.setDate(yesterdayInTimezone.getDate() - 1);

    const timeFormatOptions = { 
      timeZone: timezone,
      hour: "2-digit", 
      minute: "2-digit", 
      second: "2-digit",
      hour12: true
    };
    
    const dateTimeFormatOptions = {
      timeZone: timezone,
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== todayInTimezone.getFullYear() ? "numeric" : undefined,
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true
    };

    const dateInTimezone = new Date(date.toLocaleString("en-US", options));
    if (
      dateInTimezone.getDate() === todayInTimezone.getDate() &&
      dateInTimezone.getMonth() === todayInTimezone.getMonth() &&
      dateInTimezone.getFullYear() === todayInTimezone.getFullYear()
    ) {
      return date.toLocaleString("en-US", timeFormatOptions);
    } else if (
      dateInTimezone.getDate() === yesterdayInTimezone.getDate() &&
      dateInTimezone.getMonth() === yesterdayInTimezone.getMonth() &&
      dateInTimezone.getFullYear() === yesterdayInTimezone.getFullYear()
    ) {
      return `Yesterday ${date.toLocaleString("en-US", timeFormatOptions)}`;
    } else {
      return date.toLocaleString("en-US", dateTimeFormatOptions);
    }
  };

  const highlightText = (text, searchQuery) => {
    let characters = text.split('');
    let spans = Array(characters.length).fill(null);

    if (keywords?.length) {
      keywords.forEach(keyword => {
        const regex = new RegExp(keyword, 'gi');
        let match;
        while ((match = regex.exec(text)) !== null) {
          for (let i = match.index; i < match.index + match[0].length; i++) {
            if (!spans[i]) spans[i] = { text: characters[i], isKeyword: true };
          }
        }
      });
    }

    if (searchQuery) {
      const regex = new RegExp(searchQuery, 'gi');
      let match;
      while ((match = regex.exec(text)) !== null) {
        for (let i = match.index; i < match.index + match[0].length; i++) {
          if (!spans[i]) spans[i] = { text: characters[i], isSearch: true };
          else spans[i] = { ...spans[i], isSearch: true };
        }
      }
    }

    let result = [];
    let currentSpan = null;

    for (let i = 0; i < characters.length; i++) {
      if (!spans[i]) {
        if (currentSpan) {
          result.push(currentSpan);
          currentSpan = null;
        }
        result.push(characters[i]);
        continue;
      }

      const { text, isKeyword, isSearch } = spans[i];
      const className = `${isKeyword ? 'underline font-bold' : ''} ${isSearch ? 'bg-yellow-200' : ''}`.trim();

      if (!currentSpan || currentSpan.props.className !== className) {
        if (currentSpan) result.push(currentSpan);
        currentSpan = <span key={`span-${i}`} className={className}>{text}</span>;
      } else {
        currentSpan = React.cloneElement(currentSpan, { children: currentSpan.props.children + text });
      }
    }

    if (currentSpan) result.push(currentSpan);
    return result;
  };

  const filteredMessages = messages.filter((message) => {
    const channelActive = activeChannels[message.channel];
    const matchesSearch = searchQuery
      ? message.message.toLowerCase().includes(searchQuery.toLowerCase())
      : true;
    const matchesKeywords =
      activeKeywords.size === 0 ||
      [...activeKeywords].some((keyword) =>
        message.message.toLowerCase().includes(keyword.toLowerCase())
      );
    return channelActive && matchesSearch && matchesKeywords;
  });

  const handleScroll = () => {
    const { scrollTop, scrollHeight, clientHeight } = messagesListRef.current;
    setIsAtBottom(scrollHeight - scrollTop === clientHeight);
  };

  useEffect(() => {
    if (messages.length > previousMessages.length) setNewMessages(true);
  }, [messages, previousMessages]);

  useEffect(() => {
    setPreviousMessages(messages);
  }, [messages]);

  useEffect(() => {
    if (isAtBottom && newMessages && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
      setNewMessages(false);
    }
  }, [messages, isAtBottom, newMessages]);

  const LOCAL_STORAGE_KEYS = {
    showTime: "showTime",
    showCar: "showCar",
    showChannel: "showChannel",
    showPerson: "showPerson",
    timeFilter: "timeFilter" 
  };

  const getInitialVisibilityState = (key, defaultValue) =>
    localStorage.getItem(key) === null
      ? defaultValue
      : JSON.parse(localStorage.getItem(key));

  const [showTime, setShowTime] = useState(() => getInitialVisibilityState(LOCAL_STORAGE_KEYS.showTime, true));
  const [showCar, setShowCar] = useState(() => getInitialVisibilityState(LOCAL_STORAGE_KEYS.showCar, true));
  const [showChannel, setShowChannel] = useState(() => getInitialVisibilityState(LOCAL_STORAGE_KEYS.showChannel, true));
  const [showPerson, setShowPerson] = useState(() => getInitialVisibilityState(LOCAL_STORAGE_KEYS.showPerson, true));

  useEffect(() => localStorage.setItem(LOCAL_STORAGE_KEYS.showTime, JSON.stringify(showTime)), [showTime]);
  useEffect(() => localStorage.setItem(LOCAL_STORAGE_KEYS.showCar, JSON.stringify(showCar)), [showCar]);
  useEffect(() => localStorage.setItem(LOCAL_STORAGE_KEYS.showChannel, JSON.stringify(showChannel)), [showChannel]);
  useEffect(() => localStorage.setItem(LOCAL_STORAGE_KEYS.showPerson, JSON.stringify(showPerson)), [showPerson]);
  
  useEffect(() => {
    if (!isMobile && isSidebarOpen) {
      setIsSidebarOpen(false);
    }
  }, [isMobile]);

  return (
    <div className="flex min-h-screen flex-col md:flex-row overflow-hidden">
      {/* Mobile Header */}
      {isMobile && (
        <div className="sticky top-0 z-20 flex items-center justify-between p-2 border-b bg-white dark:bg-gray-800">
          <button 
            onClick={toggleSidebar}
            className="p-2 rounded-md text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          <h1 className="text-lg font-semibold">{branding.organizationName}</h1>
          <div className="w-8" /> {/* Spacer */}
        </div>
      )}

      {/* Sidebar */}
      <div
        className={`sidebar-container transition-transform duration-300 ease-in-out
          ${isMobile 
            ? `fixed top-0 left-0 h-full w-72 z-50 bg-white dark:bg-gray-800 
              ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`
            : 'relative flex-shrink-0 w-72'
          }
          ${isFullscreen ? 'hidden' : ''}`}
      >
        <TeamsSidebar
          isDarkMode={isDarkMode}
          timezone={timezone}
          toggleTheme={toggleTheme}
          setIsDarkMode={setIsDarkMode}
          channels={channels}
          channelColors={channelColors}
          activeChannels={activeChannels}
          setActiveChannels={setActiveChannels}
          activeKeywords={activeKeywords}
          toggleKeyword={toggleKeyword}
          isVolumeOn={isVolumeOn}
          setIsVolumeOn={setIsVolumeOn}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          keywordCounts={keywordCounts}
          channelMessageCounts={channelMessageCounts}
          API_BASE_URL={API_BASE_URL}
          isMobile={isMobile}
          closeSidebar={() => setIsSidebarOpen(false)}
        />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        {!isFullscreen && (
          <TopBar
            branding={branding}
            timezone={timezone}
            isDarkMode={isDarkMode}
            setIsDarkMode={setIsDarkMode}
            timeFilter={timeFilter}
            setTimeFilter={setTimeFilter}
            TIME_FILTERS={TIME_FILTERS}
            showTime={showTime}
            setShowTime={setShowTime}
            showCar={showCar}
            setShowCar={setShowCar}
            showChannel={showChannel}
            setShowChannel={setShowChannel}
            showPerson={showPerson}
            setShowPerson={setShowPerson}
            isMobile={isMobile}
          />
        )}

        {/* Messages */}
        <FullscreenMessages
          setMessages={setMessages}
          edgeServerEndpoint={edgeServerEndpoint}
          isDarkMode={isDarkMode}
          messages={paginateMessages(filterMessagesByTime(filteredMessages.reverse()))}
          channels={channels}
          showTime={showTime}
          showCar={showCar}
          showChannel={showChannel}
          showPerson={showPerson}
          formatTime={formatTime}
          timezone={timezone}
          activeAudioUrl={activeAudioUrl}
          setActiveAudioUrl={setActiveAudioUrl}
          highlightText={highlightText}
          searchQuery={searchQuery}
          handlePlayAudio={handlePlayAudio}
          AudioIcon={AudioIcon}
          isFullscreen={isFullscreen}
          onToggleFullscreen={() => setIsFullscreen(!isFullscreen)}
          isMobile={isMobile}
        />

        {/* Footer */}
        {!isFullscreen && (
          <FooterPagination
            isDarkMode={isDarkMode}
            setIsDarkMode={setIsDarkMode}
            currentPage={currentPage}
            setCurrentPage={setCurrentPage}
            getFilteredMessages={getFilteredMessages}
            setRecordsPerPage={setRecordsPerPage}
            recordsPerPage={recordsPerPage}
            getTotalPages={(totalMessages) => Math.ceil(totalMessages / recordsPerPage)}
            isMobile={isMobile}
          />
        )}

        <FloatingChatbot
          isDarkMode={isDarkMode}
          edgeServerEndpoint={edgeServerEndpoint}
          branding={branding}
          channels={channels}
          activeChannels={activeChannels}
        />
      </div>

      {/* Mobile Overlay */}
      {isMobile && isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default LiveCommunications;