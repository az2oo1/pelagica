import type { ProcessedLyrics } from '../types';
import StaticLines from './StaticLines';
import SyncedLines from './SyncedLines';

interface LyricsDisplayProps {
    lyrics: ProcessedLyrics;
    currentTime: number;
    onLineClick: (startTicks: number) => void;
    enabled?: boolean;
    isPopover?: boolean;
}

const LyricsDisplay = ({
    lyrics,
    currentTime,
    onLineClick,
    enabled = true,
    isPopover = false,
}: LyricsDisplayProps) => {
    if (lyrics.isSynced) {
        return (
            <SyncedLines
                lines={lyrics.lines}
                currentTime={currentTime}
                offset={lyrics.offset}
                onLineClick={onLineClick}
                enabled={enabled}
                isPopover={isPopover}
            />
        );
    }

    return <StaticLines lines={lyrics.lines} enabled={enabled} />;
};

export default LyricsDisplay;
