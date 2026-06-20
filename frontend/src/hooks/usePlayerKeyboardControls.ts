import { useEffect } from 'react';

interface PlayerKeyboardControlsConfig {
    togglePlay: () => void;
    toggleMute: () => void;
    toggleFullscreen: () => void;
    togglePiP: () => void;
    handleSeekBackward: () => void;
    handleSeekForward: () => void;
    handleVolumeUp?: () => void;
    handleVolumeDown?: () => void;
    onActivity?: () => void;
}

export const usePlayerKeyboardControls = ({
    togglePlay,
    toggleMute,
    toggleFullscreen,
    togglePiP,
    handleSeekBackward,
    handleSeekForward,
    handleVolumeUp,
    handleVolumeDown,
    onActivity,
}: PlayerKeyboardControlsConfig) => {
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            let handled = false;
            switch (e.key) {
                case ' ':
                case 'k':
                case 'K':
                    e.preventDefault();
                    togglePlay();
                    handled = true;
                    break;
                case 'm':
                case 'M':
                    e.preventDefault();
                    toggleMute();
                    handled = true;
                    break;
                case 'f':
                case 'F':
                    e.preventDefault();
                    toggleFullscreen();
                    handled = true;
                    break;
                case 'p':
                case 'P':
                    e.preventDefault();
                    togglePiP();
                    handled = true;
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    handleSeekBackward();
                    handled = true;
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    handleSeekForward();
                    handled = true;
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    handleVolumeUp?.();
                    handled = true;
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    handleVolumeDown?.();
                    handled = true;
                    break;
                default:
                    break;
            }
            if (handled) {
                onActivity?.();
            }
        };

        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, [
        togglePlay,
        toggleMute,
        toggleFullscreen,
        togglePiP,
        handleSeekBackward,
        handleSeekForward,
        handleVolumeUp,
        handleVolumeDown,
        onActivity,
    ]);
};

