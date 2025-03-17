import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { 
  ChevronLeft, 
  Radio, 
  Users, 
  AudioWaveform,
  Settings,
  Logs,
  TriangleAlert,
  ImagePlay,
  SmartphoneNfc,ListMusic,
  Tag  // Added Tag icon for Keywords
} from 'lucide-react';
import GlobalSettings from "./GlobalSettings";
import KeywordsSection from "./KeywordsSection"; // Import the KeywordsSection
import FrequencyManagement from "./FrequencyManagement";
import ChannelSettings from "./ChannelSettings";
import UserManagement from "../Users/index";
import F1TerminalLogs from '../Logs/F1TerminalLogs';
import Branding from './Branding';
import DangerZone from './DangerZone';
import ScannerTable from './ScannerTabel';
import AudioLevelVisualizer from './AudioLevelVisualizer';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const SettingsPage = ({ isDarkMode }) => {
  const [loading, setLoading] = useState(true);
  const [keywords, setKeywords] = useState([]);
  const [newKeyword, setNewKeyword] = useState('');
  const [activeSection, setActiveSection] = useState('channel');
  const [globalSettings, setGlobalSettings] = useState({
    target_language: "english",
    model: "medium.en",
    hallucination: "True",
    transcribe_local: "medium.en"
  });

  const navigate = useNavigate();
  const toastIdRef = useRef(null);
  const toastTimeoutRef = useRef(null);
  const edgeServerEndpoint = localStorage.getItem("EDGE_SERVER_ENDPOINT") || 
                           process.env.REACT_APP_EDGE_SERVER_ENDPOINT || "";
  const API_BASE_URL = `${edgeServerEndpoint}`;

  const showToast = useCallback((message, type = 'success') => {
    toastTimeoutRef.current = setTimeout(() => {
      const toastOptions = {
        position: 'top-right',
        autoClose: 8000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        theme: isDarkMode ? "dark" : "light",
        onClose: () => { toastIdRef.current = null; }
      };

      toastIdRef.current = type === 'success' 
        ? toast.success(message, toastOptions)
        : toast.error(message, toastOptions);
    }, 100);
  }, [isDarkMode]);

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      if (toastIdRef.current) toast.dismiss(toastIdRef.current);
    };
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/settings`);
      const settingsData = response.data;
      
      setGlobalSettings({
        target_language: settingsData.global_target_language || "english",
        model: settingsData.global_model || "medium.en",
        transcribe_local: settingsData.global_transcribe_local || "true",
        transcribe_openai: settingsData.global_transcribe_openai || "true",
        transcribe_node: settingsData.global_transcribe_node || "false",
        hallucination: settingsData.global_hallucination || "true",
        timezone: settingsData.global_timezone || "UTC"
      });
      
      setKeywords(Array.isArray(settingsData.keywords) ? settingsData.keywords : []);
    } catch (error) {
      console.error('Error fetching settings:', error);
      showToast('Error loading settings!', 'error');
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await fetchSettings();
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const handleAddKeyword = async () => {
    const keyword = newKeyword.trim();
    if (!keyword) return;

    try {
      const response = await axios.post(`${API_BASE_URL}/settings/keywords`, { keyword });
      setKeywords(response.data?.keywords || [...keywords, keyword]);
      setNewKeyword('');
      showToast('Keyword added successfully!');
    } catch (error) {
      console.error('Error adding keyword:', error);
      showToast(error.response?.data?.error || 'Error adding keyword!', 'error');
    }
  };

  const handleRemoveKeyword = async (keyword) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/settings/keywords/${keyword}`);
      setKeywords(response.data?.keywords || keywords.filter(k => k !== keyword));
      showToast('Keyword removed successfully!');
    } catch (error) {
      console.error('Error removing keyword:', error);
      showToast(error.response?.data?.error || 'Error removing keyword!', 'error');
    }
  };

  const sidebarItems = [
    { id: 'channel', label: 'Channels', icon: Radio },
    { id: 'frequency', label: 'Frequencies', icon: AudioWaveform },
    // { id: 'scanner', label: 'Scanners', icon: SmartphoneNfc },
    { id: 'global', label: 'Global', icon: Settings },
    { id: 'keywords', label: 'Keywords', icon: Tag }, // Added Keywords menu item
    { id: 'user', label: 'Users', icon: Users },
    { id: 'Branding', label: 'Branding', icon: ImagePlay },
    { id: 'danger', label: 'Danger Zone', icon: TriangleAlert },
    // { id: 'audio', label: 'Audio Visulizer', icon: ListMusic },
    { id: 'Logs', label: 'Logs', icon: Logs },
  ];

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={`${isDarkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-800'} min-h-screen`}>
      <div className="flex h-screen">
        <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} w-64 border-r flex flex-col`}>
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <Settings className="w-6 h-6 text-blue-600" />
              <h1 className="text-xl font-semibold">Settings</h1>
            </div>
          </div>
          
          <nav className="flex-1 p-4">
            <div className="space-y-1">
              {sidebarItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      activeSection === item.id 
                        ? 'bg-blue-600 text-white' 
                        : `${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="p-4 border-t border-gray-200">
            <button
              onClick={() => navigate("/")}
              className={`w-full flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                isDarkMode 
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Back to Dashboard
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <div className="p-8">
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg`}>
              {activeSection === 'channel' && (
                <ChannelSettings isDarkMode={isDarkMode} edgeServerEndpoint={edgeServerEndpoint} />
              )}
              {activeSection === 'global' && (
                <GlobalSettings
                  globalSettings={globalSettings}
                  isDarkMode={isDarkMode}
                  handleGlobalChange={async (field, value) => {
                    try {
                      await axios.put(`${API_BASE_URL}/settings`, { [`global_${field}`]: value });
                      setGlobalSettings(prev => ({ ...prev, [field]: value }));
                      showToast('Global settings updated successfully!');
                    } catch (error) {
                      console.error('Error updating global settings:', error);
                      showToast('Error updating global settings!', 'error');
                    }
                  }}
                  // Removed keywords-related props since they're now in a separate section
                />
              )}
              {activeSection === 'keywords' && (
                <KeywordsSection
                  keywords={keywords}
                  newKeyword={newKeyword}
                  setNewKeyword={setNewKeyword}
                  handleAddKeyword={handleAddKeyword}
                  handleRemoveKeyword={handleRemoveKeyword}
                  isDarkMode={isDarkMode}
                />
              )}
              {activeSection === 'frequency' && (
                <FrequencyManagement edgeServerEndpoint={edgeServerEndpoint} isDarkMode={isDarkMode} />
              )}
              {activeSection === 'user' && (
                <UserManagement edgeServerEndpoint={edgeServerEndpoint} isDarkMode={isDarkMode} />
              )}
              {activeSection === 'scanner' && (
                <ScannerTable edgeServerEndpoint={edgeServerEndpoint} isDarkMode={isDarkMode} />
              )}
              {activeSection === 'audio' && (
                <AudioLevelVisualizer edgeServerEndpoint={edgeServerEndpoint} isDarkMode={isDarkMode} />
              )}
              {activeSection === 'Branding' && (
                <Branding edgeServerEndpoint={edgeServerEndpoint} isDarkMode={isDarkMode} />
              )}
              {activeSection === 'danger' && (
                <DangerZone 
                  edgeServerEndpoint={edgeServerEndpoint} 
                  isDarkMode={isDarkMode}
                  showToast={showToast}
                />
              )}
              {activeSection === 'Logs' && (
                <F1TerminalLogs edgeServerEndpoint={edgeServerEndpoint} isDarkMode={isDarkMode} />
              )}
            </div>
          </div>
        </div>
      </div>
      {/* <ToastContainer /> */}
    </div>
  );
};

export default SettingsPage;