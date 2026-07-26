import { getApi } from '@/api/getApi';
import { useMutation } from '@tanstack/react-query';
import { getPlaystateApi } from '@jellyfin/sdk/lib/utils/api/playstate-api';
import { useCurrentSessionId } from './useCurrentSessionId';

interface PlaybackProgress {
    itemId: string;
    positionTicks: number;
    isPaused?: boolean;
    playSessionId?: string;
    volumeLevel?: number;
    isMuted?: boolean;
}

export function useReportPlaybackProgress() {
    const { data: sessionId } = useCurrentSessionId();

    const { mutate: reportProgress, isPending } = useMutation({
        mutationFn: async ({
            itemId,
            positionTicks,
            isPaused,
            playSessionId,
            volumeLevel,
            isMuted,
        }: PlaybackProgress) => {
            if (!itemId) throw new Error('Item ID is required');
            if (!sessionId) throw new Error('Session ID is required');

            const api = getApi();
            const playstateApi = getPlaystateApi(api);

            const progressInfo: any = {
                ItemId: itemId,
                PositionTicks: positionTicks,
                IsPaused: isPaused,
                VolumeLevel: volumeLevel,
                IsMuted: isMuted,
            };

            if (playSessionId && playSessionId.trim().length > 0) {
                progressInfo.PlaySessionId = playSessionId;
            }

            await playstateApi.reportPlaybackProgress({
                playbackProgressInfo: progressInfo,
            });

            // console.log(
            //     `Reported progress for item ${itemId}: ${positionTicks} ticks, paused: ${isPaused} with response:`,
            //     response
            // );

            return { itemId, positionTicks };
        },
        meta: {
            silentFail: true,
        },
    });

    return { reportProgress, isReporting: isPending };
}
