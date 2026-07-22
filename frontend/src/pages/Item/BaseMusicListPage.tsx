import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { getPrimaryImageUrl } from '@/utils/jellyfinUrls';
import { usePageBackground } from '@/hooks/usePageBackground';
import { Link } from 'react-router';
import { ticksToReadableMusicTime, ticksToReadableTime } from '@/utils/timeConversion';
import { Button } from '@/components/ui/button';
import BaseMediaPage from './BaseMediaPage';
import { Badge } from '@/components/ui/badge';
import { EllipsisVertical, ImageOff, Info, ListMusic, Play, Trash2 } from 'lucide-react';
import FavoriteButton from '@/components/FavoriteButton';
import { Skeleton } from '@/components/ui/skeleton';
import type { AppConfig } from '@/hooks/api/useConfig';
import { useAlbumTracks } from '@/hooks/api/useAlbumTracks';
import { useMusicPlayback } from '@/hooks/useMusicPlayback';
import { useTranslation } from 'react-i18next';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
    DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';
import MediaInfoDialog from '../../components/MediaInfoDialog';
import type { TFunction } from 'i18next';
import { usePlaylists } from '@/hooks/api/playlist/usePlaylists';
import { useAddToPlaylist } from '@/hooks/api/playlist/useAddToPlaylist';
import { useRemoveFromPlaylist } from '@/hooks/api/playlist/useRemoveFromPlaylist';
import { useCurrentUser } from '@/hooks/api/useCurrentUser';
import { useDeleteMedia } from '@/hooks/api/useDeleteMedia';
import { useState, useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { usePlaylistPresence } from '@/hooks/api/playlist/usePlaylistPresence';
import { CreatePlaylistDialog } from '@/components/CreatePlaylistDialog';
import ItemAdminButton from '@/components/ItemAdminButton';

const MAX_ARTISTS_DISPLAYED = 5;

const SongDropDown = ({
    track,
    t,
    onPlay,
}: {
    track: BaseItemDto;
    t: TFunction;
    onPlay?: () => void;
}) => {
    const { data: currentUser } = useCurrentUser();
    const {
        data: playlists,
        isLoading: isLoadingPlaylists,
        refetch: refetchPlaylists,
    } = usePlaylists(currentUser?.Id);
    const playlistIds = useMemo(
        () => playlists?.map((p) => p.Id!).filter(Boolean) || [],
        [playlists]
    );
    const {
        data: presence,
        isLoading: isCheckingPlaylists,
        refetch,
    } = usePlaylistPresence(track.Id, playlistIds, currentUser?.Id);
    const addToPlaylist = useAddToPlaylist();
    const removeFromPlaylist = useRemoveFromPlaylist();
    const queryClient = useQueryClient();
    const [localPresence, setLocalPresence] = useState(presence || {});
    const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

    const { deleteMedia } = useDeleteMedia(() => {
        queryClient.invalidateQueries({ queryKey: ['albumTracks'] });
    });

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        if (presence) setLocalPresence(presence);
    }, [presence]);

    const handlePlaylistToggle = async (playlistId: string) => {
        if (!track.Id) return;

        const currentState = localPresence[playlistId]?.present || false;
        setLoadingStates((prev) => ({ ...prev, [playlistId]: true }));

        try {
            if (currentState) {
                const playlistItemId = localPresence[playlistId]?.playlistItemId;
                if (playlistItemId) {
                    await removeFromPlaylist.mutateAsync({
                        playlistId,
                        entryIds: [playlistItemId],
                    });
                    setLocalPresence((prev) => ({
                        ...prev,
                        [playlistId]: { present: false, playlistItemId: null },
                    }));
                }
            } else {
                await addToPlaylist.mutateAsync({
                    playlistId,
                    itemIds: [track.Id],
                    userId: currentUser?.Id,
                });
                setLocalPresence((prev) => ({
                    ...prev,
                    [playlistId]: {
                        present: true,
                        playlistItemId: prev[playlistId]?.playlistItemId || null,
                    },
                }));
            }
            await queryClient.invalidateQueries({ queryKey: ['playlistPresence', track.Id] });
            refetch();
        } catch (error) {
            console.error('Error toggling playlist:', error);
        } finally {
            setLoadingStates((prev) => ({ ...prev, [playlistId]: false }));
        }
    };

    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
                <Button variant={'outline'} size={'icon-sm'} onClick={(e) => e.stopPropagation()}>
                    <EllipsisVertical />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onPlay}>
                    <Play className="w-4 h-4 mr-1.5" />
                    {t('play')}
                </DropdownMenuItem>
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                        <ListMusic /> {t('add_to_playlist')}
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                        {(isLoadingPlaylists || isCheckingPlaylists) && (
                            <DropdownMenuItem disabled>Loading...</DropdownMenuItem>
                        )}
                        {!isLoadingPlaylists && playlists && playlists.length === 0 && (
                            <DropdownMenuItem disabled>No playlists found</DropdownMenuItem>
                        )}
                        {!isCheckingPlaylists &&
                            playlists?.map((playlist) => (
                                <DropdownMenuCheckboxItem
                                    key={playlist.Id}
                                    checked={localPresence[playlist.Id!]?.present || false}
                                    disabled={loadingStates[playlist.Id!]}
                                    onCheckedChange={() => handlePlaylistToggle(playlist.Id!)}
                                    onSelect={(e) => e.preventDefault()}
                                >
                                    {playlist.Name}
                                </DropdownMenuCheckboxItem>
                            ))}
                        <CreatePlaylistDialog
                            userId={currentUser?.Id}
                            onSuccess={() => refetchPlaylists()}
                        />
                    </DropdownMenuSubContent>
                </DropdownMenuSub>
                <MediaInfoDialog
                    streams={track.MediaStreams || []}
                    trigger={
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Info /> {t('mediaInfo')}
                        </DropdownMenuItem>
                    }
                />
                {currentUser?.Policy?.IsAdministrator && (
                    <DropdownMenuItem
                        className="text-destructive focus:bg-destructive/10 focus:text-destructive"
                        onSelect={(e) => {
                            e.preventDefault();
                            if (window.confirm(t('media_delete_confirm', { title: track.Name }) || `Are you sure you want to delete ${track.Name}?`)) {
                                deleteMedia(track.Id!);
                            }
                        }}
                    >
                        <Trash2 className="w-4 h-4 mr-1.5" />
                        {t('delete')}
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

interface BaseMusicListPageProps {
    item: BaseItemDto;
    config: AppConfig;
    listType: string;
}

const BaseMusicListPage = ({ item, config, listType }: BaseMusicListPageProps) => {
    const { t } = useTranslation('item');
    const { setBackground } = usePageBackground();
    const { loadQueue } = useMusicPlayback();
    const {
        data: albumTracks,
        isLoading: isLoadingAlbumTracks,
        error: albumTracksError,
    } = useAlbumTracks(item.Id);
    const [failedCover, setFailedCover] = useState(false);

    useEffect(() => {
        setBackground(
            <div className="fixed top-0 left-0 w-full h-full -z-20 overflow-hidden">
                <div className="absolute inset-0">
                    <img
                        src={getPrimaryImageUrl(item.Id || '', undefined, item.ImageTags?.Primary)}
                        alt={item.Name + ' Backdrop'}
                        className="w-full h-full object-cover blur-3xl scale-110 opacity-40"
                        onError={() => setFailedCover(true)}
                    />
                </div>
                <div className="absolute inset-0 bg-linear-to-b from-background/80 via-background/50 to-background" />
                <div className="absolute inset-0 bg-linear-to-t from-background via-transparent to-transparent" />
            </div>
        );

        return () => {
            setBackground(null);
        };
    }, [item.Id, item.Name, item.ImageTags, setBackground]);

    const detailItems: string[] = [];
    if (item.PremiereDate) {
        const year = new Date(item.PremiereDate).getFullYear();
        detailItems.push(year.toString());
    }
    if (item.ChildCount !== undefined && item.ChildCount !== null) {
        detailItems.push(
            t(`tracks_count${item.ChildCount > 1 ? '_plural' : ''}`, { count: item.ChildCount })
        );
    }
    if (item.RunTimeTicks !== undefined && item.RunTimeTicks !== null) {
        detailItems.push(ticksToReadableTime(item.RunTimeTicks));
    }

    const handlePlayAlbum = () => {
        if (albumTracks && albumTracks.length > 0) {
            const trackQueue = albumTracks.map((track) => ({
                id: track.Id || '',
                title: track.Name || '',
                artist: track.ArtistItems?.[0]?.Name || item.ArtistItems?.[0]?.Name || 'Unknown',
                albumId: item.Id || '',
                albumName: item.Name || '',
            }));
            loadQueue(trackQueue, 0, true);
        }
    };

    const handleTrackClick = (_: BaseItemDto, index: number) => {
        if (albumTracks && albumTracks.length > 0) {
            const trackQueue = albumTracks.map((t) => ({
                id: t.Id || '',
                title: t.Name || '',
                artist: t.ArtistItems?.[0]?.Name || item.ArtistItems?.[0]?.Name || 'Unknown',
                albumId: item.Id || '',
                albumName: item.Name || '',
            }));
            loadQueue(trackQueue, index, true);
        }
    };

    return (
        <BaseMediaPage itemId={item.Id || ''} name={item.Name || ''} showLogo={false} topPadding={false}>
            <div className="pt-24 sm:pt-32 pb-12 px-4 sm:px-12 max-w-7xl mx-auto w-full flex flex-col gap-12">
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start relative z-10 w-full">
                    {/* Left Column (Cover) */}
                    <div className="w-48 sm:w-64 shrink-0 mx-auto lg:mx-0">
                        <div className="relative aspect-square w-full rounded-xl overflow-hidden shadow-2xl shadow-black/85 border border-white/10 bg-muted flex items-center justify-center">
                            {!failedCover ? (
                                <>
                                    <Skeleton className="absolute inset-0 w-full h-full rounded-xl" />
                                    <img
                                        src={getPrimaryImageUrl(
                                            item.Id!,
                                            undefined,
                                            item.ImageTags?.Primary
                                        )}
                                        alt={item.Name + ' Cover'}
                                        className="object-cover rounded-xl w-full h-full relative z-10"
                                        onError={() => setFailedCover(true)}
                                    />
                                </>
                            ) : (
                                <ImageOff className="text-muted-foreground w-12 h-12" />
                            )}
                        </div>
                    </div>

                    {/* Right Column (Details) */}
                    <div className="flex-1 flex flex-col gap-5 w-full text-left">
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{listType}</span>
                            <h1 className="text-4xl sm:text-5xl font-bold tracking-tight mb-2 text-wrap balance">
                                {item.Name}
                            </h1>
                            <div className="flex flex-wrap gap-2 mt-1">
                                {item.ArtistItems &&
                                    item.ArtistItems.slice(0, MAX_ARTISTS_DISPLAYED).map(
                                        (artist) => (
                                            <Badge
                                                key={artist.Id}
                                                variant="secondary"
                                                className="bg-white/5 hover:bg-white/10 border-white/5 text-foreground hover:underline transition-colors px-2.5 py-0.5"
                                                asChild
                                            >
                                                <Link to={`/item/${artist.Id}`}>
                                                    {artist.Name}
                                                </Link>
                                            </Badge>
                                        )
                                    )}
                                {item.ArtistItems &&
                                    item.ArtistItems.length > MAX_ARTISTS_DISPLAYED && (
                                        <span className="text-sm text-muted-foreground">
                                            {t('more_artists', {
                                                count:
                                                    item.ArtistItems.length - MAX_ARTISTS_DISPLAYED,
                                            })}
                                        </span>
                                    )}
                            </div>
                        </div>

                        {/* Badges/Details Row */}
                        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                            {detailItems.join(' • ')}
                        </div>

                        {/* Overview */}
                        {item.Overview && (
                            <p className="text-base text-foreground/90 leading-relaxed font-normal max-w-3xl mt-2">
                                {item.Overview}
                            </p>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2.5 items-center mt-2">
                            <Button id="play-button" onClick={handlePlayAlbum} className="cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-200 ease-out">
                                <Play className="w-4 h-4 fill-current mr-1.5" />
                                {t('play')}
                            </Button>
                            <FavoriteButton
                                item={item}
                                size="default"
                                showFavoriteButton={config.itemPage?.favoriteButton?.includes(
                                    item.Type!
                                )}
                            />
                            <ItemAdminButton item={item} />
                        </div>
                    </div>
                </div>

                {/* Tracks list below */}
                <div className="w-full mt-6 relative z-10">
                    {isLoadingAlbumTracks && (
                        <div className="flex flex-col gap-0">
                            <div className="flex items-center p-2 px-8 group text-muted-foreground">
                                <span className="text-sm mr-8 font-mono w-4">#</span>
                                <span>{t('title')}</span>
                                <span className="text-sm ml-auto">{t('duration')}</span>
                            </div>
                            <div className="border-b border-border mb-4" />
                            <div className="flex flex-col gap-3">
                                {[...Array(3)].map((_, index) => (
                                    <Skeleton key={index} className="h-15 w-full rounded-xl" />
                                ))}
                            </div>
                        </div>
                    )}
                    {albumTracksError && (
                        <div className="text-red-500">{t('error_loading_tracks')}</div>
                    )}
                    {albumTracks && albumTracks.length > 0 && (
                        <div className="flex flex-col gap-0">
                            <div className="flex items-center p-2 px-8 group text-muted-foreground">
                                <span className="text-sm mr-8 font-mono w-4">#</span>
                                <span>{t('title')}</span>
                                <span className="text-sm ml-auto">{t('duration')}</span>
                                <Button variant="ghost" size="icon-sm" className="ml-4 invisible">
                                    <EllipsisVertical />
                                </Button>
                            </div>
                            <div className="border-b border-border mb-4" />
                            <div className="flex flex-col gap-1">
                                {albumTracks.map((track, index) => {
                                    if (!track.IndexNumber) return null;

                                    return (
                                        <div
                                            key={track.Id}
                                            className="flex items-center p-2 px-8 hover:bg-accent/70 rounded-md group cursor-pointer"
                                            onClick={() => handleTrackClick(track, index)}
                                        >
                                            {track.IndexNumber !== undefined && (
                                                <span className="text-sm text-muted-foreground mr-8 font-mono w-4">
                                                    <span className="group-hover:hidden">
                                                        {track.IndexNumber}
                                                    </span>
                                                    <span className="hidden group-hover:inline-block">
                                                        ▶︎
                                                    </span>
                                                </span>
                                            )}
                                            <div className="flex flex-col">
                                                <span>{track.Name}</span>
                                                {track.ArtistItems &&
                                                    track.ArtistItems.length > 0 && (
                                                        <span className="text-sm text-muted-foreground">
                                                            {track.ArtistItems.map(
                                                                (artist) => artist.Name
                                                            ).join(', ')}
                                                        </span>
                                                    )}
                                            </div>
                                            {track.RunTimeTicks !== undefined &&
                                                track.RunTimeTicks !== null && (
                                                    <span className="text-sm text-muted-foreground ml-auto font-mono">
                                                        {ticksToReadableMusicTime(
                                                            track.RunTimeTicks
                                                        )}
                                                    </span>
                                                )}
                                            <div
                                                className="ml-4"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <SongDropDown
                                                    track={track}
                                                    t={t}
                                                    onPlay={() => handleTrackClick(track, index)}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </BaseMediaPage>
    );
};

export default BaseMusicListPage;
