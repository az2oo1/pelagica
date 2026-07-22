import { createApi } from '@/api/jellyfinClient';
import { getUserApi } from '@jellyfin/sdk/lib/utils/api/user-api';
import { useQuery } from '@tanstack/react-query';
import type { UserDto } from '@jellyfin/sdk/lib/generated-client/models';

export function usePublicUsers(serverUrl?: string) {
    return useQuery<UserDto[]>({
        queryKey: ['publicUsers', serverUrl],
        enabled: !!serverUrl,
        queryFn: async () => {
            if (!serverUrl) return [];
            const api = createApi(serverUrl);
            const userApi = getUserApi(api);
            const res = await userApi.getPublicUsers();
            return res.data || [];
        },
        staleTime: 60000,
    });
}
