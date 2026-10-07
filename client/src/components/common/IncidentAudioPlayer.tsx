import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Volume2, AlertCircle, RotateCcw } from 'lucide-react';
import { api } from '../../services/api';

interface IncidentAudioPlayerProps {
  src: string;
  duration?: number | null;
  className?: string;
  label?: string;
}

export const IncidentAudioPlayer: React.FC<IncidentAudioPlayerProps> = ({
  src,
  duration,
  className = '',
  label = 'Voice Statement'
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState<number>(duration || 0);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const fullUrl = api.getMediaUrl(src);

  useEffect(() => {
    if (duration && duration > 0) {
      setTotalDuration(duration);
    }
  }, [duration]);

  useEffect(() => {
    setIsPlaying(false);
    setCurrentTime(0);
    setHasError(false);
    setErrorMessage('');
  }, [src]);

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const d = audioRef.current.duration;
      if (d && isFinite(d) && !isNaN(d) && d > 0) {
        setTotalDuration(d);
      } else if (duration && duration > 0) {
        setTotalDuration(duration);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      const d = audioRef.current.duration;
      if (d && isFinite(d) && !isNaN(d) && d > 0 && (!totalDuration || totalDuration === 0)) {
        setTotalDuration(d);
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
    }
  };

  const handleError = (e: any) => {
    setIsPlaying(false);
    setHasError(true);
    setErrorMessage('Audio file cannot be loaded or format is unsupported');
    console.warn('Audio playback error on URL:', fullUrl, e);
  };

  const togglePlay = async () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      try {
        setHasError(false);
        setErrorMessage('');
        await audioRef.current.play();
        setIsPlaying(true);
      } catch (err: any) {
        handleError(err);
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const seekTo = parseFloat(e.target.value);
    setCurrentTime(seekTo);
    if (audioRef.current) {
      audioRef.current.currentTime = seekTo;
    }
  };

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs) || !isFinite(secs)) return '0:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      className={`inline-flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 px-3 py-2 rounded-xl bg-[#FAF0EC] border border-[#EEDFD9] text-xs ${className}`}
    >
      <audio
        ref={audioRef}
        src={fullUrl}
        preload="metadata"
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onEnded={handleEnded}
        onError={handleError}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      <div className="flex items-center space-x-2">
        <button
          type="button"
          onClick={togglePlay}
          className={`h-7 w-7 rounded-lg flex items-center justify-center transition-all cursor-pointer shadow-xs ${
            isPlaying
              ? 'bg-[#542A20] text-white'
              : 'bg-[#883A2E] text-white hover:bg-[#752F24]'
          }`}
          title={isPlaying ? 'Pause' : 'Play Audio Recording'}
        >
          {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5 ml-0.5" />}
        </button>

        <div className="flex items-center space-x-1.5 text-[11px] font-semibold text-[#542A20]">
          <Volume2 className="h-3.5 w-3.5 text-[#883A2E]" />
          <span>{label}</span>
        </div>
      </div>

      {!hasError ? (
        <div className="flex items-center space-x-2 flex-1 min-w-[150px]">
          <input
            type="range"
            min={0}
            max={totalDuration > 0 ? totalDuration : 100}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1.5 bg-[#EEDFD9] rounded-lg appearance-none cursor-pointer accent-[#883A2E]"
          />
          <span className="font-mono text-[10px] text-[#7A6360] shrink-0 min-w-[65px] text-right">
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </span>
        </div>
      ) : (
        <div className="flex items-center space-x-2 text-[10px] text-[#D65A31]">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>Playback error</span>
          <button
            type="button"
            onClick={() => {
              if (audioRef.current) {
                audioRef.current.load();
                togglePlay();
              }
            }}
            className="underline font-semibold cursor-pointer"
          >
            Retry
          </button>
          <a
            href={fullUrl}
            target="_blank"
            rel="noreferrer"
            download
            className="underline font-bold text-[#883A2E] ml-1"
          >
            Download Audio
          </a>
        </div>
      )}
    </div>
  );
};
