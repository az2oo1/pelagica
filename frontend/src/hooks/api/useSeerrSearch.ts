import { useQuery } from '@tanstack/react-query';
import { useConfig } from './useConfig';
import { getUsername, getPassword } from '@/utils/localstorageCredentials';

export interface SeerrResult {
    id: number;
    mediaType: 'movie' | 'tv' | 'person';
    title?: string;
    name?: string;
    posterPath?: string;
    backdropPath?: string;
    profilePath?: string;
    overview?: string;
    releaseDate?: string;
    firstAirDate?: string;
    mediaInfo?: {
        id: number;
        status: number; // 1 = UNKNOWN, 2 = PENDING, 3 = PROCESSING, 4 = PARTIALLY_AVAILABLE, 5 = AVAILABLE
    };
}

export interface SeerrSearchResponse {
    page: number;
    totalPages: number;
    totalResults: number;
    results: SeerrResult[];
}

export function useSeerrSearch(query: string, usernameFromUi?: string) {
    const { config } = useConfig();
    const { seerrUrl } = config || {};

    return useQuery<SeerrSearchResponse>({
        queryKey: ['seerrSearch', query, seerrUrl, usernameFromUi],
        queryFn: async () => {
            if (!seerrUrl || !query) {
                return { page: 1, totalPages: 0, totalResults: 0, results: [] };
            }

            const username = usernameFromUi || getUsername() || '';
            const password = getPassword() || '';

            const url = new URL('/api/seerr/search', window.location.origin);
            url.searchParams.set('query', encodeURIComponent(query.trim()));

            const res = await fetch(url.toString(), {
                method: 'GET',
                headers: {
                    'X-Seerr-Username': username,
                    'X-Seerr-Password': password,
                },
            });

            if (!res.ok) {
                const errBody = await res.json().catch(() => null);
                const errMsg = errBody?.error || errBody?.message || res.statusText || String(res.status);
                const error = new Error(`Seerr search failed: ${errMsg}`);
                (error as any).status = res.status;
                throw error;
            }

            return res.json();
        },
        enabled: !!query && !!seerrUrl,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });
}
