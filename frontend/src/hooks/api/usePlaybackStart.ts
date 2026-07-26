import { getApi } from '@/api/getApi';
import { useMutation } from '@tanstack/react-query';
import { getPlaystateApi } from '@jellyfin/sdk/lib/utils/api/playstate-api';
import { useCurrentSessionId } from './useCurrentSessionId';

interface StartPlaybackPayload {
    itemId: string;
    positionTicks?: number;
    playSessionId?: string;
}

export function usePlaybackStart() {
    const { data: sessionId } = useCurrentSessionId();

    const { mutate: startPlayback, isPending } = useMutation({
        mutationFn: async ({ itemId, positionTicks = 0, playSessionId }: StartPlaybackPayload) => {
            if (!itemId) throw new Error('Item ID is required');
            if (!sessionId) throw new Error('Session ID is required');

            const api = getApi();
            const playstateApi = getPlaystateApi(api);

            const startInfo: any = {
                ItemId: itemId,
                PositionTicks: positionTicks,
            };

            if (playSessionId && playSessionId.trim().length > 0) {
                startInfo.PlaySessionId = playSessionId;
            }

            await playstateApi.reportPlaybackStart({
                playbackStartInfo: startInfo,
            });

            // console.log(
            //     `Started playback for item ${itemId} in session ${sessionId} at position ${positionTicks}`
            // );

            return itemId;
        },
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        meta: {
            silentFail: true,
        },
    });

    return { startPlayback, isStarting: isPending };
}
