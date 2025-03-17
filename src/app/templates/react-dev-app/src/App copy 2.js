import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import LiveCommunications from "./components/LiveCommunications";
import SettingsPage from "./components/SettingsPage";
import LogsPage from "./components/LogsPage";
import axios from "axios";
import "./App.css";

const CACHE_KEYS = {
  CHANNELS: 'cached_channels',
  MESSAGES: 'cached_messages',
  KEYWORDS: 'cached_keywords',
  LAST_FETCH: 'last_fetch_time'
};

const CACHE_DURATION = 50 * 60 * 1000; // 5 minutes in milliseconds

const getBaseUrl = () => {
  const url = window.location.href;
  const urlObj = new URL(url);
  return urlObj.origin; // This will return just the protocol + hostname + port
};

const App = () => {
  const [channels, setChannels] = useState({});
  const [messages, setMessages] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [baseUrl] = useState(getBaseUrl());

  // Cache management functions
  const cacheData = (key, data) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Error caching ${key}:`, error);
    }
  };

  const getCachedData = (key) => {
    try {
      const data = localStorage.getItem(key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Error retrieving ${key} from cache:`, error);
      return null;
    }
  };

  const loadCachedData = () => {
    const cachedChannels = getCachedData(CACHE_KEYS.CHANNELS);
    const cachedMessages = getCachedData(CACHE_KEYS.MESSAGES);
    const cachedKeywords = getCachedData(CACHE_KEYS.KEYWORDS);

    if (cachedChannels) setChannels(cachedChannels);
    if (cachedMessages) setMessages(cachedMessages);
    if (cachedKeywords) setKeywords(cachedKeywords);
  };

  const isCacheValid = () => {
    const lastFetch = getCachedData(CACHE_KEYS.LAST_FETCH);
    return lastFetch && (Date.now() - lastFetch < CACHE_DURATION);
  };

  // Initial load
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      loadCachedData();

      try {
        if (!isCacheValid()) {
          await fetchAllData();
        }
      } catch (error) {
        console.error("Initialization error:", error);
        setError("Failed to initialize application");
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, []);

  // Data fetching
  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [channelsRes, messagesRes, keywordsRes] = await Promise.all([
        axios.get(`${baseUrl}/channels`),
        axios.get(`${baseUrl}/recordings`),
        axios.get(`${baseUrl}/settings`)
      ]);

      // Process channels
      const channelsData = channelsRes.data.reduce((acc, channel) => {
        acc[channel.id] = {
          name: channel.name,
          driver: channel.driver,
          car: channel.car,
          color: channel.color,
          background_color: channel.background_color,
          team_color: channel.team_color,
          isActive: true,
        };
        return acc;
      }, {});

      // Process messages
      const messagesData = messagesRes.data.map(item => ({
        channel: item.channel_id.toString(),
        team: `Channel ${item.channel_id}`,
        time: item.timestamp,
        url: `${baseUrl}/${item.filename.replace(/\\/g, '/')}`,
        message: item.transcription || "No transcription available",
        isNew: true,
      }));

      // Update state
      setChannels(channelsData);
      setMessages(messagesData);
      setKeywords(keywordsRes.data.keywords);

      // Update cache
      cacheData(CACHE_KEYS.CHANNELS, channelsData);
      cacheData(CACHE_KEYS.MESSAGES, messagesData);
      cacheData(CACHE_KEYS.KEYWORDS, keywordsRes.data.keywords);
      cacheData(CACHE_KEYS.LAST_FETCH, Date.now());

      setError(null);
    } catch (error) {
      console.error("Data fetching error:", error);
      setError("Failed to fetch data");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Periodic updates
  useEffect(() => {
    const updateInterval = setInterval(async () => {
      try {
        await fetchAllData();
      } catch (error) {
        console.error("Update error:", error);
      }
    }, 5000);

    return () => clearInterval(updateInterval);
  }, []);

  if (loading && !Object.keys(channels).length) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-600">
          {error}
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="h-screen">
        <Routes>
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/logs" element={<LogsPage baseUrl={baseUrl} />} />
          <Route
            path="/"
            element={<LiveCommunications channels={channels} messages={messages} keywords={keywords} />}
          />
        </Routes>
      </div>
    </Router>
  );
};

export default App;