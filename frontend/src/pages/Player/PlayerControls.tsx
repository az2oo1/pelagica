import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Play,
    Pause,
    Volume2,
    VolumeX,
    Maximize,
    ArrowLeft,
    PictureInPicture2,
    AudioLines,
    SkipForward,
    Subtitles,
    Dot,
    Info,
    Minimize,
    SkipBack,
    ListVideo,
    Tv,
} from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Badge } from '@/components/ui/badge';
import type {
    BaseItemDto,
    MediaSegmentDto,
    MediaSegmentType,
    TrickplayInfoDto,
} from '@jellyfin/sdk/lib/generated-client/models';
import { Slider } from '../../components/ui/slider';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatPlayTime, ticksToReadableTime, ticksToSeconds, getEndsAt } from '@/utils/timeConversion';
import { buildPlayerUrl } from '@/utils/playerUrl';
import { useTranslation } from 'react-i18next';
import { usePlayerKeyboardControls } from '@/hooks/usePlayerKeyboardControls';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { getPrimaryImageUrl, getTrickplayImageUrl, getLogoUrl, getItemImageUrl } from '@/utils/jellyfinUrls';
import { useReportPlaybackProgress } from '@/hooks/api/usePlaybackProgress';
import { getRuntimePlaybackStats, type RuntimePlaybackStats } from '@/utils/playbackStats';
import { useSession } from '@/hooks/api/useSession';
import { useConfig } from '@/hooks/api/useConfig';
import { useEpisodes } from '@/hooks/api/useEpisodes';
import {
    removeLastSubtitleLanguage,
    setLastAudioLanguage,
    setLastSubtitleLanguage,
} from '@/utils/localstorageLastlanguage';

function getPrimaryTrickplayInfo(trickplay?: BaseItemDto['Trickplay']) {
    if (!trickplay) return null;

    const entries = Object.values(trickplay);
    if (entries.length === 0) return null;
    const subEntries = Object.values(entries[0]);
    return subEntries[0] || null;
}

function getTrickplayTile(time: number, trickplay: TrickplayInfoDto) {
    const interval = trickplay.Interval ?? 1;
    const tileWidth = trickplay.TileWidth ?? 1;
    const tileHeight = trickplay.TileHeight ?? 1;

    const timeMs = time * 1000;
    const thumbnailIndex = Math.floor(timeMs / interval);
    const tilesPerImage = tileWidth * tileHeight;

    const imageIndex = Math.floor(thumbnailIndex / tilesPerImage);
    const tileIndex = thumbnailIndex % tilesPerImage;

    const x = tileIndex % tileWidth;
    const y = Math.floor(tileIndex / tileWidth);

    // console.log({
    //     time,
    //     interval: trickplay.Interval,
    //     thumbnailIndex,
    //     tilesPerImage,
    //     imageIndex,
    //     totalImages: Math.ceil((trickplay.ThumbnailCount ?? 0) / tilesPerImage),
    // });

    return {
        thumbnailIndex,
        imageIndex,
        x,
        y,
        width: trickplay.Width,
        height: trickplay.Height,
    };
}

function getCleanRating(rating?: string) {
    if (!rating) return '';
    const colonParts = rating.split(':');
    let clean = colonParts[colonParts.length - 1].trim();
    clean = clean.replace(/^(US|us)-/, '');
    return clean.toUpperCase();
}

interface PlayerControlsProps {
    item: BaseItemDto;
    player: ReturnType<typeof import('video.js').default> | null;
    audioTrackIndex: number | null;
    onAudioTrackChange: (index: number) => void;
    subtitleTrackIndex: number | null;
    onSubtitleTrackChange: (index: number | null) => void;
    subtitleSize: number;
    setSubtitleSize: React.Dispatch<React.SetStateAction<number>>;
    subtitleDelay: number;
    setSubtitleDelay: React.Dispatch<React.SetStateAction<number>>;
    isFullscreen: boolean;
    onFullscreenToggle?: () => void;
    mediaSegments?: MediaSegmentDto[];
    previousItem?: BaseItemDto | null;
    nextItem?: BaseItemDto | null;
    srcUrl: string;
    containerRef: React.RefObject<HTMLDivElement | null>;
    timeOffset?: number;
}

const PlayerControls = ({
    item,
    player,
    audioTrackIndex,
    onAudioTrackChange,
    subtitleTrackIndex,
    onSubtitleTrackChange,
    subtitleSize,
    setSubtitleSize,
    subtitleDelay,
    setSubtitleDelay,
    isFullscreen,
    onFullscreenToggle,
    mediaSegments,
    previousItem,
    nextItem,
    srcUrl,
    containerRef,
    timeOffset = 0,
}: PlayerControlsProps) => {
    const { t } = useTranslation('player');
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [failedLogo, setFailedLogo] = useState(false);
    const [discImageFailed, setDiscImageFailed] = useState(false);
    const [showPauseOverlay, setShowPauseOverlay] = useState(false);
    const [duration, setDuration] = useState(0);
    const [bufferedTime, setBufferedTime] = useState(0);
    const [volume, setVolume] = useState(() => {
        const saved = localStorage.getItem('playerVolume');
        return saved ? parseFloat(saved) : 1;
    });
    const [isMuted, setIsMuted] = useState(false);
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const [hoverPosition, setHoverPosition] = useState<number>(0);
    const [showControls, setShowControls] = useState(true);
    const [isPiP, setIsPiP] = useState(false);
    const progressRef = useRef<HTMLDivElement>(null);
    const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const backUrl = searchParams.get('backUrl');
    const { reportProgress } = useReportPlaybackProgress();
    const [dismissedNextItemPrompt, setDismissedNextItemPrompt] = useState(false);
    const [stats, setStats] = useState<RuntimePlaybackStats | null>(null);
    const [showStats, setShowStats] = useState(false);
    const [container, setContainer] = useState<HTMLElement | null>(null);
    const { data: session } = useSession(item.Id, showStats);
    const { config } = useConfig();
    const { data: seasonEpisodes } = useEpisodes(item.Type === 'Episode' ? item.SeasonId : null);

    const [isProgressBarFocused, setIsProgressBarFocused] = useState(false);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [scrubbingTime, setScrubbingTime] = useState<number>(0);

    const handleBack = () => {
        if (backUrl) {
            navigate(backUrl);
        } else {
            navigate(-1);
        }
    };

    useEffect(() => {
        setContainer(containerRef.current);
    }, [containerRef]);

    useEffect(() => {
        if (!player) return;
        const update = () =>
            setStats(getRuntimePlaybackStats(player, item, session, audioTrackIndex, srcUrl));
        update();
        const interval = setInterval(update, 2000);
        return () => clearInterval(interval);
    }, [player, item, session, audioTrackIndex, srcUrl, showStats]);

    const resetPauseTimer = useCallback(() => {
        if (pauseTimerRef.current) {
            clearTimeout(pauseTimerRef.current);
        }
        if (!isPlaying) {
            setShowPauseOverlay(false);
            pauseTimerRef.current = setTimeout(() => {
                setShowPauseOverlay(true);
            }, 15000);
        }
    }, [isPlaying]);

    const resetHideTimeout = useCallback(() => {
        setShowControls(true);
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
        }
        if (isScrubbing) return;
        hideTimeoutRef.current = setTimeout(() => {
            setShowControls(false);
        }, 3000);
    }, [isScrubbing]);

    useEffect(() => {
        if (isScrubbing) {
            setShowControls(true);
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
                hideTimeoutRef.current = null;
            }
        } else {
            resetHideTimeout();
        }
    }, [isScrubbing, resetHideTimeout]);

    useEffect(() => {
        if (config.showPauseOverlay === false || isPlaying) {
            setShowPauseOverlay(false);
            if (pauseTimerRef.current) {
                clearTimeout(pauseTimerRef.current);
                pauseTimerRef.current = null;
            }
        }
    }, [isPlaying, config.showPauseOverlay]);

    useEffect(() => {
        const handleActivity = () => {
            if (!isPlaying) {
                resetPauseTimer();
            }
            resetHideTimeout();
        };

        window.addEventListener('mousemove', handleActivity);
        window.addEventListener('keydown', handleActivity, { capture: true });
        window.addEventListener('click', handleActivity);
        window.addEventListener('touchstart', handleActivity);

        if (!isPlaying) {
            resetPauseTimer();
        }

        return () => {
            window.removeEventListener('mousemove', handleActivity);
            window.removeEventListener('keydown', handleActivity, { capture: true });
            window.removeEventListener('click', handleActivity);
            window.removeEventListener('touchstart', handleActivity);
            if (pauseTimerRef.current) {
                clearTimeout(pauseTimerRef.current);
            }
        };
    }, [isPlaying, resetPauseTimer, resetHideTimeout]);

    const handleMouseMove = () => {
        resetHideTimeout();
        if (!isPlaying) {
            resetPauseTimer();
        }
    };

    const handleMouseLeave = () => {
        setShowControls(false);
        if (hideTimeoutRef.current) {
            clearTimeout(hideTimeoutRef.current);
        }
    };

    const markItemAsCompleted = useCallback(
        (itemId: string | undefined) => {
            if (!itemId) return;
            reportProgress({
                itemId,
                positionTicks: item.RunTimeTicks || 0,
                isPaused: true,
            });
        },
        [item.RunTimeTicks, reportProgress]
    );

    useEffect(() => {
        return () => {
            if (hideTimeoutRef.current) {
                clearTimeout(hideTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        localStorage.setItem('playerVolume', volume.toString());
    }, [volume]);

    useEffect(() => {
        if (!player || player.isDisposed?.()) return;

        player.volume(volume);

        const updatePlayState = () => setIsPlaying(!player.paused());
        const updateTime = () => setCurrentTime(player.currentTime() || 0);
        const updateDuration = () => setDuration(player.duration() || 0);
        const updateMuted = () => setIsMuted(player.muted() || false);
        const updateBuffered = () => {
            const buffered = player.buffered();
            if (buffered && buffered.length > 0) {
                setBufferedTime(buffered.end(buffered.length - 1));
            }
        };

        const handleEnded = () => {
            if (!nextItem) return;
            markItemAsCompleted(item.Id);
            navigate(buildPlayerUrl(nextItem.Id!, backUrl ?? undefined));
        };

        // PiP event listeners
        const videoEl = player.el()?.querySelector('video');
        const handleEnterPiP = () => setIsPiP(true);
        const handleLeavePiP = () => setIsPiP(false);
        if (videoEl) {
            videoEl.addEventListener('enterpictureinpicture', handleEnterPiP);
            videoEl.addEventListener('leavepictureinpicture', handleLeavePiP);
        }

        player.on('play', updatePlayState);
        player.on('pause', updatePlayState);
        player.on('timeupdate', updateTime);
        player.on('timeupdate', updateBuffered);
        player.on('loadedmetadata', updateDuration);
        player.on('progress', updateBuffered);
        player.on('volumechange', updateMuted);
        player.on('ended', handleEnded);

        return () => {
            player.off('play', updatePlayState);
            player.off('pause', updatePlayState);
            player.off('timeupdate', updateTime);
            player.off('timeupdate', updateBuffered);
            player.off('loadedmetadata', updateDuration);
            player.off('progress', updateBuffered);
            player.off('volumechange', updateMuted);
            player.off('ended', handleEnded);

            if (videoEl) {
                videoEl.removeEventListener('enterpictureinpicture', handleEnterPiP);
                videoEl.removeEventListener('leavepictureinpicture', handleLeavePiP);
            }
        };
    }, [
        player,
        volume,
        nextItem,
        dismissedNextItemPrompt,
        item.Id,
        navigate,
        markItemAsCompleted,
        backUrl,
    ]);

    const togglePlay = useCallback(() => {
        if (!player) return;
        if (player.paused()) {
            player.play();
        } else {
            player.pause();
        }
    }, [player]);

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!player || !progressRef.current) return;
        if (e.clientX === 0 && e.clientY === 0) return;
        const rect = progressRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = x / rect.width;
        player.currentTime(percentage * displayDuration - timeOffset);
    };

    const handleProgressHover = (e: React.MouseEvent<HTMLDivElement>) => {
        if (isScrubbing) return;
        if (!progressRef.current || !displayDuration) return;
        const rect = progressRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        setHoverTime(percentage * displayDuration);
        setHoverPosition(x);
    };

    const handleProgressLeave = () => {
        if (isScrubbing) return;
        setHoverTime(null);
    };

    const handleProgressBarKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            if (!isScrubbing) {
                setIsScrubbing(true);
                setScrubbingTime(clampedCurrentTime);
                setHoverTime(clampedCurrentTime);
                if (progressRef.current && displayDuration) {
                    const rect = progressRef.current.getBoundingClientRect();
                    setHoverPosition((clampedCurrentTime / displayDuration) * rect.width);
                }
            } else {
                player?.currentTime(scrubbingTime - timeOffset);
                setIsScrubbing(false);
                setHoverTime(null);
            }
        }
    };

    useEffect(() => {
        if (!isScrubbing || !player || !displayDuration) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (['ArrowLeft', 'ArrowRight', 'a', 'A', 'd', 'D', 'Enter', ' ', 'Escape'].includes(e.key)) {
                e.preventDefault();
                e.stopPropagation();
            }

            const step = Math.max(5, displayDuration * 0.01); // 1% or 5s

            if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
                setScrubbingTime((prev) => {
                    const next = Math.min(displayDuration, prev + step);
                    setHoverTime(next);
                    if (progressRef.current) {
                        const rect = progressRef.current.getBoundingClientRect();
                        setHoverPosition((next / displayDuration) * rect.width);
                    }
                    player.currentTime(next - timeOffset);
                    return next;
                });
            } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
                setScrubbingTime((prev) => {
                    const next = Math.max(0, prev - step);
                    setHoverTime(next);
                    if (progressRef.current) {
                        const rect = progressRef.current.getBoundingClientRect();
                        setHoverPosition((next / displayDuration) * rect.width);
                    }
                    player.currentTime(next - timeOffset);
                    return next;
                });
            } else if (e.key === 'Enter' || e.key === ' ') {
                player.currentTime(scrubbingTime - timeOffset);
                setIsScrubbing(false);
                setHoverTime(null);
            } else if (e.key === 'Escape') {
                setIsScrubbing(false);
                setHoverTime(null);
            }
        };

        window.addEventListener('keydown', handleKeyDown, { capture: true });
        return () => {
            window.removeEventListener('keydown', handleKeyDown, { capture: true });
        };
    }, [isScrubbing, duration, player, scrubbingTime]);

    const togglePiP = useCallback(async () => {
        if (!player) return;
        const videoEl = player.el()?.querySelector('video');
        if (!videoEl) return;

        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else if (document.pictureInPictureEnabled) {
                await videoEl.requestPictureInPicture();
            }
        } catch (error) {
            console.error('Error toggling PiP:', error);
        }
    }, [player]);

    const handleVolumeChange = (values: number[]) => {
        if (!player || values.length === 0) return;
        const newVolume = values[0];
        setVolume(newVolume);
        if (newVolume > 0 && isMuted) player.muted(false);
        if (newVolume === 0 && !isMuted) player.muted(true);
        player.volume(newVolume);
    };

    const toggleMute = useCallback(() => {
        if (!player) return;
        player.muted(!isMuted);
    }, [player, isMuted]);

    const toggleFullscreen = useCallback(() => {
        onFullscreenToggle?.();
    }, [onFullscreenToggle]);

    const handleAudioTrackChange = (value: string) => {
        const index = parseInt(value, 10);
        onAudioTrackChange(index);
        setLastAudioLanguage(item.Id || '', index);
    };

    const handleSubtitleTrackChange = (value: string) => {
        if (value === 'off') {
            onSubtitleTrackChange(null);
            removeLastSubtitleLanguage(item.Id || '');
        } else {
            const index = parseInt(value, 10);
            onSubtitleTrackChange(index);
            setLastSubtitleLanguage(item.Id || '', index);
        }
    };

    const getMediaSegment = (type: MediaSegmentType) => {
        if (!mediaSegments || mediaSegments.length === 0) return null;
        return mediaSegments.find((segment) => segment.Type === type) || null;
    };

    const handleSkipSegment = (type: MediaSegmentType) => {
        if (!player) return;
        const segment = getMediaSegment(type);
        if (segment?.EndTicks) {
            const endSeconds = ticksToSeconds(segment.EndTicks);
            player.currentTime(endSeconds);
        }
    };

    const handleSeekBackward = useCallback(() => {
        if (!player) return;
        const newTime = Math.max(0, (player.currentTime() || 0) - 10);
        player.currentTime(newTime);
    }, [player]);

    const handleSeekForward = useCallback(() => {
        if (!player) return;
        const newTime = Math.min(duration, (player.currentTime() || 0) + 10);
        player.currentTime(newTime);
    }, [player, duration]);

    const handleVolumeUp = useCallback(() => {
        if (!player) return;
        setVolume((prev) => {
            const next = Math.min(1, prev + 0.05);
            player.volume(next);
            if (next > 0 && player.muted()) {
                player.muted(false);
            }
            return next;
        });
    }, [player]);

    const handleVolumeDown = useCallback(() => {
        if (!player) return;
        setVolume((prev) => {
            const next = Math.max(0, prev - 0.05);
            player.volume(next);
            if (next === 0 && !player.muted()) {
                player.muted(true);
            }
            return next;
        });
    }, [player]);

    usePlayerKeyboardControls({
        togglePlay,
        toggleMute,
        toggleFullscreen,
        togglePiP,
        handleSeekBackward,
        handleSeekForward,
        handleVolumeUp,
        handleVolumeDown,
        onActivity: resetHideTimeout,
    });

    const displayCurrentTime = currentTime + timeOffset;
    const displayDuration = timeOffset > 0 && item.RunTimeTicks ? item.RunTimeTicks / 10_000_000 : duration;
    const isLiveTvStream =
        item.Type === 'TvChannel' ||
        item.Type === 'LiveTvChannel' ||
        item.Type === 'Channel' ||
        item.Type === 'LiveTvProgram' ||
        item.Type === 'Program' ||
        !isFinite(displayDuration) ||
        displayDuration <= 0;
    const displayBufferedTime = bufferedTime + timeOffset;

    const introSegment = getMediaSegment('Intro');
    const showSkipIntroButton =
        introSegment &&
        introSegment.StartTicks != null &&
        introSegment.EndTicks != null &&
        displayCurrentTime > ticksToSeconds(introSegment.StartTicks) &&
        displayCurrentTime < ticksToSeconds(introSegment.EndTicks);

    const outtroSegment = getMediaSegment('Outro');
    const showSkipOutroButton =
        outtroSegment &&
        outtroSegment.StartTicks != null &&
        outtroSegment.EndTicks != null &&
        displayCurrentTime > ticksToSeconds(outtroSegment.StartTicks) &&
        displayCurrentTime < ticksToSeconds(outtroSegment.EndTicks);

    const clampedCurrentTime = displayDuration > 0 ? Math.min(displayCurrentTime, displayDuration) : displayCurrentTime;
    const progressPercentage = Math.min(
        100,
        displayDuration > 0 ? (clampedCurrentTime / displayDuration) * 100 : 0
    );
    const bufferedPercentage = Math.min(100, displayDuration > 0 ? (displayBufferedTime / displayDuration) * 100 : 0);

    const title =
        item.Type === 'Episode'
            ? `${item.SeriesName} - S${item.ParentIndexNumber}E${item.IndexNumber} - ${item.Name}`
            : item.Name;

    const audioStreams = item.MediaStreams?.filter((s) => s.Type === 'Audio') || [];
    const subtitleStreams = item.MediaStreams?.filter((s) => s.Type === 'Subtitle') || [];

    const timeRemaining = displayDuration - displayCurrentTime;
    const showNextItemPrompt =
        nextItem &&
        displayDuration > 0 &&
        !dismissedNextItemPrompt &&
        (timeRemaining <= 30 || // 30 sec remaining
            (displayDuration > 0 && displayCurrentTime / displayDuration >= 0.95)); // or 95% complete

    return (
        <>
            <div
                className="absolute top-0 left-0 w-full p-4 bg-linear-to-b from-black/80 to-transparent z-20 text-gray-200 text-lg flex items-center gap-2 transition-opacity duration-300"
                style={{
                    opacity: showControls && !showPauseOverlay ? 1 : 0,
                    pointerEvents: showControls && !showPauseOverlay ? 'auto' : 'none',
                }}
                onMouseMove={handleMouseMove}
            >
                <Button variant="ghost" onClick={handleBack} tabIndex={-1}>
                    <ArrowLeft />
                </Button>
                <h1>{title}</h1>
            </div>
            <div
                className={`absolute inset-0 z-10 p-4 ${showControls ? '' : 'cursor-none'}`}
                onClick={togglePlay}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            />
            <div className="absolute bottom-28 right-8 z-30 flex gap-2">
                {showSkipIntroButton && !showNextItemPrompt && (
                    <Button
                        variant={'default'}
                        onClick={() => handleSkipSegment('Intro')}
                        className="cursor-pointer"
                        title={t('skipIntro')}
                    >
                        <SkipForward />
                        {t('skipIntro')}
                    </Button>
                )}
                {showSkipOutroButton && !showNextItemPrompt && (
                    <Button
                        variant={'default'}
                        onClick={() => handleSkipSegment('Outro')}
                        className="cursor-pointer"
                        title={t('skipOutro')}
                    >
                        <SkipForward />
                        {t('skipOutro')}
                    </Button>
                )}
                {showNextItemPrompt && (
                    <Card className="gap-2 w-60 md:w-80">
                        <CardHeader>
                            <CardTitle className="text-xl sm:text-2xl">
                                {t('upNext', {
                                    seconds: timeRemaining.toFixed(0),
                                })}
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex flex-col">
                            <img
                                src={getPrimaryImageUrl(nextItem.Id!, {
                                    height: 180,
                                    width: 320,
                                })}
                                alt={nextItem.Name || 'Next item poster'}
                                className="w-full h-auto rounded mb-3 hidden sm:block"
                            />
                            <div className="flex items-center">
                                <p>
                                    {t('seasonEpisode', {
                                        season: nextItem.ParentIndexNumber,
                                        episode: nextItem.IndexNumber,
                                    })}{' '}
                                    ⋅ {nextItem.Name}
                                </p>
                            </div>
                            <div className="flex items-center text-muted-foreground text-xs mb-3">
                                <p>{ticksToReadableTime(nextItem.RunTimeTicks || 0)}</p>
                                <Dot />
                                <p>Ends at {formatPlayTime(duration)}</p>
                            </div>
                            <div className="flex items-center gap-2 w-full">
                                <Button
                                    variant={'default'}
                                    className="flex-1"
                                    onClick={() => {
                                        if (!player || !nextItem) return;
                                        player.pause();
                                        markItemAsCompleted(item.Id);
                                        navigate(
                                            buildPlayerUrl(nextItem.Id!, backUrl ?? undefined)
                                        );
                                    }}
                                >
                                    <SkipForward />
                                    {t('startNow')}
                                </Button>
                                <Button
                                    variant={'outline'}
                                    className="flex-1"
                                    onClick={() => {
                                        setDismissedNextItemPrompt(true);
                                    }}
                                >
                                    {t('dismiss')}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
            <div
                className={`absolute top-18 left-8 z-30 p-4 bg-black/70 text-white text-sm rounded-md max-w-sm ${showStats && stats ? '' : 'hidden'}`}
                style={{
                    pointerEvents: showStats && stats ? 'auto' : 'none',
                }}
                onMouseEnter={handleMouseMove}
                onMouseMove={handleMouseMove}
            >
                {stats && (
                    <div>
                        <h4 className="mb-1">Playback Info</h4>
                        <div className="ml-2">
                            <p>
                                <span>Player</span>{' '}
                                <span className="text-muted-foreground">
                                    {stats.playbackInfo.player}
                                </span>
                            </p>
                            <p>
                                <span>Play method</span>{' '}
                                <span className="text-muted-foreground">
                                    {stats.playbackInfo.transcoding ? 'Transcoded' : 'Direct'}
                                </span>
                            </p>
                            <p>
                                <span>Protocol</span>{' '}
                                <span className="text-muted-foreground">
                                    {stats.playbackInfo.protocol}
                                </span>
                            </p>
                        </div>
                        <h4 className="mb-1 mt-3">Video Info</h4>
                        <div className="ml-2">
                            <p>
                                <span>Video Resolution</span>{' '}
                                <span className="text-muted-foreground">
                                    {stats.videoInfo.videoResolution.width}x
                                    {stats.videoInfo.videoResolution.height}
                                </span>
                            </p>
                            <p>
                                <span>Player Dimensions</span>{' '}
                                <span className="text-muted-foreground">
                                    {stats.videoInfo.playerDimensions.width}x
                                    {stats.videoInfo.playerDimensions.height}
                                </span>
                            </p>
                            <p>
                                <span>Dropped Frames</span>{' '}
                                <span className="text-muted-foreground">
                                    {stats.videoInfo.droppedFrames}
                                </span>
                            </p>
                            <p>
                                <span>Corrupted Frames</span>{' '}
                                <span className="text-muted-foreground">
                                    {stats.videoInfo.corruptedFrames}
                                </span>
                            </p>
                            <p>
                                <span>Total Frames</span>{' '}
                                <span className="text-muted-foreground">
                                    {stats.videoInfo.totalFrames}
                                </span>
                            </p>
                        </div>
                        <h4 className="mb-1 mt-3">Media Info</h4>
                        <div className="ml-2">
                            <p>
                                <span>Video Codec</span>{' '}
                                <span className="text-muted-foreground">
                                    {stats.mediaInfo.videoCodec}
                                </span>
                            </p>
                            <p>
                                <span>Video Bitrate</span>{' '}
                                <span className="text-muted-foreground">
                                    {stats.mediaInfo.videoBitrateKbps ?? 'N/A'} kbps
                                </span>
                            </p>
                            <p>
                                <span>Video Range Type</span>{' '}
                                <span className="text-muted-foreground">
                                    {stats.mediaInfo.videoRangeType || 'N/A'}
                                </span>
                            </p>
                            <p>
                                <span>Audio Codec</span>{' '}
                                <span className="text-muted-foreground">
                                    {stats.mediaInfo.audioCodec}
                                </span>
                            </p>
                            <p>
                                <span>Audio Bitrate</span>{' '}
                                <span className="text-muted-foreground">
                                    {stats.mediaInfo.audioBitrateKbps ?? 'N/A'} kbps
                                </span>
                            </p>
                            <p>
                                <span>Audio Channels</span>{' '}
                                <span className="text-muted-foreground">
                                    {stats.mediaInfo.audioChannels}
                                </span>
                            </p>
                            <p>
                                <span>Audio Sample Rate</span>{' '}
                                <span className="text-muted-foreground">
                                    {stats.mediaInfo.audioSampleRate} Hz
                                </span>
                            </p>
                        </div>
                    </div>
                )}
            </div>
            <div
                className="absolute bottom-0 left-0 right-0 z-20 bg-linear-to-t from-black/80 to-transparent p-4 transition-opacity duration-300"
                style={{
                    opacity: showControls && !showPauseOverlay ? 1 : 0,
                    pointerEvents: showControls && !showPauseOverlay ? 'auto' : 'none',
                }}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
            >
                {/* Progress bar */}
                <div
                    ref={progressRef}
                    id="player-progress-bar"
                    tabIndex={0}
                    data-scrubbing={isScrubbing}
                    onFocus={() => setIsProgressBarFocused(true)}
                    onBlur={() => {
                        setIsProgressBarFocused(false);
                        if (!isScrubbing) {
                            setHoverTime(null);
                        }
                    }}
                    onKeyDown={handleProgressBarKeyDown}
                    className="w-full h-3 rounded cursor-pointer mb-4 transition-all relative outline-none"
                    onClick={handleProgressClick}
                    onMouseMove={handleProgressHover}
                    onMouseLeave={handleProgressLeave}
                >
                    {/* Actually visible bar that's smaller for better aesthetics */}
                    <div
                        className={`absolute left-0 w-full rounded pointer-events-none z-0 transition-all ${
                            (isProgressBarFocused || isScrubbing) ? "top-0.5 h-2 bg-gray-500" : "top-1 h-1 bg-gray-600"
                        }`}
                    />
                    {/* buffered progress */}
                    <div
                        className={`absolute left-0 rounded pointer-events-none z-5 transition-all ${
                            (isProgressBarFocused || isScrubbing) ? "top-0.5 h-2 bg-gray-400" : "top-1 h-1 bg-gray-500"
                        }`}
                        style={{ width: `${bufferedPercentage}%` }}
                    />
                    {/** Bar that shows the hovered time */}
                    <div
                        className={`absolute left-0 rounded pointer-events-none z-10 transition-all ${
                            (isProgressBarFocused || isScrubbing) ? "top-0.5 h-2 bg-white/30" : "top-1 h-1 bg-white/20"
                        }`}
                        style={{
                            width: hoverTime !== null ? `${(hoverTime / duration) * 100}%` : '0%',
                        }}
                    />
                    {/* current progress */}
                    <div
                        className={`absolute left-0 rounded pointer-events-none z-15 transition-all ${
                            (isProgressBarFocused || isScrubbing) ? "top-0.5 h-2 bg-brand" : "top-1 h-1 bg-white"
                        }`}
                        style={{ width: `${progressPercentage}%` }}
                    />
                    {/* Chapter Tick Markers */}
                    {item.Chapters && displayDuration > 0 && item.Chapters.map((chapter, index) => {
                        const startSec = ticksToSeconds(chapter.StartPositionTicks || 0);
                        const pct = (startSec / displayDuration) * 100;
                        if (pct <= 0 || pct >= 99.5) return null;
                        return (
                            <div
                                key={`chapter-tick-${index}`}
                                className={`absolute rounded-full pointer-events-none z-18 transition-all bg-black/90 ${
                                    (isProgressBarFocused || isScrubbing) ? "top-0.5 h-2 w-[3px]" : "top-1 h-1 w-[2px]"
                                }`}
                                style={{ left: `${pct}%` }}
                                title={chapter.Name || undefined}
                            />
                        );
                    })}
                    {/* Circle Playhead Handle */}
                    {(isProgressBarFocused || isScrubbing) && (
                        <div
                            className="absolute top-0 w-3 h-3 bg-white rounded-full -translate-x-1/2 pointer-events-none z-20 shadow-md transition-all scale-110"
                            style={{
                                left: isScrubbing
                                    ? `${(scrubbingTime / duration) * 100}%`
                                    : `${progressPercentage}%`,
                            }}
                        />
                    )}
                    {/* Hover preview */}
                    {hoverTime !== null &&
                        (() => {
                            const activeChapter = item.Chapters?.slice().reverse().find((c) => {
                                const startSec = ticksToSeconds(c.StartPositionTicks || 0);
                                return startSec <= hoverTime;
                            });

                            const trickplayInfo = item.Trickplay ? getPrimaryTrickplayInfo(item.Trickplay) : null;
                            const tile = trickplayInfo ? getTrickplayTile(hoverTime, trickplayInfo) : null;

                            const previewWidth = tile?.width || 320;
                            const halfWidth = previewWidth / 2;
                            const clampedPosition = Math.max(
                                halfWidth,
                                Math.min(hoverPosition, window.innerWidth - halfWidth)
                            );

                            return (
                                <div
                                    className="absolute bottom-4 -translate-x-1/2 text-white pointer-events-none z-40 flex flex-col items-center gap-1"
                                    style={{ left: `${clampedPosition}px` }}
                                >
                                    {tile && (
                                        <div
                                            className="relative overflow-hidden rounded-md"
                                            style={{
                                                width: tile.width,
                                                height: tile.height,
                                            }}
                                        >
                                            <img
                                                src={getTrickplayImageUrl(
                                                    item.Id!,
                                                    tile.width || 320,
                                                    tile.imageIndex
                                                )}
                                                style={{
                                                    position: 'absolute',
                                                    left: -tile.x * (tile.width || 0),
                                                    top: -tile.y * (tile.height || 0),
                                                    maxWidth: 'none',
                                                }}
                                                draggable={false}
                                            />
                                        </div>
                                    )}
                                    <div className="text-center bg-black/90 backdrop-blur-xs p-1.5 px-3 rounded-md w-max border border-white/10 shadow-lg flex flex-col items-center gap-0.5">
                                        {activeChapter?.Name && (
                                            <span className="font-semibold text-brand text-xs max-w-[220px] truncate">
                                                {activeChapter.Name}
                                            </span>
                                        )}
                                        <span className="text-xs font-mono">{formatPlayTime(hoverTime)}</span>
                                    </div>
                                </div>
                            );
                        })()}
                </div>

                {/* Controls */}
                <div className="flex items-center justify-between text-white gap-4">
                    <div className="flex items-center gap-2">
                        {previousItem && (
                            <Button
                                variant={'ghost'}
                                size={'icon-lg'}
                                className="cursor-pointer"
                                title={t('previousItem')}
                                asChild
                            >
                                <Link to={buildPlayerUrl(previousItem.Id!, backUrl ?? undefined)}>
                                    <SkipBack size={24} />
                                </Link>
                            </Button>
                        )}
                        <Button
                            variant={'ghost'}
                            size={'icon-lg'}
                            onClick={togglePlay}
                            className="cursor-pointer"
                        >
                            {isPlaying ? <Pause size={24} /> : <Play size={24} />}
                        </Button>
                        {nextItem && (
                            <Button
                                variant={'ghost'}
                                size={'icon-lg'}
                                className="cursor-pointer"
                                title={t('nextItem')}
                                asChild
                            >
                                <Link to={buildPlayerUrl(nextItem.Id!, backUrl ?? undefined)}>
                                    <SkipForward size={24} />
                                </Link>
                            </Button>
                        )}
                        <div className="text-sm ml-2 font-mono flex items-center gap-1.5">
                            {isLiveTvStream ? (
                                <>
                                    <span>{formatPlayTime(displayCurrentTime)}</span>
                                    <span className="text-muted-foreground">/</span>
                                    <span className="text-red-500 font-bold tracking-wider text-xs px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20">LIVE</span>
                                </>
                            ) : (
                                <span>{formatPlayTime(clampedCurrentTime)} / {formatPlayTime(displayDuration)}</span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            variant={'ghost'}
                            size={'icon-lg'}
                            onClick={() => setShowStats(!showStats)}
                            className="cursor-pointer"
                            title="Toggle Stats"
                        >
                            <Info />
                        </Button>
                        {seasonEpisodes && seasonEpisodes.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant={'ghost'}
                                        size={'icon-lg'}
                                        className="cursor-pointer"
                                        title="Episodes"
                                    >
                                        <Tv />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent container={container} align="start" className="max-h-[80vh] overflow-y-auto w-80 sm:w-96 p-2 space-y-2 bg-black/90 backdrop-blur-xl border border-white/10 shadow-2xl">
                                    <DropdownMenuLabel className="text-sm font-bold flex items-center justify-between px-2">
                                        <span>Season Episodes</span>
                                        <Badge variant="outline" className="font-mono text-[10px]">
                                            {seasonEpisodes.length} Episodes
                                        </Badge>
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator className="bg-white/10" />
                                    <div className="space-y-1.5 max-h-[70vh] overflow-y-auto pr-1">
                                        {seasonEpisodes.map((ep) => {
                                            const isCurrent = ep.Id === item.Id;
                                            return (
                                                <DropdownMenuItem
                                                    key={ep.Id}
                                                    onClick={() => {
                                                        if (isCurrent || !ep.Id) return;
                                                        player?.pause();
                                                        markItemAsCompleted(item.Id);
                                                        navigate(buildPlayerUrl(ep.Id, backUrl ?? undefined));
                                                    }}
                                                    className={`cursor-pointer p-2 rounded-lg flex gap-3 transition-all border ${
                                                        isCurrent
                                                            ? 'bg-brand/20 border-brand/50 text-white font-semibold'
                                                            : 'bg-white/5 border-transparent hover:bg-white/15 text-gray-200'
                                                    }`}
                                                >
                                                    {/* Episode Thumbnail */}
                                                    <div className="w-24 h-14 shrink-0 rounded-md overflow-hidden bg-black/60 relative">
                                                        <img
                                                            src={getPrimaryImageUrl(ep.Id!, { width: 180, height: 100 })}
                                                            alt={ep.Name || ''}
                                                            className="w-full h-full object-cover"
                                                            onError={(e) => {
                                                                (e.target as HTMLElement).style.display = 'none';
                                                            }}
                                                        />
                                                        {isCurrent && (
                                                            <div className="absolute inset-0 bg-brand/40 flex items-center justify-center">
                                                                <Play className="w-4 h-4 fill-current text-white" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Episode Info */}
                                                    <div className="flex-1 min-w-0 space-y-0.5">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-bold text-xs truncate">
                                                                E{ep.IndexNumber} • {ep.Name}
                                                            </span>
                                                            {ep.RunTimeTicks && (
                                                                <span className="text-[10px] font-mono text-gray-400 shrink-0 ml-1">
                                                                    {ticksToReadableTime(ep.RunTimeTicks)}
                                                                </span>
                                                            )}
                                                        </div>
                                                        {ep.Overview && (
                                                            <p className="text-[11px] text-gray-400 line-clamp-2 leading-tight font-normal">
                                                                {ep.Overview}
                                                            </p>
                                                        )}
                                                    </div>
                                                </DropdownMenuItem>
                                            );
                                        })}
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        {item.Chapters && item.Chapters.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant={'ghost'}
                                        size={'icon-lg'}
                                        className="cursor-pointer"
                                        title="Chapters"
                                    >
                                        <ListVideo />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent container={container} className="max-h-72 overflow-y-auto w-64">
                                    <DropdownMenuLabel>Chapters</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    {item.Chapters.map((chapter, index) => {
                                        const startSec = ticksToSeconds(chapter.StartPositionTicks || 0);
                                        const isCurrent =
                                            displayCurrentTime >= startSec &&
                                            (index === item.Chapters!.length - 1 ||
                                                displayCurrentTime < ticksToSeconds(item.Chapters![index + 1].StartPositionTicks || 0));
                                        return (
                                            <DropdownMenuItem
                                                key={index}
                                                onClick={() => player?.currentTime(startSec - timeOffset)}
                                                className={`cursor-pointer flex items-center justify-between text-xs py-2 ${
                                                    isCurrent ? 'bg-white/15 font-semibold text-brand' : ''
                                                }`}
                                            >
                                                <span className="truncate mr-2">{chapter.Name || `Chapter ${index + 1}`}</span>
                                                <span className="font-mono text-muted-foreground shrink-0">{formatPlayTime(startSec)}</span>
                                            </DropdownMenuItem>
                                        );
                                    })}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        {subtitleStreams.length > 0 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant={'ghost'}
                                        size={'icon-lg'}
                                        className="cursor-pointer"
                                    >
                                        <Subtitles />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent container={container} className="w-56">
                                    <DropdownMenuLabel>{t('subtitles')}</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuRadioGroup
                                        value={subtitleTrackIndex?.toString() || 'off'}
                                        onValueChange={handleSubtitleTrackChange}
                                    >
                                        <DropdownMenuRadioItem value="off">
                                            {t('off')}
                                        </DropdownMenuRadioItem>
                                        {subtitleStreams.map((stream, index) => (
                                            <DropdownMenuRadioItem
                                                key={index}
                                                value={index.toString()}
                                            >
                                                {stream.DisplayTitle ||
                                                    stream.Language ||
                                                    'Unknown'}
                                            </DropdownMenuRadioItem>
                                        ))}
                                    </DropdownMenuRadioGroup>

                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel>Subtitle Size</DropdownMenuLabel>
                                    <div className="flex items-center justify-between px-3 py-1 text-xs">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 w-7 p-0 cursor-pointer bg-white/5 border-white/10 hover:bg-white/10 text-white"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setSubtitleSize((prev) => Math.max(50, prev - 10));
                                            }}
                                        >
                                            -
                                        </Button>
                                        <span className="font-mono text-white">{subtitleSize}%</span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 w-7 p-0 cursor-pointer bg-white/5 border-white/10 hover:bg-white/10 text-white"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setSubtitleSize((prev) => Math.min(150, prev + 10));
                                            }}
                                        >
                                            +
                                        </Button>
                                    </div>

                                    <DropdownMenuSeparator />
                                    <DropdownMenuLabel>Subtitle Delay</DropdownMenuLabel>
                                    <div className="flex items-center justify-between px-3 py-1 text-xs">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 w-7 p-0 cursor-pointer bg-white/5 border-white/10 hover:bg-white/10 text-white"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setSubtitleDelay((prev) => Math.max(-10, parseFloat((prev - 0.5).toFixed(1))));
                                            }}
                                        >
                                            -
                                        </Button>
                                        <span className="font-mono text-white">
                                            {subtitleDelay > 0 ? '+' : ''}{subtitleDelay.toFixed(1)}s
                                        </span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 w-7 p-0 cursor-pointer bg-white/5 border-white/10 hover:bg-white/10 text-white"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                setSubtitleDelay((prev) => Math.min(10, parseFloat((prev + 0.5).toFixed(1))));
                                            }}
                                        >
                                            +
                                        </Button>
                                    </div>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        {audioStreams.length > 1 && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant={'ghost'}
                                        size={'icon-lg'}
                                        className="cursor-pointer"
                                    >
                                        <AudioLines />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent container={container}>
                                    <DropdownMenuLabel>{t('audioTracks')}</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuRadioGroup
                                        value={audioTrackIndex?.toString() || ''}
                                        onValueChange={handleAudioTrackChange}
                                    >
                                        {audioStreams.map((stream, index) => (
                                            <DropdownMenuRadioItem
                                                key={index}
                                                value={stream.Index!.toString()}
                                            >
                                                {stream.Language || 'Unknown Language'} -{' '}
                                                {stream.Codec}
                                            </DropdownMenuRadioItem>
                                        ))}
                                    </DropdownMenuRadioGroup>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                        <Button
                            variant={'ghost'}
                            size={'icon-lg'}
                            onClick={toggleMute}
                            className="cursor-pointer"
                        >
                            {isMuted ? <VolumeX /> : <Volume2 />}
                        </Button>
                        <Slider
                            min={0}
                            max={1}
                            step={0.1}
                            value={isMuted ? [0] : [volume]}
                            onValueChange={handleVolumeChange}
                            className="w-25 cursor-pointer mr-2 [&>[data-slot=slider-range]]:bg-white [&>[data-slot=slider-thumb]]:border-white [&>[data-slot=slider-thumb]]:bg-white"
                        />
                        {document.pictureInPictureEnabled && (
                            <Button
                                variant={'ghost'}
                                size={'icon-lg'}
                                onClick={togglePiP}
                                className="cursor-pointer"
                                title="Picture in Picture"
                            >
                                <PictureInPicture2
                                    size={20}
                                    className={isPiP ? 'text-white' : ''}
                                />
                            </Button>
                        )}
                        <Button
                            variant={'ghost'}
                            size={'icon-lg'}
                            onClick={toggleFullscreen}
                            className="cursor-pointer"
                        >
                            {isFullscreen ? <Minimize /> : <Maximize />}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Pause Screen Overlay */}
            {showPauseOverlay && (
                <div
                    className="absolute inset-0 bg-black/65 backdrop-blur-md z-45 flex flex-col justify-between p-8 sm:p-16 animate-in fade-in duration-300 cursor-pointer"
                    onClick={togglePlay}
                >
                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col lg:flex-row items-center justify-between gap-12 w-full max-w-7xl mx-auto my-auto select-none">
                        {/* Left Info Panel */}
                        <div className="flex-1 flex flex-col lg:justify-between lg:self-stretch text-left max-w-2xl py-2" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-col gap-4 lg:my-auto">
                                {/* Movie / TV Series Logo or Name */}
                                {(() => {
                                    const logoTargetId = (item.Type === 'Episode' ? item.SeriesId : item.Id) || item.Id;
                                    const titleText = item.Type === 'Episode' ? (item.SeriesName || item.Name) : item.Name;
                                    return (
                                        <>
                                            {failedLogo || !logoTargetId ? (
                                                <h1 className="text-4xl sm:text-6xl font-bold tracking-tight text-white">{titleText}</h1>
                                            ) : (
                                                <img
                                                    src={getLogoUrl(logoTargetId)}
                                                    alt={titleText || ''}
                                                    className="h-20 sm:h-32 object-contain object-left max-w-[85%]"
                                                    onError={() => setFailedLogo(true)}
                                                />
                                            )}
                                            {item.Type === 'Episode' && (
                                                <h2 className="text-lg sm:text-2xl font-bold text-brand tracking-wide -mt-1">
                                                    S{item.ParentIndexNumber}E{item.IndexNumber} • {item.Name}
                                                </h2>
                                            )}
                                        </>
                                    );
                                })()}

                                {/* Info Badges Row */}
                                <div className="flex flex-wrap items-center gap-4 text-sm sm:text-base font-medium text-white/80">
                                    {item.PremiereDate && (
                                        <span>{new Date(item.PremiereDate).getFullYear()}</span>
                                    )}
                                    {item.OfficialRating && (
                                        <Badge variant="outline" className="border-white/20 text-white/90 font-medium rounded-xs px-2 py-0.5 bg-transparent">
                                            {getCleanRating(item.OfficialRating)}
                                        </Badge>
                                    )}
                                    {item.RunTimeTicks && (
                                        <span>{ticksToReadableTime(item.RunTimeTicks)}</span>
                                    )}
                                </div>

                                {/* Overview / Synopsis */}
                                <p className="text-base sm:text-lg text-white/80 leading-relaxed font-normal line-clamp-4 max-w-2xl">
                                    {item.Overview}
                                </p>
                            </div>

                            {/* Playback Progress Section */}
                            <div className="w-full space-y-3 mt-8 lg:mt-auto pt-4 pb-16 lg:pb-24">
                                {/* Visual progress bar */}
                                <div className="w-full h-[3px] rounded-full bg-white/20 relative">
                                    <div
                                        className="h-full bg-white rounded-full transition-all duration-300"
                                        style={{ width: `${progressPercentage}%` }}
                                    />
                                </div>
                                {/* Progress text details */}
                                <div className="flex flex-wrap items-center gap-1.5 text-xs sm:text-sm text-white/60 font-medium tracking-wide">
                                    {isLiveTvStream ? (
                                        <>
                                            <span>•</span>
                                            <span>{formatPlayTime(displayCurrentTime)}</span>
                                            <span>•</span>
                                            <span className="text-red-400 font-bold tracking-wider">LIVE BROADCAST</span>
                                            <span>•</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>•</span>
                                            <span>{formatPlayTime(clampedCurrentTime)} / {formatPlayTime(displayDuration)}</span>
                                            <span>•</span>
                                            <span>{progressPercentage.toFixed(0)}% watched</span>
                                            <span>•</span>
                                            <span>Ends at {(() => {
                                                const remainingTicks = (displayDuration - clampedCurrentTime) * 10000000;
                                                return getEndsAt(remainingTicks).toLocaleTimeString([], {
                                                    hour: '2-digit',
                                                    minute: '2-digit',
                                                });
                                            })()}</span>
                                            <span>•</span>
                                        </>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Right Disc Art Panel */}
                        {item.Id && (
                            <div className="shrink-0 flex items-center justify-center z-20" onClick={(e) => e.stopPropagation()}>
                                <div className="relative w-64 h-64 sm:w-80 sm:h-80 md:w-96 md:h-96 lg:w-[26rem] lg:h-[26rem] rounded-full border-[6px] border-white/10 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.95)] overflow-hidden bg-zinc-950 flex items-center justify-center">
                                    
                                    {/* Spinning Disc content wrapper */}
                                    <div className="absolute inset-0 w-full h-full rounded-full overflow-hidden animate-cd-spin">
                                        {/* Disc art: the actual disc image or fallback */}
                                        {!discImageFailed ? (
                                            <img
                                                src={getItemImageUrl((item.Type === 'Episode' ? item.SeriesId : item.Id) || item.Id, 'Disc', 0)}
                                                alt=""
                                                className="w-full h-full object-contain z-10"
                                                draggable={false}
                                                onError={() => setDiscImageFailed(true)}
                                            />
                                        ) : (
                                            <>
                                                {/* Fallback generic CD design */}
                                                <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-950 z-10" />
                                                
                                                {/* Top Crest / Studio Logo printed on fallback disc */}
                                                <div className="absolute top-8 left-1/2 -translate-x-1/2 flex flex-col items-center z-25 opacity-70 select-none pointer-events-none">
                                                    <div className="w-5 h-5 border border-yellow-500/40 rounded-full flex items-center justify-center bg-yellow-500/5">
                                                        <span className="text-[5px] text-yellow-400 font-bold uppercase tracking-tighter">BD</span>
                                                    </div>
                                                    <span className="text-[4px] text-yellow-400/80 font-bold tracking-widest uppercase mt-0.5">PELAGICA PICTURES</span>
                                                </div>

                                                {/* Movie / Series Logo printed on fallback disc */}
                                                <div className="absolute right-6 top-1/2 -translate-y-1/2 w-32 sm:w-40 lg:w-44 z-25 pointer-events-none select-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)] rotate-[6deg] flex justify-center">
                                                    {!failedLogo ? (
                                                        <img
                                                            src={getLogoUrl((item.Type === 'Episode' ? item.SeriesId : item.Id) || item.Id)}
                                                            alt=""
                                                            className="w-full object-contain max-h-14 opacity-90 filter brightness-110"
                                                            onError={() => setFailedLogo(true)}
                                                        />
                                                    ) : (
                                                        <span className="text-white text-xs sm:text-sm font-bold tracking-tight uppercase text-center line-clamp-2">
                                                            {item.Type === 'Episode' ? item.SeriesName || item.Name : item.Name}
                                                        </span>
                                                    )}
                                                </div>

                                                {/* DTS and Blu-ray Logos printed on fallback disc */}
                                                <div className="absolute right-10 top-2/3 -translate-y-1/2 flex flex-col items-center gap-0.5 bg-brand/35 backdrop-blur-xs py-1.5 px-2 rounded-md border border-brand/20 max-w-[80px] text-center rotate-[6deg] z-25 select-none pointer-events-none shadow-[0_4px_6px_rgba(0,0,0,0.4)]">
                                                    <span className="text-[9px] font-extrabold tracking-widest text-white uppercase leading-none">dts-HD</span>
                                                    <span className="text-[6px] text-white/95 font-bold uppercase tracking-wider leading-none">Master Audio</span>
                                                    <div className="w-10 h-px bg-white/20 my-0.5" />
                                                    <span className="text-[8px] font-extrabold text-white uppercase tracking-wider leading-none">Blu-ray Disc</span>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    
                                    {/* Transparent outer plastic edge rim */}
                                    <div className="absolute inset-0 rounded-full border-[6px] border-white/5 pointer-events-none z-30" />
                                    <div className="absolute inset-[6px] rounded-full border border-black/40 pointer-events-none z-30" />
                                    
                                    {/* Outer colored ring matching the brand */}
                                    <div className="absolute inset-0 rounded-full border-[10px] border-brand/20 pointer-events-none z-20" />
                                    <div className="absolute inset-[10px] rounded-full border border-white/10 pointer-events-none z-20" />

                                    {/* Spindle hole area */}
                                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-transparent border-[6px] border-black/40 shadow-lg flex items-center justify-center z-30">
                                        {/* Clear frosted plastic inner ring */}
                                        <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full border border-white/20 bg-white/5 flex items-center justify-center backdrop-blur-[1px]">
                                            {/* Inner silver/grey bevel */}
                                            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-zinc-600 bg-zinc-900 flex items-center justify-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.8)]">
                                                {/* Actual black hole */}
                                                <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-black shadow-[inset_0_4px_10px_rgba(0,0,0,0.9)]" />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Metallic / Rainbow reflection layers */}
                                    <div
                                        className="absolute inset-0 pointer-events-none mix-blend-screen opacity-25 z-30"
                                        style={{
                                            background: 'conic-gradient(from 0deg at 50% 50%, transparent 0%, rgba(255,255,255,0.3) 8%, transparent 15%, transparent 40%, rgba(255,255,255,0.3) 48%, transparent 55%, transparent 90%, rgba(255,255,255,0.3) 95%, transparent 100%)',
                                        }}
                                    />
                                    <div
                                        className="absolute inset-0 pointer-events-none mix-blend-color-dodge opacity-20 z-30"
                                        style={{
                                            background: 'conic-gradient(from 180deg at 50% 50%, transparent 0%, rgba(120,119,198,0.2) 12%, rgba(222,0,75,0.2) 24%, transparent 35%, transparent 70%, rgba(0,222,150,0.2) 82%, transparent 95%, transparent 100%)',
                                        }}
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none mix-blend-overlay z-30" />
                                    <div className="absolute inset-0 bg-gradient-to-bl from-transparent via-white/5 to-transparent pointer-events-none mix-blend-overlay z-30" />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
};

export default PlayerControls;
