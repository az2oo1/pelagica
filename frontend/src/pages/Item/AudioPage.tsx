import { useEffect, useState } from 'react';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import type { AppConfig } from '@/hooks/api/useConfig';
import { getPrimaryImageUrl } from '@/utils/jellyfinUrls';
import { usePageBackground } from '@/hooks/usePageBackground';
import { Link, useNavigate } from 'react-router';
import { ticksToReadableMusicTime, ticksToReadableTime } from '@/utils/timeConversion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Disc, Play, Pause, ImageOff, Music, Clock, Calendar } from 'lucide-react';
import FavoriteButton from '@/components/FavoriteButton';
import { useAlbumTracks } from '@/hooks/api/useAlbumTracks';
import { useMusicPlayback } from '@/hooks/useMusicPlayback';
import { useTranslation } from 'react-i18next';
import ItemContextMenu from '@/components/ItemContextMenu';
import ItemAdminButton from '@/components/ItemAdminButton';
import { Skeleton } from '@/components/ui/skeleton';

interface AudioPageProps {
    item: BaseItemDto;
    config: AppConfig;
}

const AudioPage = ({ item }: AudioPageProps) => {
    const { t } = useTranslation('item');
    const navigate = useNavigate();
    const { setBackground } = usePageBackground();
    const { loadQueue, currentTrack, isPlaying, togglePlay } = useMusicPlayback();
    const [failedCover, setFailedCover] = useState(false);

    const albumId = item.AlbumId || item.ParentId;
    const { data: albumTracks, isLoading: isLoadingAlbumTracks } = useAlbumTracks(albumId);

    const isCurrentTrack = currentTrack?.id === item.Id;

    useEffect(() => {
        const imageId = albumId || item.Id || '';
        setBackground(
            <div className="fixed top-0 left-0 w-full h-full -z-20 overflow-hidden">
                <div className="absolute inset-0">
                    <img
                        src={getPrimaryImageUrl(imageId, undefined, item.ImageTags?.Primary)}
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
    }, [item.Id, item.Name, item.ImageTags, albumId, setBackground]);

    const artistName = item.AlbumArtist || (item.Artists && item.Artists.length > 0 ? item.Artists[0] : 'Unknown Artist');
    const artistId = item.ArtistItems && item.ArtistItems.length > 0 ? item.ArtistItems[0].Id : undefined;

    const handlePlaySong = () => {
        if (isCurrentTrack) {
            togglePlay();
            return;
        }

        const queue = (albumTracks && albumTracks.length > 0)
            ? albumTracks.map((track) => ({
                  id: track.Id || '',
                  title: track.Name || '',
                  artist: track.ArtistItems?.[0]?.Name || artistName,
                  albumId: albumId || '',
                  albumName: item.Album || '',
              }))
            : [{
                  id: item.Id || '',
                  title: item.Name || '',
                  artist: artistName,
                  albumId: albumId || '',
                  albumName: item.Album || '',
              }];

        const index = queue.findIndex((t) => t.id === item.Id);
        loadQueue(queue, index !== -1 ? index : 0, true);
    };

    const handlePlayTrackInQueue = (track: BaseItemDto, trackIndex: number) => {
        if (albumTracks && albumTracks.length > 0) {
            const queue = albumTracks.map((t) => ({
                id: t.Id || '',
                title: t.Name || '',
                artist: t.ArtistItems?.[0]?.Name || artistName,
                albumId: albumId || '',
                albumName: item.Album || '',
            }));
            loadQueue(queue, trackIndex, true);
        }
    };

    const coverImageId = albumId || item.Id || '';

    return (
        <ItemContextMenu item={item}>
            <div className="relative min-h-[calc(100vh-4rem)] pb-16 px-4 sm:px-8 max-w-7xl mx-auto w-full pt-6">
                {/* Top Section */}
                <div className="flex flex-col md:flex-row items-center md:items-end gap-8 md:gap-12 pt-8 pb-10">
                    {/* Cover Art */}
                    <div className="w-56 h-56 sm:w-64 sm:h-64 lg:w-72 lg:h-72 shrink-0 relative group shadow-2xl rounded-xl overflow-hidden border border-white/10 bg-muted">
                        {!failedCover ? (
                            <img
                                src={getPrimaryImageUrl(coverImageId, { width: 500, height: 500 }, albumId ? undefined : item.ImageTags?.Primary)}
                                alt={item.Name || ''}
                                className="w-full h-full object-cover rounded-xl transition-transform duration-300 group-hover:scale-105"
                                onError={() => setFailedCover(true)}
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-muted text-muted-foreground">
                                <Music size={48} />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button
                                size="icon-lg"
                                className="rounded-full w-14 h-14 bg-brand text-brand-foreground hover:scale-105 transition-transform"
                                onClick={handlePlaySong}
                            >
                                {isCurrentTrack && isPlaying ? <Pause className="w-6 h-6 fill-current" /> : <Play className="w-6 h-6 fill-current ml-1" />}
                            </Button>
                        </div>
                    </div>

                    {/* Meta Info */}
                    <div className="flex-1 flex flex-col items-center md:items-start text-center md:text-left gap-3 w-full">
                        <Badge variant="secondary" className="uppercase text-xs font-bold tracking-wider px-2.5 py-0.5">
                            {t('song', { defaultValue: 'Song' })}
                        </Badge>

                        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground line-clamp-2">
                            {item.Name}
                        </h1>

                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 text-base text-muted-foreground mt-1">
                            {artistId ? (
                                <Link
                                    to={`/item/${artistId}`}
                                    className="font-semibold text-foreground hover:text-brand transition-colors"
                                >
                                    {artistName}
                                </Link>
                            ) : (
                                <span className="font-semibold text-foreground">{artistName}</span>
                            )}

                            {item.Album && (
                                <>
                                    <span>•</span>
                                    {albumId ? (
                                        <Link
                                            to={`/item/${albumId}`}
                                            className="hover:text-foreground transition-colors flex items-center gap-1"
                                        >
                                            <Disc size={14} />
                                            <span>{item.Album}</span>
                                        </Link>
                                    ) : (
                                        <span>{item.Album}</span>
                                    )}
                                </>
                            )}
                        </div>

                        {/* Badges row */}
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-2 text-xs text-muted-foreground">
                            {item.PremiereDate && (
                                <span className="flex items-center gap-1">
                                    <Calendar size={13} />
                                    {new Date(item.PremiereDate).getFullYear()}
                                </span>
                            )}
                            {item.RunTimeTicks && (
                                <span className="flex items-center gap-1">
                                    <Clock size={13} />
                                    {ticksToReadableTime(item.RunTimeTicks)}
                                </span>
                            )}
                            {item.Container && (
                                <Badge variant="outline" className="text-[10px] uppercase border-white/20">
                                    {item.Container}
                                </Badge>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mt-4">
                            <Button
                                size="lg"
                                className="gap-2 rounded-full px-6 bg-brand text-brand-foreground hover:bg-brand/90"
                                onClick={handlePlaySong}
                            >
                                {isCurrentTrack && isPlaying ? (
                                    <>
                                        <Pause className="w-5 h-5 fill-current" />
                                        {t('pause', { defaultValue: 'Pause' })}
                                    </>
                                ) : (
                                    <>
                                        <Play className="w-5 h-5 fill-current ml-0.5" />
                                        {t('play', { defaultValue: 'Play' })}
                                    </>
                                )}
                            </Button>

                            {albumId && (
                                <Button
                                    variant="outline"
                                    size="lg"
                                    className="gap-2 rounded-full px-5 border-white/20 hover:bg-white/10"
                                    onClick={() => navigate(`/item/${albumId}`)}
                                >
                                    <Disc className="w-4 h-4" />
                                    {t('view_album', { defaultValue: 'View Album' })}
                                </Button>
                            )}

                            <FavoriteButton itemId={item.Id!} />
                            <ItemAdminButton item={item} />
                        </div>
                    </div>
                </div>

                {/* Album Tracks section */}
                {albumId && (
                    <div className="mt-10 border-t border-white/10 pt-8">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                            <Disc className="w-5 h-5 text-brand" />
                            {item.Album ? `${t('from_album', { defaultValue: 'From' })} ${item.Album}` : t('other_tracks', { defaultValue: 'Other Tracks' })}
                        </h2>

                        {isLoadingAlbumTracks ? (
                            <div className="space-y-2">
                                {[1, 2, 3, 4].map((i) => (
                                    <Skeleton key={i} className="h-12 w-full rounded-md" />
                                ))}
                            </div>
                        ) : albumTracks && albumTracks.length > 0 ? (
                            <div className="divide-y divide-white/5 rounded-lg border border-white/10 overflow-hidden bg-card/40 backdrop-blur-xs">
                                {albumTracks.map((track, idx) => {
                                    const isTrackActive = currentTrack?.id === track.Id;
                                    const isThisSong = track.Id === item.Id;

                                    return (
                                        <div
                                            key={track.Id}
                                            onClick={() => handlePlayTrackInQueue(track, idx)}
                                            className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors group ${
                                                isThisSong
                                                    ? 'bg-brand/15 text-brand font-medium'
                                                    : 'hover:bg-white/5 text-foreground'
                                            }`}
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <span className="w-6 text-center text-xs text-muted-foreground group-hover:hidden">
                                                    {track.IndexNumber || idx + 1}
                                                </span>
                                                <Play className="w-4 h-4 text-brand hidden group-hover:block shrink-0" />
                                                <div className="flex flex-col min-w-0">
                                                    <span className="truncate text-sm font-medium">
                                                        {track.Name}
                                                    </span>
                                                    <span className="truncate text-xs text-muted-foreground">
                                                        {track.ArtistItems?.[0]?.Name || artistName}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-4 shrink-0 text-xs text-muted-foreground">
                                                {track.RunTimeTicks && (
                                                    <span>{ticksToReadableMusicTime(track.RunTimeTicks)}</span>
                                                )}
                                                {isTrackActive && isPlaying && (
                                                    <span className="flex items-center gap-0.5 text-brand">
                                                        <span className="w-1 h-3 bg-brand animate-pulse" />
                                                        <span className="w-1 h-4 bg-brand animate-pulse delay-75" />
                                                        <span className="w-1 h-2 bg-brand animate-pulse delay-150" />
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : null}
                    </div>
                )}
            </div>
        </ItemContextMenu>
    );
};

export default AudioPage;
