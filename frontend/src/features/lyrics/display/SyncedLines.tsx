import type { LyricLine } from '@jellyfin/sdk/lib/generated-client/models';
import { cn } from '@/lib/utils';
import { useSyncedLyrics } from '../hooks/useSyncedLyrics';
import LyricsScrollArea from './LyricsScrollArea';
import { syncedLineClassName } from './lyricsLineStyles';
import { useState } from 'react';

interface SyncedLinesProps {
    lines: LyricLine[];
    currentTime: number;
    offset?: number | null;
    onLineClick: (startTicks: number) => void;
    enabled?: boolean;
    isPopover?: boolean;
}

const SyncedLines = ({
    lines,
    currentTime,
    offset,
    onLineClick,
    enabled = true,
    isPopover = false,
}: SyncedLinesProps) => {
    const [isInteracting, setIsInteracting] = useState(false);
    const {
        activeIndex,
        containerRef,
        edgePadding,
        enableAutoScroll,
        onUserScroll,
        scrollActiveLineIntoView,
        setLineRef,
    } = useSyncedLyrics({
        lines,
        currentTime,
        offset,
        enabled,
    });

    return (
        <LyricsScrollArea
            containerRef={containerRef}
            edgePadding={edgePadding}
            onUserScroll={onUserScroll}
            onInteractionChange={setIsInteracting}
        >
            {lines.map((line, index) => {
                const start = line.Start ?? 0;
                const relativeIndex = index - activeIndex;

                const lineStyle: React.CSSProperties = {
                    transition: 'all 0.4s cubic-bezier(0.25, 1, 0.5, 1)',
                };
                let extraClass = '';

                if (isPopover) {
                    // Popover mode styling: small text, no blur, all lines visible and clickable
                    lineStyle.filter = 'none';
                    lineStyle.visibility = 'visible';
                    lineStyle.pointerEvents = 'auto';

                    if (relativeIndex === 0) {
                        lineStyle.opacity = 1.0;
                        extraClass = 'text-white text-base font-bold scale-[1.01]';
                    } else {
                        lineStyle.opacity = 0.5;
                        extraClass = 'text-white/50 text-xs sm:text-sm font-semibold';
                    }
                } else if (isInteracting) {
                    // Interaction mode: no blur, all lines visible (but large text)
                    lineStyle.filter = 'none';
                    lineStyle.visibility = 'visible';
                    lineStyle.pointerEvents = 'auto';

                    if (relativeIndex === 0) {
                        lineStyle.opacity = 1.0;
                        extraClass = 'text-white text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold scale-[1.02]';
                    } else {
                        lineStyle.opacity = 0.6;
                        extraClass = 'text-white/60 text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold';
                    }
                } else {
                    // Normal focus/blur mode
                    if (relativeIndex === 0) {
                        // 2nd visible line: active/reading
                        lineStyle.opacity = 1.0;
                        lineStyle.filter = 'blur(0px)';
                        extraClass = 'text-white text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold scale-[1.02]';
                    } else if (relativeIndex === -1 || relativeIndex === 1) {
                        // 1st and 3rd visible lines: dimmed
                        lineStyle.opacity = 0.35;
                        lineStyle.filter = 'blur(0px)';
                        extraClass = 'text-white/35 text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold';
                    } else if (relativeIndex === 2) {
                        // 4th visible line: a bit blurred
                        lineStyle.opacity = 0.25;
                        lineStyle.filter = 'blur(1.5px)';
                        extraClass = 'text-white/25 text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold';
                    } else if (relativeIndex === 3) {
                        // 5th visible line: blurred
                        lineStyle.opacity = 0.15;
                        lineStyle.filter = 'blur(3.5px)';
                        extraClass = 'text-white/15 text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold';
                    } else if (relativeIndex === 4) {
                        // 6th visible line: so blurred I can't read it
                        lineStyle.opacity = 0.05;
                        lineStyle.filter = 'blur(6px)';
                        extraClass = 'text-white/5 text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold';
                    } else {
                        // 7th and beyond (relativeIndex >= 5) or lines before activeIndex - 1 (relativeIndex <= -2): hidden/removed
                        lineStyle.opacity = 0;
                        lineStyle.filter = 'blur(10px)';
                        lineStyle.pointerEvents = 'none';
                        lineStyle.visibility = 'hidden';
                        extraClass = 'text-transparent text-lg font-bold';
                    }
                }

                return (
                    <button
                        key={`${index}-${line.Text}`}
                        ref={(element) => setLineRef(index, element)}
                        type="button"
                        tabIndex={-1}
                        style={lineStyle}
                        className={cn(syncedLineClassName, extraClass, 'w-full whitespace-pre-wrap')}
                        onClick={() => {
                            enableAutoScroll();
                            onLineClick(start);
                            requestAnimationFrame(() => scrollActiveLineIntoView('smooth'));
                        }}
                    >
                        {line.Text}
                    </button>
                );
            })}
        </LyricsScrollArea>
    );
};

export default SyncedLines;
