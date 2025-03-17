import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';

const AudioMessagePlayer = ({ url, onClose }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(0.75);
  const [isMuted, setIsMuted] = useState(false);
  const [audioData, setAudioData] = useState(Array(30).fill(50));
  
  const audioRef = useRef(null);
  const animationRef = useRef(null);
  const analyzerRef = useRef(null);
  const audioContextRef = useRef(null);
  const sourceRef = useRef(null);

  useEffect(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyzerRef.current = audioContextRef.current.createAnalyser();
      analyzerRef.current.fftSize = 64;
    }

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    if (isPlaying) {
      if (!sourceRef.current) {
        sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
        sourceRef.current.connect(analyzerRef.current);
        analyzerRef.current.connect(audioContextRef.current.destination);
      }
      updateVisualizer();
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
  }, [isPlaying]);

  const updateVisualizer = () => {
    const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
    analyzerRef.current.getByteFrequencyData(dataArray);
    
    const normalizedData = Array.from(dataArray)
      .slice(0, 30)
      .map(value => (value / 255) * 100);
    
    setAudioData(normalizedData);
    animationRef.current = requestAnimationFrame(updateVisualizer);
  };

  const togglePlay = () => {
    if (audioRef.current.paused) {
      audioRef.current.play();
      setIsPlaying(true);
    } else {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    setDuration(audioRef.current.duration);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    audioRef.current.volume = newVolume;
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
    audioRef.current.muted = !isMuted;
  };

  const formatTime = (time) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 w-96 bg-gray-900 rounded-lg shadow-xl p-4 text-white">
      <audio 
        ref={audioRef}
        src={url}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
      />
      
      {/* Visualization */}
      <div className="h-20 mb-4 flex items-end justify-center gap-1">
        {audioData.map((height, index) => (
          <div
            key={index}
            className="w-2 bg-blue-500 rounded-t transition-all duration-50"
            style={{
              height: `${height}%`,
              opacity: isPlaying ? 1 : 0.5
            }}
          />
        ))}
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <input
          type="range"
          min="0"
          max={duration}
          value={currentTime}
          onChange={(e) => {
            audioRef.current.currentTime = e.target.value;
          }}
          className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
        />
        <div className="flex justify-between text-sm mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={togglePlay}
          className="p-2 bg-blue-600 rounded-full hover:bg-blue-700 transition-colors"
        >
          {isPlaying ? 
            <Pause className="w-5 h-5" /> : 
            <Play className="w-5 h-5" />
          }
        </button>

        <button
          onClick={toggleMute}
          className="p-1 hover:bg-gray-800 rounded-full transition-colors"
        >
          {isMuted ? 
            <VolumeX className="w-4 h-4" /> : 
            <Volume2 className="w-4 h-4" />
          }
        </button>

        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={handleVolumeChange}
          className="w-24 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
        />
      </div>
    </div>
  );
};

export default AudioMessagePlayer;