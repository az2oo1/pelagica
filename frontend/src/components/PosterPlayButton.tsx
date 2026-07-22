import { useState } from 'react';
import { Play, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { getApi } from '@/api/getApi';
import { getItemsApi } from '@jellyfin/sdk/lib/utils/api/items-api';
import { getTvShowsApi } from '@jellyfin/sdk/lib/utils/api/tv-shows-api';
import { getUserId } from '@/utils/localstorageCredentials';
import { useMusicPlayback } from '@/hooks/useMusicPlayback';

interface PosterPlayButtonProps {
    item: BaseItemDto | undefined;
    itemId?: string;
}

/**
 * Smart play button for home-page poster cards.
 *
 * - Series   → fetches next-up / first episode, navigates to /play/<episodeId>
 * - MusicAlbum → fetches tracks, loads them into the music queue (no navigation)
 * - Audio    → navigates to /play/<trackId>
 * - Movie / everything else → navigates to /play/<itemId>
 */
const PosterPlayButton = ({ item, itemId }: PosterPlayButtonProps) => {
    const navigate = useNavigate();
    const { loadQueue } = useMusicPlayback();
    const [isLoading, setIsLoading] = useState(false);

    const id = itemId || item?.Id;
    const type = item?.Type;

    const handleClick = async (e: React.MouseEvent) => {
        e.preventDefault();
        if (!id || isLoading) return;

        setIsLoading(true);
        try {
            // ── Series: find next episode to play ───────────────────────────
            if (type === 'Series') {
                const api = getApi();
                const tvApi = getTvShowsApi(api);
                const userId = getUserId();

                // Try NextUp first (the episode after the last one watched)
                let episodeId: string | undefined;
                try {
                    const nextUpRes = await tvApi.getNextUp({
                        userId: userId || undefined,
                        seriesId: id,
                        limit: 1,
                        enableUserData: true,
                    });
                    episodeId = nextUpRes.data.Items?.[0]?.Id ?? undefined;
                } catch {
                    // NextUp API not available, fall through
                }

                // Fallback: get all episodes and find first unwatched
                if (!episodeId) {
                    const itemsApi = getItemsApi(api);
                    const episodesRes = await itemsApi.getItems({
                        parentId: id,
                        includeItemTypes: ['Episode'],
                        recursive: true,
                        sortBy: ['ParentIndexNumber', 'IndexNumber'],
                        sortOrder: ['Ascending'],
                        enableUserData: true,
                        limit: 1,
                    });
                    const allEpisodes = episodesRes.data.Items || [];
                    // First unplayed or has partial progress
                    const target =
                        allEpisodes.find(
                            (ep) =>
                                !ep.UserData?.Played ||
                                (ep.UserData?.PlaybackPositionTicks ?? 0) > 0
                        ) || allEpisodes[0];
                    episodeId = target?.Id ?? undefined;
                }

                if (episodeId) {
                    navigate(`/play/${episodeId}`);
                } else {
                    // Fallback: open series page
                    navigate(`/item/${id}`);
                }
                return;
            }

            // ── MusicAlbum: load tracks into music queue ─────────────────────
            if (type === 'MusicAlbum') {
                const api = getApi();
                const itemsApi = getItemsApi(api);
                const res = await itemsApi.getItems({
                    parentId: id,
                    includeItemTypes: ['Audio'],
                    sortBy: ['IndexNumber'],
                    sortOrder: ['Ascending'],
                    fields: ['Overview', 'MediaSources', 'MediaStreams'],
                    enableUserData: true,
                });
                const tracks = (res.data.Items || []).map((track) => ({
                    id: track.Id || '',
                    title: track.Name || '',
                    artist:
                        track.ArtistItems?.[0]?.Name ||
                        item?.ArtistItems?.[0]?.Name ||
                        'Unknown',
                    albumId: id,
                    albumName: item?.Name || '',
                }));
                if (tracks.length > 0) {
                    loadQueue(tracks, 0, true);
                }
                return;
            }

            if (type === 'Audio') {
                loadQueue([
                    {
                        id: id || '',
                        title: item?.Name || '',
                        artist: item?.AlbumArtist || item?.Artists?.[0] || 'Unknown',
                        albumId: item?.AlbumId || '',
                        albumName: item?.Album || '',
                    }
                ], 0, true);
                return;
            }

            // ── Everything else (Movie, BoxSet, …) ────────────────────
            navigate(`/play/${id}`);
        } catch (err) {
            console.error('[PosterPlayButton] Error resolving play target:', err);
            // Best-effort fallback
            navigate(`/item/${id}`);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 group-focus:opacity-100 transition-opacity duration-150 z-30">
            <div
                className="flex items-center justify-center bg-black/80 border border-white/15 rounded-full w-9 h-9 cursor-pointer hover:bg-black/90 hover:scale-110 active:scale-95 transition-all duration-200 ease-out"
                role="button"
                aria-label="Play"
                onClick={handleClick}
            >
                {isLoading ? (
                    <Loader2 className="w-4 h-4 text-white animate-spin" />
                ) : (
                    <Play className="w-4 h-4 text-white fill-white translate-x-px" />
                )}
            </div>
        </div>
    );
};

export default PosterPlayButton;
