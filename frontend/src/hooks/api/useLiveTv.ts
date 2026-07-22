import { getApi } from '@/api/getApi';
import { useQuery } from '@tanstack/react-query';
import { getLiveTvApi } from '@jellyfin/sdk/lib/utils/api/live-tv-api';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { getRetryConfig } from '@/utils/authErrorHandler';

export function useLiveTvChannels() {
    return useQuery<BaseItemDto[]>({
        queryKey: ['liveTvChannels'],
        queryFn: async (): Promise<BaseItemDto[]> => {
            const api = getApi();
            const liveTvApi = getLiveTvApi(api);
            const response = await liveTvApi.getLiveTvChannels({
                enableFavoriteSorting: true,
                addCurrentProgram: true,
            });
            return response.data.Items || [];
        },
        ...getRetryConfig(),
    });
}

export function useLiveTvRecommendedPrograms() {
    return useQuery<BaseItemDto[]>({
        queryKey: ['liveTvRecommendedPrograms'],
        queryFn: async (): Promise<BaseItemDto[]> => {
            const api = getApi();
            const liveTvApi = getLiveTvApi(api);
            const response = await liveTvApi.getRecommendedPrograms({
                isAiring: true,
                limit: 10,
            });
            return response.data.Items || [];
        },
        ...getRetryConfig(),
    });
}

export function useLiveTvPrograms() {
    return useQuery<BaseItemDto[]>({
        queryKey: ['liveTvPrograms'],
        queryFn: async (): Promise<BaseItemDto[]> => {
            const api = getApi();
            const liveTvApi = getLiveTvApi(api);
            const response = await liveTvApi.getLiveTvPrograms({
                enableImages: true,
                limit: 50,
            });
            return response.data.Items || [];
        },
        ...getRetryConfig(),
    });
}
