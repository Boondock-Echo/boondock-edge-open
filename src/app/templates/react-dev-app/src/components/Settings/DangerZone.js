import React, { useState } from 'react';
import axios from 'axios';
import {
  AlertCircle,
  Trash2,
  AlertTriangle,
  ShieldAlert,
  XCircle,
  CheckCircle,
  Radio,
  Waves
} from 'lucide-react';
// import EventManagement from "./EventManagement";
const DangerZone = ({ edgeServerEndpoint, isDarkMode, showToast }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Enhanced color utility function
  const getColorScheme = () => {
    return {
      bgColor: isDarkMode ? 'bg-[#0f172a]' : 'bg-gray-50',
      textColor: isDarkMode ? 'text-gray-100' : 'text-gray-800',
      cardBg: isDarkMode ? 'bg-[#1e293b]' : 'bg-white',
      borderColor: isDarkMode ? 'border-red-900/30' : 'border-red-200/50',
      warningColor: isDarkMode ? 'text-red-400' : 'text-red-600',
      warningBg: isDarkMode 
        ? 'bg-gradient-to-r from-red-950/40 to-purple-950/40' 
        : 'bg-gradient-to-r from-red-100 to-purple-100',
      shadowColor: isDarkMode 
        ? 'shadow-xl shadow-red-950/20' 
        : 'shadow-lg shadow-red-200/50'
    };
  };

  const handleDeleteRecordings = async () => {
    setIsLoading(true);
    try {
      await axios.post(`${edgeServerEndpoint}/truncate_recordings`);
      showToast('Radio recordings deleted successfully!', 'success');
      setShowDeleteModal(false);
    } catch (error) {
      console.error('Error deleting recordings:', error);
      showToast('Error deleting radio recordings!', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const colors = getColorScheme();

  return (
    <div className={`min-h-screen p-6 ${colors.bgColor} ${colors.textColor} transition-all duration-300`}>
      {/* Header Section */}
      <div className={`relative overflow-hidden rounded-2xl ${colors.warningBg} p-8 mb-8 ${colors.shadowColor}`}>
        <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-red-500 to-purple-500"></div>
        <div className="relative z-10 flex items-center gap-6">
          <div className={`flex-shrink-0 h-20 w-20 rounded-full flex items-center justify-center 
            bg-red-500/10 animate-pulse`}>
            <ShieldAlert className={`h-10 w-10 ${colors.warningColor}`} />
          </div>
          <div>
            <h2 className={`text-3xl font-extrabold ${colors.warningColor} tracking-wider mb-2`}>
              Danger Zone
            </h2>
            <p className={`text-sm opacity-80 ${colors.textColor}`}>
              Critical System Operations with Irreversible Actions
            </p>
          </div>
        </div>
      </div>

      {/* Action Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Delete Recordings Card */}
        <div className={`${colors.cardBg} rounded-2xl p-6 
          border ${colors.borderColor} 
          hover:scale-[1.02] hover:rotate-1 transition-all duration-300 
          ${colors.shadowColor}`}>
          <div className="flex items-center gap-6">
            <div className={`p-4 rounded-full ${colors.warningBg}/20`}>
              <Radio className={`h-8 w-8 ${colors.warningColor}`} />
            </div>
            <div className="flex-grow">
              <h3 className={`text-xl font-bold mb-2 ${colors.textColor}`}>
                Delete Broadcast Recordings
              </h3>
              <p className="text-sm opacity-70">
                Permanently remove all saved radio broadcasts and recording sessions.
              </p>
            </div>
            <button
              onClick={() => setShowDeleteModal(true)}
              className={`px-5 py-2 rounded-lg 
                ${isDarkMode 
                  ? 'bg-red-600/10 text-red-400 hover:bg-red-600/20' 
                  : 'bg-red-100 text-red-600 hover:bg-red-200'} 
                transition-all duration-300 hover:scale-105`}
            >
              <Trash2 className="h-5 w-5 mr-2 inline" />
              Delete
            </button>
          </div>
        </div>

        {/* Clear Logs Card */}
        <div className={`${colors.cardBg} rounded-2xl p-6 
          border ${colors.borderColor} 
          hover:scale-[1.02] hover:rotate-1 transition-all duration-300 
          ${colors.shadowColor}`}>
          <div className="flex items-center gap-6">
            <div className={`p-4 rounded-full ${colors.warningBg}/20`}>
              <Waves className={`h-8 w-8 ${colors.warningColor}`} />
            </div>
            <div className="flex-grow">
              <h3 className={`text-xl font-bold mb-2 ${colors.textColor}`}>
                Clear Broadcasting Logs
              </h3>
              <p className="text-sm opacity-70">
                Remove all transmission logs and broadcast history data.
              </p>
            </div>
            <button
              onClick={async () => {
                try {
                  await axios.post(`${edgeServerEndpoint}/logs_clear`);
                  showToast('Broadcasting logs cleared successfully!', 'success');
                } catch (err) {
                  showToast('Failed to clear broadcast logs.', 'error');
                }
              }}
              className={`px-5 py-2 rounded-lg 
                ${isDarkMode 
                  ? 'bg-red-600/10 text-red-400 hover:bg-red-600/20' 
                  : 'bg-red-100 text-red-600 hover:bg-red-200'} 
                transition-all duration-300 hover:scale-105`}
            >
              <AlertCircle className="h-5 w-5 mr-2 inline" />
              Clear
            </button>
          </div>
        </div>
      </div>

     

      {/* Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className={`w-full max-w-md rounded-3xl ${colors.cardBg} p-8 
            border ${colors.borderColor} ${colors.shadowColor} 
            transform transition-all duration-300 scale-100 opacity-100`}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className={`rounded-full p-4 ${colors.warningBg}/20`}>
                  <AlertTriangle className={`h-8 w-8 ${colors.warningColor} animate-pulse`} />
                </div>
                <h3 className={`text-2xl font-bold ${colors.textColor}`}>
                  Confirm Deletion
                </h3>
              </div>
              <button 
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-500 hover:text-red-500 transition-colors"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>

            <div className={`rounded-2xl p-6 mb-6 
              ${isDarkMode ? 'bg-red-900/20' : 'bg-red-100/50'}`}>
              <p className="mb-4 font-semibold">This action will delete:</p>
              <ul className="list-disc list-inside space-y-2 text-sm opacity-80">
                <li>All saved radio broadcasts</li>
                <li>Recording session data</li>
                <li>Associated metadata and timestamps</li>
              </ul>
            </div>

            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className={`px-6 py-2 rounded-lg 
                  ${isDarkMode 
                    ? 'text-gray-400 hover:bg-gray-800' 
                    : 'text-gray-600 hover:bg-gray-200'} 
                  transition-colors`}
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteRecordings}
                className={`flex items-center gap-2 px-6 py-2 rounded-lg 
                  ${isDarkMode 
                    ? 'bg-red-600 text-white hover:bg-red-700' 
                    : 'bg-red-500 text-white hover:bg-red-600'} 
                  transition-colors`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-5 w-5" />
                    Delete Recordings
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
       {/* <EventManagement  edgeServerEndpoint={edgeServerEndpoint} isDarkMode={isDarkMode} /> */}
    </div>
    
  );
};

export default DangerZone;