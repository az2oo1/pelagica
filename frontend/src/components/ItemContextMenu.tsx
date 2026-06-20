import React, { useRef } from 'react';
import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import {
    Play,
    Heart,
    Bookmark,
    CheckCircle,
    Circle,
    Captions,
    Image,
    RotateCcw,
    Trash2,
    PencilLine,
    Search,
    Link2,
} from 'lucide-react';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { useFavorite } from '@/hooks/api/useFavorite';
import { useLike } from '@/hooks/api/useLike';
import { useMarkItemPlayed } from '@/hooks/api/playState/useMarkItemPlayed';
import { useMarkItemUnplayed } from '@/hooks/api/playState/useMarkItemUnplayed';
import { getUserId } from '@/utils/localstorageCredentials';
import { useMusicPlayback } from '@/hooks/useMusicPlayback';
import { getApi } from '@/api/getApi';
import { getItemsApi } from '@jellyfin/sdk/lib/utils/api/items-api';
import { getTvShowsApi } from '@jellyfin/sdk/lib/utils/api/tv-shows-api';
import { useCurrentUser } from '@/hooks/api/useCurrentUser';
import { getDownloadurl } from '@/utils/jellyfinUrls';
import { toast } from 'sonner';

import ManageImageButton from './ManageImageButton';
import RefreshItemMetadataButton from './RefreshItemMetadataButton';
import EditItemMetadataButton from './EditItemMetadataButton';
import MediaDeleteButton from './MediaDeleteButton';
import SubtitleDownloadDialog from '../pages/Item/SubtitleDownloadDialog';
import IdentifyDialog from './IdentifyDialog';

import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuSeparator,
    ContextMenuTrigger,
} from './ui/context-menu';
import { cn } from '@/lib/utils';

interface ItemContextMenuProps {
    item: BaseItemDto;
    children: React.ReactNode;
}

export default function ItemContextMenu({ item, children }: ItemContextMenuProps) {
    const { t } = useTranslation('item');
    const navigate = useNavigate();
    const { loadQueue } = useMusicPlayback();
    const { data: currentUser } = useCurrentUser();

    const manageImagesTriggerRef = useRef<HTMLButtonElement>(null);
    const refreshMetadataTriggerRef = useRef<HTMLButtonElement>(null);
    const deleteTriggerRef = useRef<HTMLButtonElement>(null);
    const subtitlesTriggerRef = useRef<HTMLButtonElement>(null);
    const editMetadataTriggerRef = useRef<HTMLButtonElement>(null);
    const identifyTriggerRef = useRef<HTMLButtonElement>(null);

    const itemId = item.Id;
    const type = item.Type;

    const { isFavorite, toggleFavorite } = useFavorite(itemId);
    const { isLiked, toggleLike } = useLike(itemId);
    const markPlayed = useMarkItemPlayed();
    const markUnplayed = useMarkItemUnplayed();

    const isPlayed = item.UserData?.Played ?? false;

    // Filter relevant media item types
    const isVideo = type === 'Movie' || type === 'Episode' || type === 'Series';
    const isMusic = type === 'MusicAlbum' || type === 'Audio';
    const isOtherSupport = type === 'MusicArtist' || type === 'Playlist' || type === 'BoxSet' || type === 'Person';

    if (!itemId || (!isVideo && !isMusic && !isOtherSupport)) {
        return <>{children}</>;
    }

    const isAdmin = currentUser?.Policy?.IsAdministrator === true;
    const showIdentify = type === 'Movie' || type === 'Series';
    const canStream = type !== 'Series' && type !== 'MusicAlbum';

    const handlePlay = async (e?: React.SyntheticEvent) => {
        e?.preventDefault();
        e?.stopPropagation();
        try {
            if (type === 'Series') {
                const api = getApi();
                const tvApi = getTvShowsApi(api);
                const userId = getUserId();

                let episodeId: string | undefined;
                try {
                    const nextUpRes = await tvApi.getNextUp({
                        userId: userId || undefined,
                        seriesId: itemId,
                        limit: 1,
                        enableUserData: true,
                    });
                    episodeId = nextUpRes.data.Items?.[0]?.Id ?? undefined;
                } catch {
                    // ignore
                }

                if (!episodeId) {
                    const itemsApi = getItemsApi(api);
                    const episodesRes = await itemsApi.getItems({
                        parentId: itemId,
                        includeItemTypes: ['Episode'],
                        recursive: true,
                        sortBy: ['ParentIndexNumber', 'IndexNumber'],
                        sortOrder: ['Ascending'],
                        enableUserData: true,
                        limit: 1,
                    });
                    const allEpisodes = episodesRes.data.Items || [];
                    const target = allEpisodes.find(
                        (ep) => !ep.UserData?.Played || (ep.UserData?.PlaybackPositionTicks ?? 0) > 0
                    ) || allEpisodes[0];
                    episodeId = target?.Id ?? undefined;
                }

                if (episodeId) {
                    navigate(`/play/${episodeId}`);
                } else {
                    navigate(`/item/${itemId}`);
                }
                return;
            }

            if (type === 'MusicAlbum') {
                const api = getApi();
                const itemsApi = getItemsApi(api);
                const res = await itemsApi.getItems({
                    parentId: itemId,
                    includeItemTypes: ['Audio'],
                    sortBy: ['IndexNumber'],
                    sortOrder: ['Ascending'],
                    fields: ['Overview', 'MediaSources', 'MediaStreams'],
                    enableUserData: true,
                });
                const tracks = (res.data.Items || []).map((track) => ({
                    id: track.Id || '',
                    title: track.Name || '',
                    artist: track.ArtistItems?.[0]?.Name || item.ArtistItems?.[0]?.Name || 'Unknown',
                    albumId: itemId,
                    albumName: item.Name || '',
                }));
                if (tracks.length > 0) {
                    loadQueue(tracks, 0, true);
                }
                return;
            }

            if (type === 'Audio') {
                loadQueue([
                    {
                        id: itemId || '',
                        title: item.Name || '',
                        artist: item.AlbumArtist || item.Artists?.[0] || 'Unknown',
                        albumId: item.AlbumId || '',
                        albumName: item.Album || '',
                    }
                ], 0, true);
                return;
            }

            navigate(`/play/${itemId}`);
        } catch (err) {
            console.error('[ItemContextMenu] Error resolving play target:', err);
            navigate(`/item/${itemId}`);
        }
    };

    const handleCopyStreamLink = (e?: React.SyntheticEvent) => {
        e?.preventDefault();
        e?.stopPropagation();
        const streamUrl = getDownloadurl(itemId || '');
        if (streamUrl) {
            void navigator.clipboard.writeText(streamUrl).then(() => {
                toast.success(t('stream_link_copied', { defaultValue: 'Stream link copied to clipboard!' }));
            }).catch((err) => {
                console.error('Failed to copy stream link:', err);
                toast.error(t('stream_link_error', { defaultValue: 'Could not copy stream link.' }));
            });
        } else {
            toast.error(t('stream_link_error', { defaultValue: 'Could not copy stream link.' }));
        }
    };

    return (
        <>
            <ContextMenu>
                <ContextMenuTrigger asChild>
                    {children}
                </ContextMenuTrigger>
                <ContextMenuContent className="w-56">
                    {/* Basic playback & state options */}
                    {type !== 'Person' && (
                        <ContextMenuItem onClick={handlePlay}>
                            <Play />
                            <span>Play</span>
                        </ContextMenuItem>
                    )}
                    {type !== 'Person' && (
                        <ContextMenuItem onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleFavorite(!isFavorite);
                        }}>
                            <Heart className={cn(isFavorite ? 'text-red-500 fill-red-500' : 'text-muted-foreground')} />
                            <span>{isFavorite ? 'Unfavorite' : 'Favorite'}</span>
                        </ContextMenuItem>
                    )}
                    {type !== 'Person' && (
                        <ContextMenuItem onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            toggleLike(!isLiked);
                        }}>
                            <Bookmark className={cn(isLiked ? 'text-amber-500 fill-amber-500' : 'text-muted-foreground')} />
                            <span>{isLiked ? 'Remove from Watchlist' : 'Add to Watchlist'}</span>
                        </ContextMenuItem>
                    )}
                    {isVideo && (
                        <ContextMenuItem onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            const userId = getUserId();
                            if (userId) {
                                if (isPlayed) {
                                    markUnplayed.mutate({ itemId, userId });
                                } else {
                                    markPlayed.mutate({ itemId, userId });
                                }
                            }
                        }}>
                            {isPlayed ? <Circle /> : <CheckCircle className="text-emerald-500 fill-emerald-500/20" />}
                            <span>{isPlayed ? 'Mark Unwatched' : 'Mark Watched'}</span>
                        </ContextMenuItem>
                    )}

                    {/* Admin options from ItemAdminButton */}
                    {isAdmin && (
                        <>
                            <ContextMenuSeparator />
                            <ContextMenuItem
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setTimeout(() => subtitlesTriggerRef.current?.click(), 0);
                                }}
                            >
                                <Captions />
                                {t('subtitles')}
                            </ContextMenuItem>
                            {showIdentify && (
                                <ContextMenuItem
                                    onClick={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setTimeout(() => identifyTriggerRef.current?.click(), 0);
                                    }}
                                >
                                    <Search />
                                    {t('identify', { defaultValue: 'Identify' })}
                                </ContextMenuItem>
                            )}
                            {canStream && (
                                <ContextMenuItem onClick={handleCopyStreamLink}>
                                    <Link2 />
                                    {t('copy_stream_link', { defaultValue: 'Copy Stream Link' })}
                                </ContextMenuItem>
                            )}
                            <ContextMenuItem
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setTimeout(() => manageImagesTriggerRef.current?.click(), 0);
                                }}
                            >
                                <Image />
                                {t('manage_images')}
                            </ContextMenuItem>
                            <ContextMenuItem
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setTimeout(() => refreshMetadataTriggerRef.current?.click(), 0);
                                }}
                            >
                                <RotateCcw />
                                {t('refreshMetadata')}
                            </ContextMenuItem>
                            <ContextMenuItem
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setTimeout(() => editMetadataTriggerRef.current?.click(), 0);
                                }}
                            >
                                <PencilLine />
                                {t('editMetadata')}
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem
                                onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setTimeout(() => deleteTriggerRef.current?.click(), 0);
                                }}
                                className="text-destructive focus:bg-destructive/10 dark:focus:bg-destructive/20 focus:text-destructive"
                            >
                                <Trash2 />
                                {t('deleteItem')}
                            </ContextMenuItem>
                        </>
                    )}
                </ContextMenuContent>
            </ContextMenu>

            {/* Hidden dialog triggers for admin tools */}
            {isAdmin && (
                <div style={{ display: 'none' }}>
                    <SubtitleDownloadDialog
                        item={item}
                        trigger={<button ref={subtitlesTriggerRef} />}
                    />
                    {showIdentify && (
                        <IdentifyDialog
                            item={item}
                            trigger={<button ref={identifyTriggerRef} />}
                        />
                    )}
                    <ManageImageButton item={item} trigger={<button ref={manageImagesTriggerRef} />} />
                    <RefreshItemMetadataButton
                        item={item}
                        trigger={<button ref={refreshMetadataTriggerRef} />}
                    />
                    <EditItemMetadataButton
                        item={item}
                        trigger={<button ref={editMetadataTriggerRef} />}
                    />
                    <MediaDeleteButton item={item} trigger={<button ref={deleteTriggerRef} />} />
                </div>
            )}
        </>
    );
}
