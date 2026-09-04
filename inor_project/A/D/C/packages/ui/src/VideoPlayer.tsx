'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { cn, formatDuration } from '@yt/shared';
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, Settings, Subtitles, PictureInPicture2,
  Monitor, RotateCcw,
} from 'lucide-react';

interface VideoPlayerProps {
  src?: string;
  poster?: string;
  title?: string;
  className?: string;
  onTimeUpdate?: (time: number) => void;
  onEnded?: () => void;
}

type PlayerState = 'loading' | 'playing' | 'paused' | 'buffering' | 'error' | 'ended';

export function VideoPlayer({ src, poster, title, className, onTimeUpdate, onEnded }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [playerState, setPlayerState] = useState<PlayerState>('loading');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [bufferProgress, setBufferProgress] = useState(0);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isTheaterMode, setIsTheaterMode] = useState(false);
  const hideControlsRef = useRef<ReturnType<typeof setTimeout>>();
  const [showScrubPreview, setShowScrubPreview] = useState(false);
  const [scrubPosition, setScrubPosition] = useState(0);
  const [scrubTime, setScrubTime] = useState(0);

  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setPlayerState('playing');
    } else {
      videoRef.current.pause();
      setPlayerState('paused');
    }
  }, []);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current || !progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    const time = pos * duration;
    videoRef.current.currentTime = time;
    setCurrentTime(time);
  }, [duration]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      setMuted(val === 0);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setMuted(!muted);
  }, [muted]);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, [isTheaterMode]);

  const toggleTheaterMode = useCallback(() => {
    setIsTheaterMode(!isTheaterMode);
  }, [isTheaterMode]);

  const skipForward = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.min(videoRef.current.currentTime + 10, duration);
  }, [duration]);

  const skipBackward = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = Math.max(videoRef.current.currentTime - 10, 0);
  }, []);

  const changePlaybackRate = useCallback((rate: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSettings(false);
  }, []);

  const enterMiniPlayer = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch {}
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    let hls: any = null;

    const loadVideo = async () => {
      // HLS.js for adaptive streaming
      if (src.endsWith('.m3u8')) {
        try {
          const Hls = (await import('hls.js')).default;
          if (Hls.isSupported()) {
            hls = new Hls({
              enableWorker: true,
              lowLatencyMode: true,
              backbufferLength: 30,
              maxBufferLength: 30,
            });
            hls.loadSource(src);
            hls.attachMedia(video);
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              setPlayerState('paused');
            });
            hls.on(Hls.Events.ERROR, (_event: any, data: any) => {
              if (data.fatal) {
                hls.destroy();
                setPlayerState('error');
              }
            });
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = src;
          }
        } catch {
          video.src = src;
        }
      } else {
        video.src = src;
      }
    };

    loadVideo();

    const onTimeUpdateHandler = () => {
      setCurrentTime(video.currentTime);
      onTimeUpdate?.(video.currentTime);
    };
    const onLoadedMetadata = () => {
      setDuration(video.duration);
      setPlayerState('paused');
    };
    const onProgress = () => {
      if (video.buffered.length > 0) {
        const bufferedEnd = video.buffered.end(video.buffered.length - 1);
        setBufferProgress((bufferedEnd / video.duration) * 100);
      }
    };
    const onWaiting = () => setPlayerState('buffering');
    const onCanPlay = () => { if (!video.paused) setPlayerState('playing'); };
    const onEndedHandler = () => { setPlayerState('ended'); onEnded?.(); };
    const onError = () => setPlayerState('error');

    video.addEventListener('timeupdate', onTimeUpdateHandler);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('progress', onProgress);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('ended', onEndedHandler);
    video.addEventListener('error', onError);

    return () => {
      if (hls) hls.destroy();
      video.removeEventListener('timeupdate', onTimeUpdateHandler);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('progress', onProgress);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('ended', onEndedHandler);
      video.removeEventListener('error', onError);
    };
  }, [src, onTimeUpdate, onEnded]);

  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case ' ': e.preventDefault(); togglePlay(); break;
        case 'f': toggleFullscreen(); break;
        case 'm': toggleMute(); break;
        case 'j': skipBackward(); break;
        case 'l': skipForward(); break;
        case 'k': togglePlay(); break;
        case 'ArrowLeft': skipBackward(); break;
        case 'ArrowRight': skipForward(); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePlay, toggleFullscreen, toggleMute, skipBackward, skipForward]);

  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(hideControlsRef.current);
      if (playerState === 'playing') {
        hideControlsRef.current = setTimeout(() => setShowControls(false), 3000);
      }
    };
    const container = containerRef.current;
    container?.addEventListener('mousemove', handleMouseMove);
    return () => container?.removeEventListener('mousemove', handleMouseMove);
  }, [playerState]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setScrubPosition(pos);
    setScrubTime(pos * duration);
  };

  const qualityOptions = ['Auto', '1080p', '720p', '480p', '360p'];
  const speedOptions = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative bg-black group',
        isTheaterMode ? 'max-w-full' : '',
        className,
      )}
    >
      <video
        ref={videoRef}
        poster={poster}
        className="w-full h-full object-contain"
        onClick={togglePlay}
        playsInline
        preload="metadata"
      />

      {playerState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60">
          <div className="w-12 h-12 border-4 border-red-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {playerState === 'paused' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20" onClick={togglePlay}>
          <div className="w-16 h-16 bg-red-600/90 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors">
            <Play size={28} className="text-white ml-1" />
          </div>
        </div>
      )}

      {playerState === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white gap-2">
          <p className="text-lg font-medium">Something went wrong</p>
          <p className="text-sm text-gray-400">Video failed to load</p>
          <button onClick={() => videoRef.current?.load()} className="mt-2 px-4 py-2 bg-white text-black rounded-full text-sm font-medium hover:bg-gray-200">Retry</button>
        </div>
      )}

      {playerState === 'ended' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 gap-4">
          <button onClick={() => { if (videoRef.current) { videoRef.current.currentTime = 0; videoRef.current.play(); } }} className="w-16 h-16 bg-red-600/90 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors">
            <RotateCcw size={28} className="text-white" />
          </button>
          <p className="text-white text-sm">Replay</p>
        </div>
      )}

      <div className={cn(
        'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent transition-opacity duration-300',
        showControls ? 'opacity-100' : 'opacity-0 pointer-events-none',
      )}>
        <div ref={progressRef} className="relative h-1 mx-2 mb-1 group/progress cursor-pointer" onClick={handleSeek} onMouseMove={handleScrub} onMouseEnter={() => setShowScrubPreview(true)} onMouseLeave={() => setShowScrubPreview(false)}>
          <div className="absolute inset-0 bg-white/20 rounded-full" />
          <div className="absolute inset-y-0 left-0 bg-white/40 rounded-full" style={{ width: `${bufferProgress}%` }} />
          <div className="absolute inset-y-0 left-0 bg-red-600 rounded-full group-hover/progress:h-1.5 transition-all" style={{ width: `${progress}%` }}>
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-red-600 rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity" />
          </div>
          {showScrubPreview && (
            <div className="absolute -top-12 -translate-x-1/2 bg-black/90 text-white text-xs px-2 py-1 rounded whitespace-nowrap" style={{ left: `${scrubPosition * 100}%` }}>
              {formatDuration(Math.floor(scrubTime))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-4 pb-2">
          <div className="flex items-center gap-2">
            <button onClick={skipBackward} className="text-white p-1 hover:text-gray-300"><SkipBack size={18} /></button>
            <button onClick={togglePlay} className="text-white p-1 hover:text-gray-300">{playerState === 'playing' ? <Pause size={20} /> : <Play size={20} />}</button>
            <button onClick={skipForward} className="text-white p-1 hover:text-gray-300"><SkipForward size={18} /></button>
            <div className="relative" onMouseEnter={() => setShowVolumeSlider(true)} onMouseLeave={() => setShowVolumeSlider(false)}>
              <button onClick={toggleMute} className="text-white p-1 hover:text-gray-300">{muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
              {showVolumeSlider && (
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 p-2 bg-[#272727] rounded-lg shadow-xl">
                  <input type="range" min={0} max={1} step={0.01} value={muted ? 0 : volume} onChange={handleVolumeChange} className="w-20 h-1 accent-red-600" style={{ writingMode: 'horizontal-tb' }} />
                </div>
              )}
            </div>
            <span className="text-white text-xs font-medium tabular-nums">{formatDuration(Math.floor(currentTime))} / {formatDuration(Math.floor(duration))}</span>
          </div>

          <div className="flex items-center gap-1">
            <button onClick={() => setShowSettings(!showSettings)} className="text-white p-1.5 hover:text-gray-300 relative">
              <Settings size={18} />
              {showSettings && (
                <div className="absolute bottom-full right-0 mb-2 bg-[#272727] border border-[#3a3a3a] rounded-xl p-2 shadow-2xl min-w-[200px] z-50" onClick={(e) => e.stopPropagation()}>
                  <div className="px-2 py-1.5 text-xs text-gray-400 font-medium">Playback speed</div>
                  {speedOptions.map((speed) => (
                    <button key={speed} onClick={() => changePlaybackRate(speed)} className={cn('w-full text-left px-2 py-1.5 text-sm rounded-lg transition-colors', playbackRate === speed ? 'text-red-500 bg-red-500/10' : 'text-gray-300 hover:bg-yt-hover')}>{speed === 1 ? 'Normal' : `${speed}x`}</button>
                  ))}
                  <div className="border-t border-[#3a3a3a] my-1" />
                  <div className="px-2 py-1.5 text-xs text-gray-400 font-medium">Quality</div>
                  {qualityOptions.map((q) => (
                    <button key={q} className="w-full text-left px-2 py-1.5 text-sm text-gray-300 hover:bg-yt-hover rounded-lg">{q}</button>
                  ))}
                </div>
              )}
            </button>
            <button className="text-white p-1.5 hover:text-gray-300"><Subtitles size={18} /></button>
            <button onClick={enterMiniPlayer} className="text-white p-1.5 hover:text-gray-300"><PictureInPicture2 size={18} /></button>
            <button onClick={toggleTheaterMode} className="text-white p-1.5 hover:text-gray-300"><Monitor size={18} /></button>
            <button onClick={toggleFullscreen} className="text-white p-1.5 hover:text-gray-300">{isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
