import {
    ChevronDown,
    ChevronUp,
    Pause,
    Play,
    Repeat2,
    Shuffle,
    SkipBack,
    SkipForward,
    Volume2,
    VolumeX,
    XIcon,
} from 'lucide-react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { getPrimaryImageUrl } from '@/utils/jellyfinUrls';
import { useMusicPlayback } from '@/hooks/useMusicPlayback';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLyrics } from '@/features/lyrics/api/useLyrics';
import { processLyrics } from '@/features/lyrics/utils/lyrics';
import LyricsButton from '@/features/lyrics/LyricsButton';
import LyricsExpandedPanel from '@/features/lyrics/shell/LyricsExpandedPanel';
import LyricsInlinePanel from '@/features/lyrics/shell/LyricsInlinePanel';
import { cn } from '@/lib/utils';
import { lyricsPanelWidthClass } from '@/features/lyrics/constants';

const formatTime = (timeTicks: number) => {
    const timeSeconds = timeTicks / 10000000;
    const minutes = Math.floor(timeSeconds / 60);
    const seconds = Math.floor(timeSeconds % 60)
        .toString()
        .padStart(2, '0');
    return `${minutes}:${seconds}`;
};

const MusicPlayerBar = () => {
    const { t } = useTranslation('player');
    const {
        currentTrack,
        shuffle,
        toggleShuffle,
        repeat,
        setRepeat,
        isPlaying,
        play,
        togglePlayPause,
        skipNext,
        skipPrevious,
        currentTime,
        duration,
        seek,
        volume,
        setVolume,
        clearPlayback,
    } = useMusicPlayback();
    const isMobile = useIsMobile();
    const [isExpanded, setIsExpanded] = useState(false);
    const [lyricsOpenTrackId, setLyricsOpenTrackId] = useState<string | null>(null);
    const [inlineLyricsTrackId, setInlineLyricsTrackId] = useState<string | null>(null);

    const { data: lyricsData, isPending: isLyricsLoading } = useLyrics(currentTrack?.id);
    const processedLyrics = processLyrics(lyricsData);
    const hasLyrics = !!processedLyrics;
    const showLyricsButton = isLyricsLoading || hasLyrics;

    const isLyricsOpen = lyricsOpenTrackId === currentTrack?.id;
    const showLyricsInline = inlineLyricsTrackId === currentTrack?.id;

    const handleLineClick = useCallback(
        (startTicks: number) => {
            seek(startTicks);
            if (!isPlaying) {
                play();
            }
        },
        [isPlaying, play, seek]
    );
    const toggleDesktopLyrics = useCallback(() => {
        setLyricsOpenTrackId((prev) =>
            prev === currentTrack?.id ? null : (currentTrack?.id ?? null)
        );
    }, [currentTrack?.id]);

    const toggleMobileLyrics = useCallback(() => {
        setInlineLyricsTrackId((prev) =>
            prev === currentTrack?.id ? null : (currentTrack?.id ?? null)
        );
    }, [currentTrack?.id]);

    if (!currentTrack) return null;

    const currentTimeSeconds = currentTime / 10000000;
    const durationSeconds = duration / 10000000;

    const lyricsPanelProps =
        processedLyrics &&
        ({
            track: currentTrack,
            lyrics: processedLyrics,
            currentTime,
            onLineClick: handleLineClick,
        } as const);

    if (isMobile && !isExpanded) {
        return (
            <div className="p-4 sm:px-12 sticky bottom-0 z-100">
                <div
                    className="bg-sidebar/90 border-sidebar-border flex justify-between items-center h-full w-full rounded-lg border shadow-sm p-3 backdrop-blur-lg cursor-pointer"
                    onClick={() => setIsExpanded(true)}
                >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                        <img
                            src={getPrimaryImageUrl(currentTrack.albumId || currentTrack.id, {
                                width: 64,
                                height: 64,
                            })}
                            alt="Album cover"
                            className="rounded-md h-12 w-12 object-cover shrink-0"
                        />
                        <div className="grid flex-1 text-left leading-tight min-w-0">
                            <span className="truncate font-medium">{currentTrack.title}</span>
                            <span className="truncate text-sm font-normal text-muted-foreground">
                                {currentTrack.artist}
                            </span>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="hover:scale-110 active:scale-90 transition-transform duration-200"
                        onClick={(e) => {
                            e.stopPropagation();
                            togglePlayPause();
                        }}
                    >
                        {isPlaying ? <Pause /> : <Play />}
                    </Button>
                </div>
            </div>
        );
    }

    if (isExpanded) {
        return (
            <div className="fixed inset-0 z-200 bg-black flex flex-col animate-in slide-in-from-bottom duration-300 text-foreground overflow-hidden">
                {/* Blurred backdrop image */}
                <div 
                    className="absolute inset-0 bg-cover bg-center scale-110 opacity-35 blur-[80px] pointer-events-none -z-10 animate-fade-in duration-700"
                    style={{ backgroundImage: `url(${getPrimaryImageUrl(currentTrack.albumId || currentTrack.id, { width: 300, height: 300 })})` }}
                />
                <div className="absolute inset-0 bg-black/60 -z-10 pointer-events-none" />

                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-white/10 w-full px-6 md:px-16 lg:px-24 relative z-10">
                    <Button variant="ghost" size="icon" onClick={() => setIsExpanded(false)} className="hover:scale-110 active:scale-90 transition-transform text-white/80 hover:text-white hover:bg-white/10">
                        <ChevronDown className="h-6 w-6" />
                    </Button>
                    <span className="text-xs font-bold tracking-widest uppercase text-white/60">
                        {showLyricsInline ? t('lyrics') : t('nowPlaying')}
                    </span>
                    <Button variant="ghost" size="icon" onClick={clearPlayback} className="hover:scale-110 active:scale-90 transition-transform text-white/80 hover:text-white hover:bg-white/10">
                        <XIcon className="h-6 w-6" />
                    </Button>
                </div>

                {/* Content Container */}
                <div className="flex-1 overflow-y-auto w-full p-6 md:p-12 px-6 md:px-16 lg:px-24 flex flex-col justify-center relative z-10 transition-all duration-300">
                    <div className={cn(
                        "grid items-center w-full transition-all duration-300",
                        showLyricsInline && lyricsPanelProps
                            ? "grid-cols-1 md:grid-cols-[320px_1fr] gap-12 md:gap-24 lg:gap-40"
                            : "grid-cols-1 max-w-xl mx-auto gap-12"
                    )}>
                        
                        {/* Left column: Album details and cover */}
                        <div className={cn(
                            "flex flex-col justify-center gap-6 w-full max-w-sm mx-auto transition-all duration-300",
                            showLyricsInline && lyricsPanelProps
                                ? "items-start text-left md:mx-0"
                                : "items-center text-center"
                        )}>
                            <div className="relative group shadow-2xl rounded-lg overflow-hidden w-full aspect-square border border-white/10">
                                <img
                                    src={getPrimaryImageUrl(currentTrack.albumId || currentTrack.id, {
                                        width: 500,
                                        height: 500,
                                    })}
                                    alt="Album cover"
                                    className="w-full h-full object-cover rounded-lg transition-transform duration-500 group-hover:scale-105"
                                />
                            </div>

                            <div className="w-full flex justify-between items-center gap-4">
                                <div className={cn(
                                    "min-w-0 flex-1",
                                    showLyricsInline && lyricsPanelProps ? "text-left" : "text-center"
                                )}>
                                    <h2 className="text-2xl sm:text-3xl font-extrabold truncate text-white tracking-tight leading-tight">
                                        {currentTrack.title}
                                    </h2>
                                    <p className="text-base sm:text-lg text-white/60 truncate mt-1 font-medium">
                                        {currentTrack.artist}
                                    </p>
                                </div>
                            </div>

                            {/* Timeline Slider */}
                            <div className="w-full space-y-2">
                                <Slider
                                    className="w-full cursor-pointer [&_[data-slot=slider-range]]:bg-white [&_[data-slot=slider-track]]:bg-white/20 [&_[data-slot=slider-thumb]]:bg-white"
                                    max={durationSeconds}
                                    step={0.1}
                                    value={[currentTimeSeconds]}
                                    onValueChange={(value) => seek(Math.floor(value[0] * 10000000))}
                                />
                                <div className="flex justify-between text-xs font-semibold text-white/50 tracking-wide">
                                    <span>{formatTime(currentTime)}</span>
                                    <span>{formatTime(duration)}</span>
                                </div>
                            </div>

                            {/* Controls */}
                            <div className="flex items-center justify-center gap-5 w-full mt-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn("hover:scale-110 active:scale-90 transition-transform duration-200 hover:bg-white/10", shuffle ? 'text-white font-semibold' : 'text-white/40')}
                                    onClick={toggleShuffle}
                                >
                                    <Shuffle className="h-5 w-5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="hover:scale-110 active:scale-90 transition-transform duration-200 text-white/80 hover:text-white hover:bg-white/10" onClick={skipPrevious}>
                                    <SkipBack className="h-6 w-6" />
                                </Button>
                                <Button 
                                    variant="default" 
                                    size="icon-lg" 
                                    className="h-14 w-14 rounded-full bg-white text-black hover:scale-105 active:scale-95 transition-all duration-200 hover:bg-white/95 shadow-lg flex items-center justify-center shrink-0" 
                                    onClick={togglePlayPause}
                                >
                                    {isPlaying ? (
                                        <Pause className="h-6 w-6 fill-current" />
                                    ) : (
                                        <Play className="h-6 w-6 fill-current ml-0.5" />
                                    )}
                                </Button>
                                <Button variant="ghost" size="icon" className="hover:scale-110 active:scale-90 transition-transform duration-200 text-white/80 hover:text-white hover:bg-white/10" onClick={skipNext}>
                                    <SkipForward className="h-6 w-6" />
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn("hover:scale-110 active:scale-90 transition-transform duration-200 hover:bg-white/10", repeat ? 'text-white font-semibold' : 'text-white/40')}
                                    onClick={() => setRepeat(!repeat)}
                                >
                                    <Repeat2 className="h-5 w-5" />
                                </Button>
                                {showLyricsButton && (
                                    <LyricsButton
                                        active={showLyricsInline}
                                        loading={isLyricsLoading}
                                        onClick={toggleMobileLyrics}
                                        className={cn(
                                            "hover:scale-110 active:scale-90 transition-transform duration-200 hover:bg-white/10",
                                            showLyricsInline ? 'text-white bg-white/15' : 'text-white/40'
                                        )}
                                    />
                                )}
                            </div>

                            {/* Volume controls */}
                            <div className="flex items-center gap-3 w-full mt-1">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="hover:scale-110 active:scale-90 transition-transform text-white/80 hover:text-white hover:bg-white/10"
                                    onClick={() => {
                                        if (volume === 0) setVolume(0.5);
                                        else setVolume(0);
                                    }}
                                >
                                    {volume === 0 ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                                </Button>
                                <Slider
                                    className="flex-1 cursor-pointer [&_[data-slot=slider-range]]:bg-white [&_[data-slot=slider-track]]:bg-white/20 [&_[data-slot=slider-thumb]]:bg-white"
                                    max={1}
                                    step={0.01}
                                    value={[volume]}
                                    onValueChange={(value) => setVolume(value[0])}
                                />
                            </div>
                        </div>

                        {/* Right column: Integrated Apple Music-style lyrics (Not in a box) */}
                        {showLyricsInline && lyricsPanelProps && (
                            <div 
                                className="w-full h-[55vh] min-h-[300px] md:h-[65vh] overflow-hidden flex flex-col animate-in fade-in slide-in-from-right-4 duration-300 [&_div]:!items-start [&_div.pointer-events-none]:!hidden [&_div.px-4]:!pt-6 [&_div.px-4]:!pb-48 [&_button]:!text-left [&_button]:!max-w-none [&_button]:!px-0 [&_button]:!py-3.5 [&_button]:!bg-transparent [&_button]:!border-none [&_button]:!shadow-none [&_button]:!transform-none"
                                style={{
                                    maskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,1) 12%, rgba(0,0,0,1) 85%, transparent 100%)',
                                    WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, rgba(0,0,0,1) 12%, rgba(0,0,0,1) 85%, transparent 100%)'
                                }}
                            >
                                <LyricsInlinePanel {...lyricsPanelProps} />
                            </div>
                        )}

                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="sticky bottom-0 z-100 w-full p-4 sm:px-12">
            <div className="relative">
                <div className="relative z-10 flex w-full items-center justify-between rounded-lg border border-sidebar-border bg-sidebar/90 p-3 shadow-sm backdrop-blur-lg">
                    <div className="flex flex-1 items-center gap-3">
                        <button
                            onClick={() => setIsExpanded(true)}
                            className="group relative cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-md overflow-hidden shrink-0 shadow-sm border border-sidebar-border"
                            aria-label="Expand player"
                        >
                            <img
                                src={getPrimaryImageUrl(currentTrack.albumId || currentTrack.id, {
                                    width: 64,
                                    height: 64,
                                })}
                                alt="Album cover"
                                className="rounded-md h-16 w-16 object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-300">
                                <ChevronUp className="h-6 w-6 text-white" />
                            </div>
                        </button>
                        <div className="grid flex-1 text-left leading-tight min-w-0">
                            <span className="truncate font-medium">{currentTrack.title}</span>
                            <span className="truncate text-sm font-normal text-muted-foreground">
                                {currentTrack.artist}
                            </span>
                        </div>
                    </div>
                    <div className="flex flex-1 flex-col items-center gap-1">
                        <div className="flex items-center gap-3">
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn("cursor-pointer hover:scale-110 active:scale-90 transition-transform duration-200", shuffle ? 'text-brand' : 'text-muted-foreground')}
                                onClick={toggleShuffle}
                            >
                                <Shuffle />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="cursor-pointer hover:scale-110 active:scale-90 transition-transform duration-200"
                                onClick={skipPrevious}
                            >
                                <SkipBack />
                            </Button>
                            <Button variant="default" size="icon-lg" className="hover:scale-105 active:scale-95 transition-transform duration-200 ease-out cursor-pointer" onClick={togglePlayPause}>
                                {isPlaying ? <Pause /> : <Play />}
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="cursor-pointer hover:scale-110 active:scale-90 transition-transform duration-200"
                                onClick={skipNext}
                            >
                                <SkipForward />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className={cn("cursor-pointer hover:scale-110 active:scale-90 transition-transform duration-200", repeat ? 'text-brand' : 'text-muted-foreground')}
                                onClick={() => setRepeat(!repeat)}
                            >
                                <Repeat2 />
                            </Button>
                        </div>
                        <div className="flex w-full items-center gap-2 text-sm text-muted-foreground">
                            <span>{formatTime(currentTime)}</span>
                            <Slider
                                className="flex-1"
                                max={durationSeconds}
                                step={0.1}
                                value={[currentTimeSeconds]}
                                onValueChange={(value) => seek(Math.floor(value[0] * 10000000))}
                            />
                            <span>{formatTime(duration)}</span>
                        </div>
                    </div>
                    <div className="flex flex-1 items-center justify-end gap-2">
                        {showLyricsButton && (
                            <LyricsButton
                                active={isLyricsOpen}
                                loading={isLyricsLoading}
                                onClick={toggleDesktopLyrics}
                            />
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            className="cursor-pointer hover:scale-110 active:scale-90 transition-transform duration-200"
                            onClick={() => {
                                if (volume === 0) setVolume(0.5);
                                else setVolume(0);
                            }}
                        >
                            {volume === 0 ? <VolumeX /> : <Volume2 />}
                        </Button>
                        <Slider
                            className="w-32"
                            max={1}
                            step={0.01}
                            value={[volume]}
                            onValueChange={(value) => setVolume(value[0])}
                        />
                        <Button
                            variant="outline"
                            size="icon"
                            className="cursor-pointer ml-2 hover:scale-105 active:scale-95 transition-transform duration-200 ease-out"
                            onClick={clearPlayback}
                        >
                            <XIcon />
                        </Button>
                    </div>
                </div>
                {lyricsPanelProps && (
                    <div
                        className={cn(
                            'absolute bottom-full left-1/2 -translate-x-1/2 overflow-hidden',
                            'transition-[max-height] duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]',
                            lyricsPanelWidthClass,
                            isLyricsOpen ? 'max-h-[calc(70vh)]' : 'max-h-0'
                        )}
                    >
                        <div className="overflow-hidden rounded-t-lg border border-sidebar-border bg-sidebar shadow-sm">
                            <LyricsExpandedPanel
                                {...lyricsPanelProps}
                                enabled={isLyricsOpen}
                                isPopover={true}
                                onClose={() => {
                                    setLyricsOpenTrackId(null);
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MusicPlayerBar;
