import { useState, useEffect, useRef, type PropsWithChildren, type RefObject } from 'react';
import { cn } from '@/lib/utils';

interface LyricsScrollAreaProps extends PropsWithChildren {
    containerRef: RefObject<HTMLDivElement | null>;
    edgePadding: number;
    onUserScroll?: () => void;
    onInteractionChange?: (interacting: boolean) => void;
}

const LyricsScrollArea = ({
    containerRef,
    edgePadding,
    onUserScroll,
    onInteractionChange,
    children,
}: LyricsScrollAreaProps) => {
    const [isScrolling, setIsScrolling] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    const dragStartY = useRef(0);
    const dragStartScrollTop = useRef(0);
    const dragDistance = useRef(0);

    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const interactionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const resetScrollTimeout = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
            setIsScrolling(false);
        }, 1500); // Keep scrollbar visible for 1.5s after last user scroll interaction
    };

    const resetInteractionTimeout = (delay = 3000) => {
        if (interactionTimeoutRef.current) {
            clearTimeout(interactionTimeoutRef.current);
        }
        interactionTimeoutRef.current = setTimeout(() => {
            if (onInteractionChange) {
                onInteractionChange(false);
            }
        }, delay);
    };

    const startScrolling = () => {
        setIsScrolling(true);
        resetScrollTimeout();
        if (onInteractionChange) {
            onInteractionChange(true);
        }
        resetInteractionTimeout();
    };

    const handleScroll = () => {
        if (isScrolling || isDragging) {
            resetScrollTimeout();
            if (onUserScroll) {
                onUserScroll();
            }
            if (onInteractionChange) {
                onInteractionChange(true);
            }
            resetInteractionTimeout();
        }
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        if (e.button !== 0) return; // only left click
        const container = containerRef.current;
        if (!container) return;

        setIsDragging(true);
        dragStartY.current = e.clientY;
        dragStartScrollTop.current = container.scrollTop;
        dragDistance.current = 0;

        container.style.cursor = 'grabbing';
        container.style.userSelect = 'none';

        if (onInteractionChange) {
            onInteractionChange(true);
        }
        if (interactionTimeoutRef.current) {
            clearTimeout(interactionTimeoutRef.current);
        }
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return;
        const container = containerRef.current;
        if (!container) return;

        const deltaY = e.clientY - dragStartY.current;
        dragDistance.current = Math.abs(deltaY);
        container.scrollTop = dragStartScrollTop.current - deltaY;

        if (onUserScroll) {
            onUserScroll();
        }
    };

    const handleMouseUpOrLeave = () => {
        if (!isDragging) return;
        setIsDragging(false);
        const container = containerRef.current;
        if (container) {
            container.style.cursor = '';
            container.style.userSelect = '';
        }
        // When drag ends, start the timeout to reset interaction
        resetInteractionTimeout(3000);
    };

    const handleCaptureClick = (e: React.MouseEvent) => {
        // If they dragged more than 5px, treat it as a scroll and cancel click handlers
        if (dragDistance.current > 5) {
            e.stopPropagation();
            e.preventDefault();
        }
    };

    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
            if (interactionTimeoutRef.current) {
                clearTimeout(interactionTimeoutRef.current);
            }
        };
    }, []);

    return (
        <div
            ref={containerRef}
            className={cn(
                "h-full overflow-y-auto overscroll-contain cursor-grab select-none active:cursor-grabbing",
                !isScrolling && "scrollbar-hide"
            )}
            onScroll={handleScroll}
            onWheel={startScrolling}
            onTouchStart={startScrolling}
            onTouchMove={startScrolling}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUpOrLeave}
            onMouseLeave={handleMouseUpOrLeave}
            onClickCapture={handleCaptureClick}
        >
            <div
                className="flex flex-col items-center gap-5 px-4"
                style={{ paddingTop: edgePadding, paddingBottom: edgePadding }}
            >
                {children}
            </div>
        </div>
    );
};

export default LyricsScrollArea;
