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
    onError?: (error: any) => void;
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

const registerVhsHook = () => {
    const Vhs = (videojs as any).Vhs;
    if (Vhs && Vhs.xhr) {
        if (typeof Vhs.xhr.onRequest === 'function') {
            if (!(Vhs.xhr as any)._hasPelagicaHook) {
                (Vhs.xhr as any)._hasPelagicaHook = true;
                Vhs.xhr.onRequest((options: any) => {
                    if (options.uri) {
                        try {
                            const isSegment = /\.(ts|mp4|m4s|key|aac|vtt|srt|webm|webma)($|\?)/i.test(options.uri);
                            if (isSegment && options.uri.includes('StartTimeTicks=')) {
                                const urlParts = options.uri.split('?');
                                if (urlParts.length === 2) {
                                    const params = urlParts[1].split('&').filter((p: string) => !p.startsWith('StartTimeTicks='));
                                    options.uri = urlParts[0] + '?' + params.join('&');
                                }
                            }
                        } catch {
                            // Ignore URL parsing errors
                        }
                    }
                    return options;
                });
            }
        }
    }
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
    onError,
}: VideoPlayerProps) => {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const playerRef = useRef<VideoJsPlayer | null>(null);
    const initialStartTicksRef = useRef(startTicks);
    const hasSeekedRef = useRef(false);
    const [isBuffering, setIsBuffering] = useState(true);
    const [isPlayerInitialized, setIsPlayerInitialized] = useState(false);
    const [prevSrc, setPrevSrc] = useState(src);
    const [resolvedSubtitles, setResolvedSubtitles] = useState<SubtitleTrack[]>([]);

    if (src !== prevSrc) {
        setPrevSrc(src);
        setIsBuffering(true);
    }

    // Resolve subtitle VTT files: fetch, strip UTF-8 BOM, and create Blob URL to prevent Video.js/browser parsing errors
    useEffect(() => {
        if (!subtitles || subtitles.length === 0) {
            setResolvedSubtitles([]);
            return;
        }

        let active = true;
        const objectUrls: string[] = [];

        const resolveTracks = async () => {
            const resolved = await Promise.all(
                subtitles.map(async (track): Promise<SubtitleTrack> => {
                    if (track.src && (track.src.includes('/Subtitles/') || track.src.includes('.vtt'))) {
                        try {
                            const res = await window.fetch(track.src);
                            if (res.ok) {
                                let text = await res.text();
                                if (text.startsWith('\uFEFF')) {
                                    text = text.substring(1);
                                }
                                // Remove invalid region header blocks that cause Video.js/native ParsingError
                                const lines = text.split(/\r?\n/);
                                const cleanedLines = lines.filter(line => !line.trim().startsWith('Region:'));
                                text = cleanedLines.join('\n');

                                const blob = new Blob([text], { type: 'text/vtt;charset=utf-8' });
                                const blobUrl = URL.createObjectURL(blob);
                                objectUrls.push(blobUrl);
                                return {
                                    ...track,
                                    src: blobUrl,
                                };
                            }
                        } catch (error) {
                            console.error('[VideoPlayer] Failed to load/clean subtitle:', track.src, error);
                        }
                    }
                    return track;
                })
            );

            if (active) {
                setResolvedSubtitles(resolved);
            }
        };

        resolveTracks();

        return () => {
            active = false;
            objectUrls.forEach((url) => {
                try {
                    URL.revokeObjectURL(url);
                } catch {}
            });
        };
    }, [subtitles]);

    const onErrorRef = useRef(onError);
    useEffect(() => {
        onErrorRef.current = onError;
    }, [onError]);

    const hasTriggeredZeroDimRef = useRef(false);

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
        const handleError = (e: any) => {
            setIsBuffering(false);
            const err = player.error();
            console.warn('[VideoPlayer] Playback error encountered:', err || e);
            onErrorRef.current?.(err || e);
        };

        const checkZeroDimensionVideo = () => {
            if (!player || player.isDisposed?.()) return;
            try {
                const videoEl = player.el()?.querySelector('video') as HTMLVideoElement | null;
                if (
                    videoEl &&
                    !player.paused() &&
                    (player.currentTime() || 0) >= 3.0 &&
                    (player.readyState?.() ?? 0) >= 3
                ) {
                    if (!hasTriggeredZeroDimRef.current && (videoEl.videoWidth === 0 || videoEl.videoHeight === 0)) {
                        hasTriggeredZeroDimRef.current = true;
                        console.warn('[VideoPlayer] Video playing with 0 dimensions (black screen), falling back to transcode...');
                        onErrorRef.current?.({ message: 'Zero video dimensions during playback' });
                    }
                }
            } catch {}
        };

        player.on('waiting', handleWaiting);
        player.on('playing', handlePlaying);
        player.on('seeking', handleSeeking);
        player.on('seeked', handleSeeked);
        player.on('loadstart', handleLoadStart);
        player.on('canplay', handleCanPlay);
        player.on('pause', handlePause);
        player.on('error', handleError);
        player.on('timeupdate', checkZeroDimensionVideo);

        player.ready(() => {
            registerVhsHook();
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
                p.off('timeupdate', checkZeroDimensionVideo);
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

        if (loadedSrcRef.current === src) return;
        loadedSrcRef.current = src;
        hasTriggeredZeroDimRef.current = false;

        let seekTo: number | null = null;

        if (isAudioSwitchRef.current) {
            seekTo = player.currentTime() || null;
            isAudioSwitchRef.current = false;
        } else if (!hasSeekedRef.current && initialStartTicksRef.current > 0) {
            seekTo = initialStartTicksRef.current / 10_000_000;
            hasSeekedRef.current = true;
        } else if (!hasSeekedRef.current) {
            hasSeekedRef.current = true;
        }

        let hasApplied = false;
        const applySeekAndPlay = () => {
            if (hasApplied) return;
            hasApplied = true;
            if (seekTo !== null && seekTo > 0) {
                try {
                    player.currentTime(seekTo);
                } catch (e) {
                    console.warn('[VideoPlayer] Seek error:', e);
                }
            }
            player.play()?.catch((err) => {
                console.error('[VideoPlayer] Play error:', err);
                setIsBuffering(false);
            });
        };

        player.one('loadedmetadata', applySeekAndPlay);
        player.one('canplay', applySeekAndPlay);
        player.one('playing', applySeekAndPlay);

        player.pause();
        player.src({ src, type: srcType });
        player.load();

        if (player.readyState() >= 1) {
            applySeekAndPlay();
        }
    }, [src, srcType, isAudioSwitchRef, isPlayerInitialized]);

    useEffect(() => {
        if (!playerRef.current) return;

        const player = playerRef.current;

        const addSubtitles = (activeIndex: number | null) => {
            const tracks = player.remoteTextTracks();
            let needsRebuild = false;
            if (tracks.tracks_.length !== (resolvedSubtitles?.length || 0)) {
                needsRebuild = true;
            } else {
                for (let i = 0; i < tracks.tracks_.length; i++) {
                    if (tracks.tracks_[i].src !== resolvedSubtitles[i].src) {
                        needsRebuild = true;
                        break;
                    }
                }
            }

            if (needsRebuild) {
                while (tracks.tracks_.length > 0) {
                    const track = tracks.tracks_[0];
                    if (track) player.removeRemoteTextTrack(track);
                }

                if (resolvedSubtitles && resolvedSubtitles.length > 0) {
                    resolvedSubtitles.forEach((subtitle, index) => {
                        player.addRemoteTextTrack(
                            {
                                kind: 'subtitles',
                                src: subtitle.src,
                                srclang: subtitle.srclang,
                                label: subtitle.label,
                                default: subtitle.default,
                            },
                            false
                        );

                        const addedTrack = player.remoteTextTracks().tracks_[index];
                        if (addedTrack) {
                            addedTrack.mode = index === activeIndex ? 'showing' : 'disabled';
                        }
                    });
                }
            } else {
                for (let i = 0; i < tracks.tracks_.length; i++) {
                    const mode = i === activeIndex ? 'showing' : 'disabled';
                    if (tracks.tracks_[i].mode !== mode) {
                        tracks.tracks_[i].mode = mode;
                    }
                }
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
    }, [resolvedSubtitles, src, subtitleTrackIndex]);

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
    }, [subtitleDelay, subtitleTrackIndex, resolvedSubtitles, src]);

    return (
        <div
            className="w-full h-full overflow-hidden relative"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
            <video
                ref={videoRef}
                className="video-js"
                data-testid="video-player"
                crossOrigin="anonymous"
                style={{ maxWidth: '100%', maxHeight: '100%', width: '100%', height: '100%' }}
            >
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
