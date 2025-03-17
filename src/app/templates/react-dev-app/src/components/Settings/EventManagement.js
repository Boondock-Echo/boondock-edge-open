import React from 'react';
import { 
  Calendar, 
  Clock, 
  Download, 
  Trash2, 
  XCircle, 
  CalendarDays,
  Activity,
  FileMusic,
  Timer,
  ChevronRight,
  Users,
  ArrowUpRight,
  Shield
} from 'lucide-react';

const EventManagement = ({ isDarkMode }) => {
  const events = [
    {
      id: 1,
      name: "Tech Conference 2025",
      startTime: "2025-02-11T09:00:00",
      endTime: null,
      status: "current",
      participants: 234
    },
    {
      id: 2,
      name: "Workshop Series",
      startTime: "2025-01-15T10:00:00",
      endTime: "2025-01-20T16:00:00",
      status: "ended",
      participants: 156
    }
  ];

  const formatDateTime = (dateString) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="mt-8">
      {/* Header Section */}
      <div className={`relative overflow-hidden rounded-2xl 
        ${isDarkMode ? 'bg-gradient-to-r from-blue-950/40 to-indigo-950/40' : 'bg-gradient-to-r from-blue-100 to-indigo-100'} 
        p-8 mb-8 ${isDarkMode ? 'shadow-xl shadow-blue-950/20' : 'shadow-lg shadow-blue-200/50'}`}>
        <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-blue-500 to-indigo-500"></div>
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className={`flex-shrink-0 h-20 w-20 rounded-full flex items-center justify-center 
              bg-blue-500/10 animate-pulse`}>
              <Shield className={`h-10 w-10 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>
            <div>
              <h2 className={`text-3xl font-extrabold ${isDarkMode ? 'text-blue-400' : 'text-blue-600'} tracking-wider mb-2`}>
                Event Management
              </h2>
              <p className={`text-sm opacity-80 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                Monitor and manage your active and past events
              </p>
            </div>
          </div>
          <div className={`px-4 py-2 rounded-full ${isDarkMode ? 'bg-blue-900/20' : 'bg-blue-100'} 
            flex items-center gap-2 text-sm border ${isDarkMode ? 'border-blue-500/20' : 'border-blue-200'}`}>
            <Activity className="h-4 w-4" />
            <span>{events.filter(e => e.status === 'current').length} Active Events</span>
          </div>
        </div>
      </div>

      {/* Events Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {events.map((event) => (
          <div key={event.id} 
            className={`rounded-2xl ${isDarkMode ? 'bg-[#1e293b]' : 'bg-white'} p-6
              border ${isDarkMode ? 'border-gray-800' : 'border-gray-200'} 
              hover:scale-[1.02] hover:rotate-1 transition-all duration-300
              ${isDarkMode ? 'shadow-xl shadow-black/20' : 'shadow-lg shadow-gray-200/50'}`}>
            {/* Status Header */}
            <div className="flex items-center justify-between mb-6">
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm
                ${event.status === 'current'
                  ? `${isDarkMode ? 'bg-green-500/10 text-green-400' : 'bg-green-100 text-green-600'}`
                  : `${isDarkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600'}`}`}>
                {event.status === 'current' ? (
                  <Timer className="h-4 w-4 animate-pulse" />
                ) : (
                  <Clock className="h-4 w-4" />
                )}
                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
              </div>
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm
                ${isDarkMode ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <FileMusic  className="h-4 w-4" />
                {event.participants} Recordings
              </div>
            </div>

            {/* Event Title */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">{event.name}</h3>
              <ArrowUpRight className={`h-5 w-5 opacity-50 group-hover:opacity-100 
                transition-opacity ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
            </div>

            {/* Event Details */}
            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3">
                <Calendar className={`h-5 w-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                <span className="text-sm">Started: {formatDateTime(event.startTime)}</span>
              </div>
              {event.endTime && (
                <div className="flex items-center gap-3">
                  <Clock className={`h-5 w-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
                  <span className="text-sm">Ended: {formatDateTime(event.endTime)}</span>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              {event.status === 'current' && (
                <button className={`inline-flex items-center px-4 py-2 rounded-lg text-sm
                  ${isDarkMode 
                    ? 'bg-red-600/10 text-red-400 hover:bg-red-600/20' 
                    : 'bg-red-100 text-red-600 hover:bg-red-200'} 
                  transition-all duration-300 hover:scale-105`}>
                  <XCircle className="h-4 w-4 mr-2" />
                  End Event
                </button>
              )}
              {event.status === 'ended' && (
                <>
                  <button className={`inline-flex items-center px-4 py-2 rounded-lg text-sm
                    ${isDarkMode 
                      ? 'bg-blue-600/10 text-blue-400 hover:bg-blue-600/20' 
                      : 'bg-blue-100 text-blue-600 hover:bg-blue-200'} 
                    transition-all duration-300 hover:scale-105`}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </button>
                  <button className={`inline-flex items-center px-4 py-2 rounded-lg text-sm
                    ${isDarkMode 
                      ? 'bg-red-600/10 text-red-400 hover:bg-red-600/20' 
                      : 'bg-red-100 text-red-600 hover:bg-red-200'} 
                    transition-all duration-300 hover:scale-105`}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default EventManagement;