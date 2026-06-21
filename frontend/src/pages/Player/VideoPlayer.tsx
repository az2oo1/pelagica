import { useEffect, useRef, useState } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';
import { Loader2 } from 'lucide-react';

type VideoJsPlayer = ReturnType<typeof videojs>;

export interface SubtitleTrack {
    src: string;
    srclang: string;
    label: string;
    default?: boolean;
}

interface VideoPlayerProps {
    src: string;
    srcType?: string;
    poster?: string;
    startTicks: number;
    subtitles?: SubtitleTrack[];
    onReady?: (player: VideoJsPlayer) => void;
    isAudioSwitchRef: React.MutableRefObject<boolean>;
    subtitleTrackIndex: number | null;
    subtitleDelay: number;
}

const adjustTrackCues = (track: any, delay: number) => {
    if (!track) return;

    if (track.adjustInterval) {
        clearInterval(track.adjustInterval);
        track.adjustInterval = null;
    }

    const applyDelay = () => {
        if (!track.cues || track.cues.length === 0) return false;
        for (let i = 0; i < track.cues.length; i++) {
            const cue = track.cues[i];
            if (cue.originalStart === undefined) {
                cue.originalStart = cue.startTime;
                cue.originalEnd = cue.endTime;
            }
            cue.startTime = cue.originalStart + delay;
            cue.endTime = cue.originalEnd + delay;
        }
        return true;
    };

    // Try immediately
    if (applyDelay()) return;

    // If not loaded yet, poll for it (e.g. up to 10 seconds)
    let attempts = 0;
    track.adjustInterval = setInterval(() => {
        attempts++;
        if (applyDelay() || attempts > 100) {
            clearInterval(track.adjustInterval);
            track.adjustInterval = null;
        }
    }, 100);
};

const VideoPlayer = ({
    src,
    srcType = 'application/x-mpegURL',
    poster,
    startTicks,
    subtitles,
    onReady,
    isAudioSwitchRef,
    subtitleTrackIndex,
    subtitleDelay,
}: VideoPlayerProps) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const playerRef = useRef<VideoJsPlayer | null>(null);
    const initialStartTicksRef = useRef(startTicks);
    const hasSeekedRef = useRef(false);
    const [isBuffering, setIsBuffering] = useState(true);
    const [isPlayerInitialized, setIsPlayerInitialized] = useState(false);
    const [prevSrc, setPrevSrc] = useState(src);

    if (src !== prevSrc) {
        setPrevSrc(src);
        setIsBuffering(true);
    }

    useEffect(() => {
        if (!videoRef.current) return;

        const player = videojs(videoRef.current, {
            controls: false,
            autoplay: false,
            preload: 'auto',
            poster: poster,
            responsive: false,
            fluid: false,
            controlBar: false,
            bigPlayButton: false,
            loadingSpinner: false,
            errorDisplay: false,
            html5: {
                nativeControlsForTouch: false,
                hls: { overrideNative: true },
                nativeTextTracks: false,
            },
        });

        playerRef.current = player;

        const handleWaiting = () => setIsBuffering(true);
        const handlePlaying = () => setIsBuffering(false);
        const handleSeeking = () => setIsBuffering(true);
        const handleSeeked = () => setIsBuffering(false);
        const handleLoadStart = () => setIsBuffering(true);
        const handleCanPlay = () => setIsBuffering(false);
        const handlePause = () => setIsBuffering(false);
        const handleError = () => setIsBuffering(false);

        player.on('waiting', handleWaiting);
        player.on('playing', handlePlaying);
        player.on('seeking', handleSeeking);
        player.on('seeked', handleSeeked);
        player.on('loadstart', handleLoadStart);
        player.on('canplay', handleCanPlay);
        player.on('pause', handlePause);
        player.on('error', handleError);

        player.ready(() => {
            onReady?.(player);
            setIsPlayerInitialized(true);
        });

        return () => {
            if (playerRef.current) {
                const p = playerRef.current;
                p.off('waiting', handleWaiting);
                p.off('playing', handlePlaying);
                p.off('seeking', handleSeeking);
                p.off('seeked', handleSeeked);
                p.off('loadstart', handleLoadStart);
                p.off('canplay', handleCanPlay);
                p.off('pause', handlePause);
                p.off('error', handleError);
                p.dispose();
                playerRef.current = null;
                setIsPlayerInitialized(false);
            }
        };
    }, [onReady, poster]);

    const loadedSrcRef = useRef<string | null>(null);

    useEffect(() => {
        if (!playerRef.current || !isPlayerInitialized || !src) return;

        const player = playerRef.current;

        // Prevent setting the exact same source again to avoid AbortError during re-renders or StrictMode
        if (loadedSrcRef.current === src) return;
        loadedSrcRef.current = src;

        let seekTo: number | null = null;

        if (isAudioSwitchRef.current) {
            seekTo = player.currentTime() || null;
            isAudioSwitchRef.current = false;
        } else if (!hasSeekedRef.current && initialStartTicksRef.current > 0) {
            seekTo = initialStartTicksRef.current / 10_000_000;
            hasSeekedRef.current = true;
        }

        player.pause();
        player.src({ src, type: srcType });
        player.load();

        const applySeekAndPlay = () => {
            if (seekTo !== null && seekTo > 0) {
                player.currentTime(seekTo);
            }
            player.play()?.catch((err) => {
                console.error('[VideoPlayer] Play error:', err);
                setIsBuffering(false);
            });
        };

        if (player.readyState() >= 1) {
            applySeekAndPlay();
        } else {
            player.one('loadedmetadata', applySeekAndPlay);
        }
    }, [src, srcType, isAudioSwitchRef, isPlayerInitialized]);

    useEffect(() => {
        if (!playerRef.current) return;

        const player = playerRef.current;

        const addSubtitles = (activeIndex: number | null) => {
            const tracks = player.remoteTextTracks();
            while (tracks.tracks_.length > 0) {
                const track = tracks.tracks_[0];
                if (track) player.removeRemoteTextTrack(track);
            }

            if (subtitles && subtitles.length > 0) {
                subtitles.forEach((subtitle, index) => {
                    player.addRemoteTextTrack(
                        {
                            kind: 'subtitles',
                            src: subtitle.src,
                            srclang: subtitle.srclang,
                            label: subtitle.label,
                            default: subtitle.default,
                        },
                        false // Don't add to DOM manually
                    );

                    const addedTrack = player.remoteTextTracks().tracks_[index];
                    if (addedTrack) {
                        addedTrack.mode = index === activeIndex ? 'showing' : 'disabled';
                    }
                });
            }
        };

        addSubtitles(subtitleTrackIndex);

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                addSubtitles(subtitleTrackIndex);
            }
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, [subtitles, src, subtitleTrackIndex]);

    useEffect(() => {
        if (!playerRef.current) return;
        const player = playerRef.current;
        const tracks = player.remoteTextTracks();
        
        let activeTrack: any = null;
        if (subtitleTrackIndex !== null && subtitleTrackIndex >= 0) {
            activeTrack = tracks.tracks_[subtitleTrackIndex];
        }
        
        if (activeTrack) {
            adjustTrackCues(activeTrack, subtitleDelay);
        }
    }, [subtitleDelay, subtitleTrackIndex, subtitles, src]);

    return (
        <div
            className="w-full h-full overflow-hidden relative"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
            <video
                ref={videoRef}
                className="video-js"
                data-testid="video-player"
                style={{ maxWidth: '100%', maxHeight: '100%', width: '100%', height: '100%' }}
            >
                <track kind="captions" srcLang="en" label="English" />
            </video>
            {isBuffering && (
                <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/40 backdrop-blur-[2px] transition-opacity duration-300 pointer-events-none">
                    <Loader2 className="w-10 h-10 animate-spin text-white" />
                </div>
            )}
        </div>
    );
};

export default VideoPlayer;
