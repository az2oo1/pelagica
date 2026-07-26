import { getApi } from '@/api/getApi';
import { getSessionApi } from '@jellyfin/sdk/lib/utils/api/session-api';
import { useQuery } from '@tanstack/react-query';
import { getDeviceId } from '@/utils/localstorageCredentials';

export function useCurrentSessionId() {
    return useQuery({
        queryKey: ['currentSession'],
        queryFn: async () => {
            const api = getApi();
            const sessionApi = getSessionApi(api);
            const deviceId = getDeviceId();
            const sessions = await sessionApi.getSessions();
            const currentSession = sessions.data?.find((s) => s.DeviceId === deviceId) || sessions.data?.[0];
            if (!currentSession?.Id) {
                throw new Error('No active session found');
            }
            return currentSession.Id;
        },
        staleTime: 30000, // Cache for 30 seconds
    });
}
