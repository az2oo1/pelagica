import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { LyricLine } from '@jellyfin/sdk/lib/generated-client/models';
import { lyricsAutoScrollGraceMs } from '../constants';
import { useLyricsEdgePadding } from './useLyricsEdgePadding';
import { applyOffset, getActiveLineIndex } from '../utils/lyrics';

interface UseSyncedLyricsOptions {
    lines: LyricLine[];
    currentTime: number;
    offset?: number | null;
    enabled?: boolean;
}

export function useSyncedLyrics({
    lines,
    currentTime,
    offset,
    enabled = true,
}: UseSyncedLyricsOptions) {
    const [autoScrollPaused, setAutoScrollPaused] = useState(false);
    const lineRefs = useRef<(HTMLElement | null)[]>([]);
    const graceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const { containerRef, edgePadding } = useLyricsEdgePadding(enabled);

    const activeIndex = useMemo(() => {
        if (!enabled || !lines.length) {
            return -1;
        }

        const adjustedTime = applyOffset(currentTime, offset);
        return getActiveLineIndex(adjustedTime, lines);
    }, [currentTime, enabled, lines, offset]);

    const clearGraceTimer = useCallback(() => {
        if (graceTimerRef.current) {
            clearTimeout(graceTimerRef.current);
            graceTimerRef.current = null;
        }
    }, []);

    const scrollActiveLineIntoView = useCallback(
        (behavior: ScrollBehavior = 'smooth') => {
            const container = containerRef.current;
            const activeLine = lineRefs.current[activeIndex];
            if (!container || !activeLine || activeIndex < 0) {
                return;
            }

            const prevLine = lineRefs.current[activeIndex - 1];
            if (prevLine) {
                const prevLineTop =
                    prevLine.getBoundingClientRect().top -
                    container.getBoundingClientRect().top +
                    container.scrollTop;
                
                container.scrollTo({
                    top: Math.max(0, prevLineTop),
                    behavior,
                });
            } else {
                const activeLineTop =
                    activeLine.getBoundingClientRect().top -
                    container.getBoundingClientRect().top +
                    container.scrollTop;
                
                // Position the active line with some space above it so it looks like the second line (approx 70px)
                container.scrollTo({
                    top: Math.max(0, activeLineTop - 70),
                    behavior,
                });
            }
        },
        [activeIndex, containerRef]
    );

    // Auto-scroll effect: scrolls to active line whenever activeIndex changes
    useEffect(() => {
        if (!enabled || autoScrollPaused || activeIndex < 0) {
            return;
        }

        scrollActiveLineIntoView('smooth');
    }, [activeIndex, enabled, autoScrollPaused, scrollActiveLineIntoView]);

    const pauseAutoScroll = useCallback(() => {
        setAutoScrollPaused(true);
        clearGraceTimer();

        graceTimerRef.current = setTimeout(() => {
            setAutoScrollPaused(false);
            // Immediately catch up to the active line when resuming
            scrollActiveLineIntoView('smooth');
        }, lyricsAutoScrollGraceMs);
    }, [clearGraceTimer, scrollActiveLineIntoView]);

    const onUserScroll = useCallback(() => {
        // Direct user scroll interaction: pause auto-scrolling
        pauseAutoScroll();
    }, [pauseAutoScroll]);

    const enableAutoScroll = useCallback(() => {
        clearGraceTimer();
        setAutoScrollPaused(false);
        scrollActiveLineIntoView('smooth');
    }, [clearGraceTimer, scrollActiveLineIntoView]);

    const setLineRef = useCallback((index: number, element: HTMLElement | null) => {
        lineRefs.current[index] = element;
    }, []);

    // Clean up timers on unmount
    useEffect(() => {
        return () => clearGraceTimer();
    }, [clearGraceTimer]);

    return {
        activeIndex,
        containerRef,
        edgePadding,
        enableAutoScroll,
        onUserScroll,
        scrollActiveLineIntoView,
        setLineRef,
    };
}
