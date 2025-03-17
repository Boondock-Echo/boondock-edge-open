import React, { useState, useEffect } from 'react';
import { AlertCircle, AlertTriangle, CalendarCheck, Database, MessageSquare, RefreshCw } from 'lucide-react';
import axios from 'axios';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const LogEntry = ({ log, logTypes, isDarkMode }) => {
  const logType = logTypes[log.level] || logTypes.error;
  const Icon = logType.icon;

  return (
    <div className={`border-l-2 ${logType.borderColor} ${isDarkMode ? logType.bgColorDark : logType.bgColorLight} p-4 font-mono`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          {Icon && <Icon className={`w-4 h-4 ${logType.color}`} />}
          <span className={`text-xs ${logType.color} font-bold tracking-wider`}>
            {log.timestamp}
          </span>
        </div>
        <span className={`px-2 py-1 rounded text-xs ${logType.color} font-bold tracking-wider`}>
          {logType.label}
        </span>
      </div>
      <div className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-1 tracking-wider`}>
        SYSTEM/{log.logger}
      </div>
      <div className={`${isDarkMode ? 'text-gray-200' : 'text-gray-800'} font-mono text-sm whitespace-pre-wrap break-words`}>
        {log.message}
      </div>
    </div>
  );
};

const LoadingSpinner = ({ isDarkMode }) => (
  <div className={`flex flex-col items-center justify-center min-h-[600px] ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
    <div className={`text-xl ${isDarkMode ? 'text-gray-400' : 'text-gray-600'} mb-4 font-mono`}>INITIALIZING SYSTEMS...</div>
    <div className="w-16 h-16 border-t-4 border-red-500 border-solid rounded-full animate-spin"></div>
  </div>
);

const ErrorDisplay = ({ error, onRetry, isDarkMode }) => (
  <div className={`flex flex-col items-center justify-center min-h-[600px] ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
    <div className="text-xl text-red-500 mb-4 font-mono">SYSTEM FAILURE: {error}</div>
    <button
      onClick={onRetry}
      className="px-4 py-2 bg-red-500/20 border border-red-500 text-red-500 rounded hover:bg-red-500/30 transition-colors font-mono"
    >
      RETRY_CONNECTION
    </button>
  </div>
);

const F1TerminalLogs = ({ edgeServerEndpoint, isDarkMode = true }) => {
  const [logs, setLogs] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedType, setSelectedType] = useState('error');
  const [autoRefresh, setAutoRefresh] = useState(false);

  const logTypes = {
    error: {
      label: 'CRITICAL',
      color: 'text-red-500',
      bgColorDark: 'bg-red-500/10',
      bgColorLight: 'bg-red-100',
      borderColor: 'border-red-500/50',
      icon: AlertCircle
    },
    warning: {
      label: 'WARNINGS',
      color: 'text-yellow-500',
      bgColorDark: 'bg-yellow-500/10',
      bgColorLight: 'bg-yellow-100',
      borderColor: 'border-yellow-500/50',
      icon: AlertTriangle
    },
    transcription: {
      label: 'COMMS',
      color: 'text-blue-500',
      bgColorDark: 'bg-blue-500/10',
      bgColorLight: 'bg-blue-100',
      borderColor: 'border-blue-500/50',
      icon: MessageSquare
    },
    database: {
      label: 'DATABASE',
      color: 'text-green-500',
      bgColorDark: 'bg-green-500/10',
      bgColorLight: 'bg-green-100',
      borderColor: 'border-green-500/50',
      icon: Database
    },
    event: {
      label: 'EVENTS',
      color: 'text-purple-500',
      bgColorDark: 'bg-purple-500/10',
      bgColorLight: 'bg-purple-100',
      borderColor: 'border-purple-500/50',
      icon: CalendarCheck
    },
  };

  const fetchLogs = async () => {
    try {
      setLoading(true);
      setError(null);

      if (!edgeServerEndpoint) {
        throw new Error('Server endpoint not configured');
      }

      const response = await axios.get(`${edgeServerEndpoint}/logs`, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
        }
      });

      if (!response.data || typeof response.data !== 'object') {
        throw new Error('Invalid response format');
      }

      const validatedLogs = Object.keys(logTypes).reduce((acc, type) => {
        acc[type] = Array.isArray(response.data[type]) ? response.data[type] : [];
        return acc;
      }, {});

      setLogs(validatedLogs);
    } catch (err) {
      let errorMessage = 'Failed to fetch logs';
      
      if (!edgeServerEndpoint) {
        errorMessage = 'Server endpoint not configured. Please configure the server endpoint first.';
      } else if (err.response) {
        errorMessage = `Server error: ${err.response.status} - ${err.response.data?.error || 'Unknown error'}`;
      } else if (err.request) {
        errorMessage = 'No response from server. Please check your connection.';
      }
      
      setError(errorMessage);
      console.error('Error fetching logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (edgeServerEndpoint) {
      fetchLogs();
    }
    
    let interval;
    if (autoRefresh && edgeServerEndpoint) {
      interval = setInterval(fetchLogs, 30000);
    }
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoRefresh, edgeServerEndpoint]);

  if (loading && !Object.keys(logs).length) {
    return <LoadingSpinner isDarkMode={isDarkMode} />;
  }

  if (error) {
    return <ErrorDisplay error={error} onRetry={fetchLogs} isDarkMode={isDarkMode} />;
  }

  return (
    <div className={`border ${isDarkMode ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-white'} rounded-lg backdrop-blur`}>
      {/* Header */}
      <div className={`border-b ${isDarkMode ? 'border-gray-700' : 'border-gray-200'} p-4 flex justify-between items-center`}>
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-mono font-bold text-red-500">EDGE_LOG_CONTROL</h1>
          <div className="h-4 w-4 bg-green-500 rounded-full animate-pulse"></div>
        </div>
        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2 font-mono">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className={`form-checkbox h-4 w-4 ${isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-100 border-gray-300'} text-red-500 rounded`}
            />
            <span className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>AUTO_SYNC</span>
          </label>
          <button
            onClick={fetchLogs}
            className={`flex items-center space-x-2 px-4 py-2 ${
              isDarkMode 
                ? 'bg-gray-700 text-gray-200 hover:bg-gray-600' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } rounded transition-colors font-mono`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>SYNC</span>
          </button>
          <button
            onClick={async () => {
              try {
                await axios.delete(`${edgeServerEndpoint}/logs/${selectedType}`, {
                  timeout: 5000,
                });
                fetchLogs();
                toast.success(`${logTypes[selectedType]?.label || 'LOG'} logs cleared successfully!`);
              } catch (err) {
                console.error('Error clearing logs:', err);
                toast.error('Failed to clear logs. Please try again.');
              }
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors font-mono"
          >
            <AlertCircle className="w-4 h-4" />
            <span>CLEAR {logTypes[selectedType]?.label || 'LOG'} LOGS</span>
          </button>
        </div>
      </div>

      {/* Log Type Tabs */}
      <div className="p-4">
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.entries(logTypes).map(([type, { label, color, icon: Icon }]) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md font-mono transition-colors
                ${selectedType === type 
                  ? `${isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} ${color}` 
                  : `${isDarkMode ? 'bg-gray-800 text-gray-400 hover:bg-gray-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`
                }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
              {logs[type] && (
                <span className={`ml-2 text-xs ${isDarkMode ? 'bg-gray-900' : 'bg-gray-300'} px-2 py-1 rounded-full`}>
                  {logs[type].length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Logs Display */}
        <div className={`h-[600px] overflow-y-auto border ${
          isDarkMode ? 'border-gray-700 bg-gray-900/50' : 'border-gray-200 bg-gray-50'
        } rounded-md`}>
          {logs[selectedType] && logs[selectedType].length > 0 ? (
            logs[selectedType].map((log, index) => (
              <LogEntry 
                key={`${selectedType}-${index}`} 
                log={{
                  ...log,
                  level: selectedType
                }}
                logTypes={logTypes}
                isDarkMode={isDarkMode}
              />
            ))
          ) : (
            <div className="p-8 text-center text-gray-500 font-mono">
              <div className="mx-auto h-12 w-12 text-gray-600 mb-4">NO_DATA</div>
              <p className="tracking-wider">NO_{logTypes[selectedType]?.label}_DETECTED</p>
            </div>
          )}
        </div>
      </div>
      <ToastContainer theme={isDarkMode ? 'dark' : 'light'} />
    </div>
  );
};

export default F1TerminalLogs;