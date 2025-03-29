import React, { useEffect, useState, useMemo } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import LiveCommunications from "./components/Dashboard/LiveCommunications";
import SettingsPage from "./components/Settings/SettingsPage";
import UserManagement from "./components/Users/index";
import LogsPage from "./components/Logs/LogsPage";
import axios from "axios";
import "./App.css";
import { AuthProvider } from './components/AuthContext';
import { PrivateRoute } from './components/PrivateRoute';
import LoginPage from './components/LoginPage';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const CACHE_KEYS = {
  CHANNELS: 'cached_channels',
  MESSAGES: 'cached_messages',
  KEYWORDS: 'cached_keywords',
  TIMEZONE: 'cached_timezone',
  LAST_FETCH: 'last_fetch_time'
};

const CACHE_DURATION = 50 * 60 * 1000; // 50 minutes in milliseconds

const validateTimezone = (tz) => {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: tz });
    return true;
  } catch (e) {
    return false;
  }
};

// Move cache functions here, before they're used
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

const App = () => {
  const [channels, setChannels] = useState({});
  const [messages, setMessages] = useState([]);
  const [keywords, setKeywords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [endpointInput, setEndpointInput] = useState("");
  const [validationStatus, setValidationStatus] = useState("pending");
  const [edgeServerEndpoint, setEdgeServerEndpoint] = useState(
    localStorage.getItem("EDGE_SERVER_ENDPOINT") || process.env.REACT_APP_EDGE_SERVER_ENDPOINT || ""
  );
  
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return JSON.parse(localStorage.getItem("isDarkMode")) || false;
  });
  
  const [timezone, setTimezone] = useState(() => {
    const cachedTimezone = getCachedData(CACHE_KEYS.TIMEZONE);
    return cachedTimezone && validateTimezone(cachedTimezone) ? cachedTimezone : "UTC";
  });

  const toggleTheme = () => setIsDarkMode(prev => !prev);

  const setTimezoneWithLogging = (newTz) => {
    console.log(`Timezone changed from ${timezone} to ${newTz}`);
    setTimezone(newTz);
  };

  useEffect(() => {
    localStorage.setItem("isDarkMode", JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  // Memoized processed messages
  const processedMessages = useMemo(() => {
    return messages.map(message => ({
      ...message,
      localTime: new Date(message.time).toLocaleString('en-US', { timeZone: timezone })
    }));
  }, [messages, timezone]);

  const loadCachedData = () => {
    const cachedChannels = getCachedData(CACHE_KEYS.CHANNELS);
    const cachedMessages = getCachedData(CACHE_KEYS.MESSAGES);
    const cachedKeywords = getCachedData(CACHE_KEYS.KEYWORDS);
    const cachedTimezone = getCachedData(CACHE_KEYS.TIMEZONE);

    if (cachedChannels) setChannels(cachedChannels);
    if (cachedMessages) setMessages(cachedMessages);
    if (cachedKeywords) setKeywords(cachedKeywords);
    if (cachedTimezone && validateTimezone(cachedTimezone)) {
      setTimezoneWithLogging(cachedTimezone);
    }
  };

  const isCacheValid = () => {
    const lastFetch = getCachedData(CACHE_KEYS.LAST_FETCH);
    return lastFetch && (Date.now() - lastFetch < CACHE_DURATION);
  };

  // Endpoint validation
  const validateEndpoint = async (url) => {
    try {
      const response = await axios.get(`${url}/ping`, { timeout: 5000 });
      return response.status === 200;
    } catch (error) {
      console.error("Endpoint validation error:", error);
      return false;
    }
  };

  const handleEndpointSubmit = async () => {
    setValidationStatus("validating");
    setError(null);
    
    try {
      new URL(endpointInput);
      const isValid = await validateEndpoint(endpointInput);
      
      if (isValid) {
        setEdgeServerEndpoint(endpointInput);
        localStorage.setItem("EDGE_SERVER_ENDPOINT", endpointInput);
        setShowModal(false);
        setValidationStatus("pending");
      } else {
        throw new Error("Could not connect to server");
      }
    } catch (error) {
      setValidationStatus("failed");
      setError(error.message);
    }
  };

  // Initial load
  useEffect(() => {
    const initialize = async () => {
      if (!edgeServerEndpoint) {
        setShowModal(true);
        return;
      }

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
  }, [edgeServerEndpoint]);

  // Data fetching
  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [channelsRes, messagesRes, keywordsRes] = await Promise.all([
        axios.get(`${edgeServerEndpoint}/channels`),
        axios.get(`${edgeServerEndpoint}/recordings`),
        axios.get(`${edgeServerEndpoint}/settings`)
      ]);

      // Process channels
      const channelsData = channelsRes.data.reduce((acc, channel) => {
        if (channel.status !== 'disabled') {
          acc[channel.id] = {
            name: channel.name,
            status: channel.status,
            id: channel.id,
            driver: channel.driver,
            person: channel.person,
            car: channel.car,
            color: channel.color,
            background_color: channel.background_color,
            team_color: channel.team_color,
            silence: channel.silence,
            mac: channel.mac,
            sensitivity: channel.sensitivity,
            min_rec: channel.min_rec,
            max_rec: channel.max_rec,
            audio_gain: channel.audio_gain,
            tag: channel.tag,
            isActive: true,
          };
        }
        return acc;
      }, {});

      // Process messages
      const messagesData = messagesRes.data.map(item => ({
        channel: item.channel_id.toString(),
        team: `Channel ${item.channel_id}`,
        time: item.timestamp,
        timezone: timezone,
        status: item.hasOwnProperty("status") ? item.status : "new", // Ensures default value for old DB
        id: item.id,
        url: `${edgeServerEndpoint}/${item.filename.replace(/\\/g, '/')}`,
        message: item.transcription || "No transcription available",
        isNew: true,
      }));

      // Update state
      setChannels(channelsData);
      setMessages(messagesData);
      setKeywords(keywordsRes.data.keywords);

      // Handle timezone
      const newTimezone = keywordsRes.data.global_timezone || "UTC";
      if (validateTimezone(newTimezone)) {
        setTimezoneWithLogging(newTimezone);
        cacheData(CACHE_KEYS.TIMEZONE, newTimezone);
      } else {
        console.warn(`Invalid timezone received: ${newTimezone}, falling back to UTC`);
        setTimezoneWithLogging("UTC");
        cacheData(CACHE_KEYS.TIMEZONE, "UTC");
      }

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
    if (!edgeServerEndpoint) return;

    const updateInterval = setInterval(async () => {
      try {
        await fetchAllData();
      } catch (error) {
        console.error("Update error:", error);
      }
    }, 5000);

    return () => clearInterval(updateInterval);
  }, [edgeServerEndpoint]);

  if (loading && !Object.keys(channels).length) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error && !showModal) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl text-red-600">
          {error}
          <button 
            onClick={() => setShowModal(true)}
            className="ml-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Configure Endpoint
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md p-6 mx-4 bg-white rounded-lg shadow-xl">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-gray-800">
                {validationStatus === "failed" 
                  ? "Connection Failed" 
                  : "Enter Edge Server Endpoint"}
              </h2>
              <p className="mt-2 text-sm text-gray-600">
                {validationStatus === "failed"
                  ? "Unable to connect to the server. Please check the URL and try again."
                  : "Please provide the URL for your Edge Server endpoint to continue."}
              </p>
              {error && (
                <p className="mt-2 text-sm text-red-600">{error}</p>
              )}
            </div>

            <div className="mt-4">
              <input
                type="url"
                placeholder="https://your-server.com"
                value={endpointInput}
                onChange={(e) => setEndpointInput(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  validationStatus === "failed" ? "border-red-500" : "border-gray-300"
                }`}
              />
            </div>

            <div className="mt-6">
              <button
                onClick={handleEndpointSubmit}
                disabled={validationStatus === "validating"}
                className="w-full px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:bg-blue-400"
              >
                {validationStatus === "validating" 
                  ? "Connecting..." 
                  : validationStatus === "failed"
                  ? "Try Again"
                  : "Connect to Server"}
              </button>
            </div>
          </div>
        </div>
      )}

      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={
              <LoginPage 
                toggleTheme={toggleTheme} 
                isDarkMode={isDarkMode} 
                setIsDarkMode={setIsDarkMode}   
                edgeServerEndpoint={edgeServerEndpoint}  
              />
            } />
            <Route path="/" element={
              <PrivateRoute>
                <LiveCommunications
                  timezone={timezone}
                  isDarkMode={isDarkMode}
                  edgeServerEndpoint={edgeServerEndpoint}
                  setMessages={setMessages}
                  setIsDarkMode={setIsDarkMode}
                  toggleTheme={toggleTheme}
                  channels={channels} 
                  messages={processedMessages}
                  keywords={keywords}
                />
              </PrivateRoute>
            } />
            <Route path="/settings" element={
              <PrivateRoute>
                <SettingsPage isDarkMode={isDarkMode} timezone={timezone} />
              </PrivateRoute>
            } />
            <Route path="/users" element={
              <PrivateRoute>
                <UserManagement isDarkMode={isDarkMode} />
              </PrivateRoute>
            } />
            <Route path="/logs" element={
              <PrivateRoute>
                <LogsPage edgeServerEndpoint={edgeServerEndpoint} timezone={timezone} />
              </PrivateRoute>
            } />
          </Routes>
        </Router>
        <ToastContainer />
      </AuthProvider>
    </>
  );
};
export default App;