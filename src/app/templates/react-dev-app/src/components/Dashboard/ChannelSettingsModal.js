import React, { useState, useEffect } from "react";
import { X, Save, Volume2, Clock, MinusCircle, PlusCircle, Settings } from "lucide-react";
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const ChannelSettingsModal = ({ isOpen, onClose, channel, onSave, isDarkMode = true }) => {
  const [settings, setSettings] = useState({
    sensitivity: "75",
    silence: "1000",
    min_rec: "1000",
    max_rec: "10000",
    audio_gain: "0"
  });
  const [initialSettings, setInitialSettings] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (channel) {
      const newSettings = {
        sensitivity: channel.sensitivity || "75",
        silence: channel.silence || "1000",
        min_rec: channel.min_rec || "1000",
        max_rec: channel.max_rec || "10000",
        audio_gain: channel.audio_gain || "0"
      };
      setSettings(newSettings);
      setInitialSettings(newSettings);
    }
  }, [channel]);

  const ranges = {
    sensitivity: {
      min: 0,
      max: 100,
      step: 1,
      label: "Audio level",
      unit: "",
      icon: Volume2,
      description: "Adjust at what audio level, the channel starts recording."
    },
    silence: {
      min: 500,
      max: 5000,
      step: 100,
      label: "Silence Threshold",
      unit: "ms",
      icon: MinusCircle,
      description: "Duration of silence before stopping recording"
    },
    min_rec: {
      min: 1000,
      max: 5000,
      step: 100,
      label: "Minimum Recording",
      unit: "ms",
      icon: Clock,
      description: "Shortest allowed recording duration"
    },
    max_rec: {
      min: 10000,
      max: 30000,
      step: 1000,
      label: "Maximum Recording",
      unit: "ms",
      icon: PlusCircle,
      description: "Longest allowed recording duration"
    },
    audio_gain: {
      min: 0,
      max: 5,
      step: 1,
      label: "Audio Gain",
      unit: "",
      icon: Settings,
      description: "Boost the audio input level"
    }
  };

  const handleInputChange = (setting, value) => {
    const numValue = parseFloat(value);
    const range = ranges[setting];

    if (numValue >= range.min && numValue <= range.max) {
      setSettings(prev => ({ ...prev, [setting]: value }));
    }
  };

  const getChangedSettings = () => {
    return Object.entries(settings).reduce((acc, [key, value]) => {
      if (value !== initialSettings[key]) {
        acc[key] = {
          from: initialSettings[key],
          to: value,
          label: ranges[key].label,
          unit: ranges[key].unit
        };
      }
      return acc;
    }, {});
  };

  const formatChangesMessage = (changes) => {
    const changesList = Object.entries(changes).map(([key, change]) => {
      return `${change.label}: ${change.from}${change.unit} → ${change.to}${change.unit}`;
    });
    return changesList.join('\n');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const changedSettings = getChangedSettings();
      await onSave(channel.id, { ...channel, ...settings });

      if (Object.keys(changedSettings).length > 0) {
        toast.success(
          <div>
            <strong>Updated Channel {channel.name}</strong>
            <div className="whitespace-pre-line mt-2 text-sm">
              {formatChangesMessage(changedSettings)}
            </div>
          </div>
        );
      } else {
        toast.info(`No changes made to Channel ${channel.name}`);
      }

      onClose();
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(`Failed to update Channel ${channel.name}`);
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return isDarkMode ? (
    // Dark Mode UI
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 backdrop-blur-sm">
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div className="fixed inset-0 transition-opacity" onClick={onClose} />

        <div className="relative transform overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/95 to-gray-800/95 text-left shadow-2xl transition-all sm:my-8 sm:w-full sm:max-w-lg border border-white/10 backdrop-blur-xl">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 pointer-events-none" />

          <div className="absolute right-0 top-0 pr-4 pt-4">
            <button
              type="button"
              className="rounded-full p-1 text-gray-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-200 hover:bg-white/10"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="p-6">
            <div className="text-center sm:text-left">
              <h3 className="text-xl font-bold text-white bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                {channel?.name || 'Channel Settings'}
              </h3>
              <p className="mt-1 text-sm text-gray-400">
                Adjust audio processing parameters
              </p>

              <form onSubmit={handleSubmit} className="mt-8 space-y-8">
                {Object.entries(settings).map(([key, value]) => {
                  const Icon = ranges[key].icon;
                  return (
                    <div key={key} className="space-y-3 relative group">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-3">
                          <div className="mt-1 p-2 rounded-lg bg-gray-800/50 group-hover:bg-blue-500/20 transition-colors duration-200">
                            <Icon className="h-5 w-5 text-blue-400" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-white">
                              {ranges[key].label}
                            </label>
                            <p className="text-sm text-gray-400">
                              {ranges[key].description}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-medium text-blue-400 bg-blue-500/10 px-2 py-1 rounded-md">
                          {value}{ranges[key].unit}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="relative">
                          <div className="absolute inset-0 h-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-full blur-sm" />
                          <input
                            type="range"
                            value={value}
                            onChange={(e) => handleInputChange(key, e.target.value)}
                            min={ranges[key].min}
                            max={ranges[key].max}
                            step={ranges[key].step}
                            className="relative w-full h-2 bg-gray-800 rounded-full appearance-none cursor-pointer
                                     focus:outline-none focus:ring-2 focus:ring-blue-500/50
                                     [&::-webkit-slider-thumb]:appearance-none
                                     [&::-webkit-slider-thumb]:h-4
                                     [&::-webkit-slider-thumb]:w-4
                                     [&::-webkit-slider-thumb]:rounded-full
                                     [&::-webkit-slider-thumb]:bg-gradient-to-r
                                     [&::-webkit-slider-thumb]:from-blue-400
                                     [&::-webkit-slider-thumb]:to-purple-400
                                     [&::-webkit-slider-thumb]:shadow-lg
                                     [&::-webkit-slider-thumb]:hover:scale-110
                                     [&::-webkit-slider-thumb]:transition-all
                                     [&::-webkit-slider-thumb]:duration-200"
                            disabled={isSaving}
                          />
                        </div>
                        <div className="flex justify-between px-1">
                          <span className="text-xs text-gray-500">
                            {ranges[key].min}{ranges[key].unit}
                          </span>
                          <span className="text-xs text-gray-500">
                            {ranges[key].max}{ranges[key].unit}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="mt-8 flex gap-3 sm:justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex w-full justify-center rounded-lg bg-gray-800/50 px-4 py-2.5 text-sm font-semibold text-gray-300 shadow-sm ring-1 ring-inset ring-gray-700 hover:bg-gray-800 hover:text-white transition-colors duration-200 sm:w-auto"
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:from-blue-600 hover:to-purple-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto gap-2 transition-all duration-200 group"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save className="h-4 w-4 group-hover:scale-110 transition-transform duration-200" />
                        <span>Save</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  ) : (
    // Light Mode UI (Original Design)
    <div className="fixed inset-0 z-50 overflow-y-auto " >
      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="relative transform overflow-hidden rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
          <div className="absolute right-0 top-0 hidden pr-4 pt-4 sm:block">
            <button
              type="button"
              className="rounded-md bg-white text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
              onClick={onClose}
            >
              <span className="sr-only">Close</span>
              <X className="h-6 w-6" />
            </button>
          </div>

          <div className="sm:flex sm:items-start">
            <div className="mt-3 text-center sm:mt-0 sm:text-left w-full">
              <h3 className="text-lg font-semibold leading-6 text-gray-900">
                {channel?.name || 'Channel Settings'}
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                Adjust audio processing parameters
              </p>

              <form onSubmit={handleSubmit} className="mt-6 space-y-6">
                {Object.entries(settings).map(([key, value]) => {
                  const Icon = ranges[key].icon;
                  return (
                    <div key={key} className="space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="flex gap-3">
                          <div className="mt-1">
                            <Icon className="h-5 w-5 text-gray-400" />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-900">
                              {ranges[key].label}
                            </label>
                            <p className="text-sm text-gray-500">
                              {ranges[key].description}
                            </p>
                          </div>
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {value}{ranges[key].unit}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <input
                          type="range"
                          value={value}
                          onChange={(e) => handleInputChange(key, e.target.value)}
                          min={ranges[key].min}
                          max={ranges[key].max}
                          step={ranges[key].step}
                          className="w-full h-2 bg-gray-200 rounded-full appearance-none cursor-pointer
                                   focus:outline-none focus:ring-2 focus:ring-indigo-500/50
                                   [&::-webkit-slider-thumb]:appearance-none
                                   [&::-webkit-slider-thumb]:h-4
                                   [&::-webkit-slider-thumb]:w-4
                                   [&::-webkit-slider-thumb]:rounded-full
                                   [&::-webkit-slider-thumb]:bg-blue-500
                                   [&::-webkit-slider-thumb]:hover:bg-indigo-700
                                   [&::-webkit-slider-thumb]:transition-colors"
                          disabled={isSaving}
                        />
                     
                        <div className="flex justify-between px-1">
                          <span className="text-xs text-gray-500">
                            {ranges[key].min}{ranges[key].unit}
                          </span>
                          <span className="text-xs text-gray-500">
                            {ranges[key].max}{ranges[key].unit}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}

                <div className="mt-8 flex gap-3 sm:justify-end">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:w-auto"
                    disabled={isSaving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center rounded-md bg-blue-500 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto gap-2"
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        <span>Save</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChannelSettingsModal;