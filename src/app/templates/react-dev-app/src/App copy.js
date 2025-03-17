import React, { useEffect, useState } from "react";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import LiveCommunications from "./components/LiveCommunications";
import SettingsPage from "./components/SettingsPage";
import LogsPage from "./components/LogsPage";  // Add this import
import axios from "axios";
import "./App.css";

const CACHE_KEYS = {
  CHANNELS: 'cached_channels',
  MESSAGES: 'cached_messages',
  KEYWORDS: 'cached_keywords',
  LAST_FETCH: 'last_fetch_time'
};

const CACHE_DURATION = 50 * 60 * 1000; // 5 minutes in milliseconds

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

  // Endpoint validation
  const validateEndpoint = async (url) => {
    try {
      const response = await axios.get(`${url}/channels`, { timeout: 5000 });
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
        url: `${edgeServerEndpoint}/${item.filename.replace(/\\/g, '/')}`,
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

      <Router>
        <div className="h-screen">
          <Routes>
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/logs" element={<LogsPage edgeServerEndpoint={edgeServerEndpoint} />} />
            <Route
              path="/"
              element={<LiveCommunications channels={channels} messages={messages} keywords={keywords} />}
            />
          </Routes>
        </div>
      </Router>
    </>
  );
};

export default App;