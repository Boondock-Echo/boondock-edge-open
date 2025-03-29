import React, { useState, useEffect } from 'react';
import {
  Radio, Signal, RadioTower, Play, Volume2, Globe2, Tag,
  User2, Settings2, Plus, WifiOff, Ban, CheckCircle, Circle, ExternalLink
} from 'lucide-react';
import ChannelEditModal from './ChannelEditModal';
import ChannelCreateModal from './ChannelCreateModal';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ChannelSettings = ({ edgeServerEndpoint, isDarkMode = false }) => {
  // =========================================================================
  // State Management
  // =========================================================================
  const [channels, setChannels] = useState([]);
  const [editingChannel, setEditingChannel] = useState(null);
  const [tempChannel, setTempChannel] = useState(null);
  const [frequencies, setFrequencies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);

  // =========================================================================
  // Toast Notification Utility
  // =========================================================================
  const showToast = (message, type = 'success') => {
    toast[type](message, {
      position: 'top-right',
      autoClose: 3000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
    });
  };

  // =========================================================================
  // Data Fetching Functions
  // =========================================================================
  const fetchChannels = async () => {
    try {
      const response = await fetch(`${edgeServerEndpoint}/channels`);
      if (!response.ok) throw new Error('Failed to fetch channels');
      
      const data = await response.json();
      setChannels(data.map(channel => ({
        ...channel,
        name: channel.name || `Channel ${channel.id}`,
        enabled: channel.status === "enabled",
        src_language: channel.src_language || "english",
        model: channel.model || "medium.en",
        target_language: channel.target_language || "english",
        color: channel.color || "#000000",
        background_color: channel.background_color || "#ffffff",
        team_color: channel.team_color || "#ffffff",
        textColor: channel.textColor || "#000000",
        person: channel.person || "john",
        tag: channel.tag || "john"
      })));
    } catch (error) {
      console.error('Error fetching channels:', error);
      showToast('Error loading channels!', 'error');
    }
  };

  const fetchFrequencies = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${edgeServerEndpoint}/frequencies`);
      if (!response.ok) throw new Error('Failed to fetch frequencies');
      const data = await response.json();
      setFrequencies(data);
    } catch (error) {
      console.error('Error fetching frequencies:', error);
      showToast('Error loading frequencies!', 'error');
    } finally {
      setLoading(false);
    }
  };

  // =========================================================================
  // Channel Management Functions
  // =========================================================================
  const handleSave = async (id) => {
    const channelToSave = tempChannel || channels.find((ch) => ch.id === id);
    if (!channelToSave) return;

    setChannels(prevChannels =>
      prevChannels.map(ch =>
        ch.id === id ? { ...ch, ...channelToSave, enabled: channelToSave.enabled } : ch
      )
    );

    try {
      const response = await fetch(`${edgeServerEndpoint}/channel/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          port: channelToSave.port,
          name: channelToSave.name,
          status: channelToSave.enabled ? "enabled" : "disabled",
          src_language: channelToSave.src_language,
          target_language: channelToSave.target_language,
          model: channelToSave.model,
          color: channelToSave.color,
          background_color: channelToSave.background_color,
          team_color: channelToSave.team_color,
          textColor: channelToSave.textColor,
          driver: channelToSave.driver,
          person: channelToSave.person,
          tag: channelToSave.tag,
          car: channelToSave.car,
          mac: channelToSave.mac,
          frequency: channelToSave.frequency,
          type: channelToSave.type,
          tone: channelToSave.tone,
        }),
      });

      if (!response.ok) {
        setChannels(prevChannels =>
          prevChannels.map(ch =>
            ch.id === id ? channels.find(c => c.id === id) || ch : ch
          )
        );
        throw new Error('Failed to update channel');
      }
      showToast(`Channel #${id} updated successfully`);
    } catch (error) {
      console.error('Error updating channel:', error);
      showToast('Error updating channel!', 'error');
    }
  };

  const handleFieldChange = (id, field, value) => {
    setChannels(prevChannels =>
      prevChannels.map(channel =>
        channel.id === id ? { ...channel, [field]: value } : channel
      )
    );
  };

  const handleToggleEnabled = async (channelId, enabled) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const channel = channels.find(ch => ch.id === channelId);
      const newStatus = enabled ? "resume" : "disabled";
      
      setChannels(prevChannels =>
        prevChannels.map(ch =>
          ch.id === channelId ? { ...ch, enabled, status: newStatus, previousStatus: ch.status } : ch
        )
      );

      const response = await fetch(`${edgeServerEndpoint}/channel/${channelId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...channel, status: newStatus }),
      });

      if (!response.ok) {
        setChannels(prevChannels =>
          prevChannels.map(ch =>
            ch.id === channelId ? { ...ch, enabled: !enabled, status: ch.previousStatus } : ch
          )
        );
        throw new Error('Failed to update channel status');
      }
      showToast(`Channel ${channelId} ${enabled ? 'enabled' : 'disabled'} successfully`);
    } catch (error) {
      console.error('Error toggling channel status:', error);
      showToast('Error updating channel status!', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResume = async (channelId) => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const channel = channels.find(ch => ch.id === channelId);
      setChannels(prevChannels =>
        prevChannels.map(ch =>
          ch.id === channelId ? { ...ch, enabled: true, status: "enabled", previousStatus: ch.status } : ch
        )
      );

      const response = await fetch(`${edgeServerEndpoint}/channel/${channelId}/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        setChannels(prevChannels =>
          prevChannels.map(ch =>
            ch.id === channelId ? { ...ch, enabled: false, status: ch.previousStatus } : ch
          )
        );
        throw new Error('Failed to resume channel');
      }
      showToast(`Channel ${channelId} resumed successfully`);
    } catch (error) {
      console.error('Error resuming channel:', error);
      showToast('Error resuming channel!', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateChannel = async (newChannel) => {
    setIsSaving(true);
    try {
      const response = await fetch(`${edgeServerEndpoint}/channels`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newChannel),
      });

      if (!response.ok) throw new Error('Failed to create channel');
      showToast('Channel created successfully');
      fetchChannels();
    } catch (error) {
      console.error('Error creating channel:', error);
      showToast('Error creating channel!', 'error');
    } finally {
      setIsSaving(false);
      setIsCreatingChannel(false);
    }
  };

  // =========================================================================
  // Modal Handling Functions
  // =========================================================================
  const handleEdit = (channel) => {
    setEditingChannel(channel);
    setTempChannel({ ...channel });
  };

  const handleModalFieldChange = (field, value) => {
    setTempChannel(prev => ({ ...prev, [field]: value }));
  };

  const handleFrequencyChange = (frequencyId) => {
    const selectedFrequency = frequencies.find(f => f.id === parseInt(frequencyId));
    if (selectedFrequency && tempChannel) {
      setTempChannel(prev => ({
        ...prev,
        frequency: selectedFrequency.frequency,
        name: selectedFrequency.name,
        frequency_id: selectedFrequency.id,
        type: selectedFrequency.type,
        tone: selectedFrequency.tone,
        person: selectedFrequency.person,
        tag: selectedFrequency.tag,
        status: selectedFrequency.status
      }));
    }
  };

  const handleModalSave = async (channelId) => {
    if (!editingChannel || !tempChannel || isSaving) return;
    setIsSaving(true);
    try {
      const changedFields = Object.entries(tempChannel).reduce((acc, [key, value]) => {
        if (value !== editingChannel[key]) acc[key] = value;
        return acc;
      }, {});

      if (Object.keys(changedFields).length > 0) {
        for (const [key, value] of Object.entries(changedFields)) {
          await handleFieldChange(editingChannel.id, key, value);
        }
        await handleSave(editingChannel.id);
      }
      setEditingChannel(null);
      setTempChannel(null);
    } catch (error) {
      console.error('Error saving changes:', error);
      showToast('Error saving changes!', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  // =========================================================================
  // Audio Stream Link Helper
  // =========================================================================
  const openAudioStream = (channel) => {
    if (channel && channel.mac) {
      const url = `http://${channel.mac}.local/live`;
      window.open(url, '_blank', 'noopener,noreferrer');
    } else {
      showToast('MAC address not available for this channel', 'warning');
    }
  };

  // =========================================================================
  // Render Helper Functions
  // =========================================================================
  const getStatusColor = (status) => {
    const statusColors = {
      enabled: 'text-green-500',
      resume: 'text-green-500',
      record_begin: 'text-green-500',
      record_end: 'text-blue-500',
      online: 'text-green-400',
      busy: 'text-orange-500',
      offline: 'text-gray-500',
      disabled: 'text-red-500',
    };
    return statusColors[status?.toLowerCase()] || 'text-gray-500';
  };

  const renderChannelControls = (channel) => (
    <div className="flex items-center gap-3">
      <span className={`flex items-center gap-1 text-xs font-medium capitalize ${getStatusColor(channel.status)}`}>
        {channel.status}
      </span>
      <div className="flex items-center gap-2">
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={channel.status !== "disabled"}
            onChange={(e) => handleToggleEnabled(channel.id, e.target.checked)}
            disabled={isSaving}
            className="sr-only peer"
          />
          <div className={`w-9 h-5 ${channel.status !== "disabled" ? 'bg-blue-600' : 'bg-gray-600'}
            peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer 
            peer-checked:after:translate-x-full after:content-[''] after:absolute 
            after:top-[2px] after:left-[2px] after:bg-white after:rounded-full 
            after:h-4 after:w-4 after:transition-all`}></div>
        </label>
      </div>
    </div>
  );

  const renderChannelCard = (channel) => (
    <div
      key={channel.id}
      className={`relative overflow-hidden rounded-xl ${isDarkMode ? 'bg-gray-800' : 'bg-white'} 
        p-6 transition-all duration-300 hover:shadow-xl border 
        ${isDarkMode ? 'border-gray-700' : 'border-gray-200'}`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 -mr-16 -mt-16 bg-gradient-to-br 
        from-blue-500/20 to-purple-500/20 rounded-full blur-2xl" />

      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          <RadioTower className={`w-5 h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
          <div>
            <h3 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Channel {channel.id}
            </h3>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              {channel.name}
            </p>
          </div>
        </div>
        {renderChannelControls(channel)}
      </div>

      <div className={`grid grid-cols-2 gap-4 mb-6 ${isDarkMode ? 'text-gray-300' : 'text-gray-700'}`}>
        <div className="flex items-center gap-2">
          <Volume2 className="w-4 h-4 text-gray-400" />
          <span className="text-sm">{channel.frequency} MHz</span>
        </div>
        <div className="flex items-center gap-2">
          <Globe2 className="w-4 h-4 text-gray-400" />
          <span className="text-sm capitalize">{channel.src_language}</span>
        </div>
        <div className="flex items-center gap-2">
          <Tag className="w-4 h-4 text-gray-400" />
          <span className="text-sm">{channel.tag || 'No tag'}</span>
        </div>
        <div className="flex items-center gap-2">
          <User2 className="w-4 h-4 text-gray-400" />
          <span className="text-sm">{channel.person || 'Unassigned'}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <button
          onClick={() => handleEdit(channel)}
          className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg 
            ${isDarkMode ? 'bg-gray-700 hover:bg-gray-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}
            transition-colors duration-200 font-medium`}
        >
          <Settings2 className="w-4 h-4" />
          Configure
        </button>
        
        {channel.mac && (
          <button
            onClick={() => openAudioStream(channel)}
            className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg 
              ${isDarkMode ? 'bg-blue-700 hover:bg-blue-600 text-white' : 'bg-blue-100 hover:bg-blue-200 text-blue-700'}
              transition-colors duration-200 font-medium`}
          >
            <ExternalLink className="w-4 h-4" />
            Live Audio Stream
          </button>
        )}
      </div>
    </div>
  );

  // =========================================================================
  // Effects
  // =========================================================================
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await fetchChannels();
        await fetchFrequencies();
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [edgeServerEndpoint]);

  // =========================================================================
  // Main Render
  // =========================================================================
  return (
    <div className={`w-full p-8 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'} min-h-screen`}>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Radio className={`w-6 h-6 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} />
          <div>
            <h1 className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
              Channels
            </h1>
            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Manage and configure your radio channels
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsCreatingChannel(true)}
          className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
          disabled={isSaving}
        >
          <Plus className="w-5 h-5 mr-2" />
          New Channel
        </button>
      </div>

      {loading && (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {channels.map(channel => renderChannelCard(channel))}
      </div>

      {editingChannel && (
        <ChannelEditModal
          editingChannel={editingChannel}
          tempChannel={tempChannel}
          frequencies={frequencies}
          isDarkMode={isDarkMode}
          isSaving={isSaving}
          onClose={() => {
            setEditingChannel(null);
            setTempChannel(null);
          }}
          onSave={handleModalSave}
          onFieldChange={handleModalFieldChange}
          onFrequencyChange={handleFrequencyChange}
        />
      )}

      {isCreatingChannel && (
        <ChannelCreateModal
          isOpen={isCreatingChannel}
          onClose={() => setIsCreatingChannel(false)}
          onChannelCreated={handleCreateChannel}
          frequencies={frequencies}
          isDarkMode={isDarkMode}
          edgeServerEndpoint={edgeServerEndpoint}
          isSaving={isSaving}
        />
      )}
    </div>
  );
};

export default ChannelSettings;