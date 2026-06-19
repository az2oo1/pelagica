import { Skeleton } from '@/components/ui/skeleton';
import { useConfig } from '@/hooks/api/useConfig';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import type { TFunction } from 'i18next';
import { ImageOff, Film, Tv, Play } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import WatchedStateBadge from '@/components/WatchedStateBadge';
import { cn } from '@/lib/utils';
import { useMusicPlayback } from '@/hooks/useMusicPlayback';
import ItemContextMenu from '@/components/ItemContextMenu';

const LibraryItem = ({
    item,
    posterUrl,
    t,
    posterAspectRatio = '2/3',
    detailLine,
    overlay,
    isDirectPlay,
    itemLink,
}: {
    item: BaseItemDto;
    posterUrl: string;
    t: TFunction;
    posterAspectRatio?: string;
    detailLine?: React.ReactNode;
    overlay?: React.ReactNode;
    isDirectPlay?: boolean;
    itemLink?: string;
}) => {
    const { config } = useConfig();
    const { loadQueue } = useMusicPlayback();
    const navigate = useNavigate();
    const [posterError, setPosterError] = useState(false);
    const [isImageLoaded, setIsImageLoaded] = useState(false);

    const handleClick = (e: React.MouseEvent) => {
        if (item.Type === 'Audio') {
            e.preventDefault();
            loadQueue([
                {
                    id: item.Id || '',
                    title: item.Name || '',
                    artist: item.AlbumArtist || (item.Artists && item.Artists[0]) || 'Unknown',
                    albumId: item.AlbumId || '',
                    albumName: item.Album || '',
                }
            ], 0, true);
        }
    };

    const aspectClass =
        posterAspectRatio === 'square'
            ? 'aspect-square'
            : posterAspectRatio === '16/9'
              ? 'aspect-[16/9]'
              : 'aspect-[2/3]';

    const itemPath = itemLink || (isDirectPlay ? `/play/${item.Id}` : `/item/${item.Id}`);

    const watched = item.UserData?.PlaybackPositionTicks ?? 0;
    const runtime = item.RunTimeTicks ?? 0;
    const progress = isDirectPlay
        ? item.UserData?.Played && watched <= 0
            ? 100
            : runtime > 0
              ? (watched / runtime) * 100
              : 0
        : 0;
    
    const cardContent = (
        <Link
            to={itemPath}
            key={item.Id}
            className="library-item-link p-0 m-0 group block outline-none focus:outline-none focus-visible:outline-none"
            onClick={handleClick}
        >
            <div
                className={cn("relative w-full overflow-hidden rounded-md", aspectClass)}
            >
                {!posterError ? (
                    <>
                        <img
                             key={item.Id}
                             src={posterUrl}
                             alt={item.Name || t('library:no_title')}
                             className={cn(
                                 'w-full h-full object-cover rounded-md transform-gpu will-change-transform z-10 poster-image',
                                 isImageLoaded
                                     ? 'blur-0 opacity-100 scale-100'
                                     : 'blur-md opacity-40 scale-95',
                                 isImageLoaded && 'group-hover:opacity-90 group-hover:scale-105 group-focus-within:opacity-90 group-focus-within:scale-105 group-focus:opacity-90 group-focus:scale-105'
                             )}
                             loading="lazy"
                             onLoad={() => setIsImageLoaded(true)}
                             onError={() => setPosterError(true)}
                        />
                        <Skeleton className="absolute bottom-0 left-0 right-0 top-0 -z-1" />
                        <div className="absolute inset-0 rounded-md pointer-events-none poster-card-outline z-20" />
                        {isDirectPlay && (
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-20">
                                <div
                                    className="bg-black/60 rounded-full p-4 cursor-pointer hover:bg-black/75"
                                    role="button"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        navigate(itemLink || `/play/${item.Id}`);
                                    }}
                                >
                                    <Play className="w-6 h-6 text-white fill-white" />
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center rounded-md">
                        <ImageOff className="text-4xl text-muted-foreground" />
                        <div className="absolute inset-0 rounded-md pointer-events-none poster-card-outline z-20" />
                    </div>
                )}
                <WatchedStateBadge item={item} show={config?.watchedStateBadgeLibrary || false} />
                
                {config?.showPosterTags !== false && (
                    <div className="absolute top-1.5 left-1.5 flex flex-col items-start gap-1.5 z-30 pointer-events-none drop-shadow-md">
                        {item.HasSubtitles && (
                            <span className="bg-black/70 backdrop-blur-sm text-white/90 text-[9px] font-bold px-1.5 py-0.5 rounded-[4px] border border-white/20 uppercase tracking-wider">
                                CC
                            </span>
                        )}
                        {item.MediaSources?.[0]?.MediaStreams?.some(s => s.Type === 'Video' && s.Height && s.Height >= 720) && (
                            <span className="bg-black/70 backdrop-blur-sm text-brand font-bold text-[9px] px-1.5 py-0.5 rounded-[4px] border border-brand/30 uppercase tracking-wider">
                                HD
                            </span>
                        )}
                        {item.OfficialRating && (
                            <span className="bg-black/70 backdrop-blur-sm text-white/90 text-[9px] font-bold px-1.5 py-0.5 rounded-[4px] border border-white/20 uppercase tracking-wider">
                                {item.OfficialRating}
                            </span>
                        )}
                    </div>
                )}
                {overlay}
                {progress > 0 && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700 z-20">
                        <div
                            style={{ width: `${progress}%` }}
                            className="h-full bg-brand transition-[width]"
                        />
                    </div>
                )}
            </div>
            <p className="mt-2 text-sm line-clamp-1 text-ellipsis break-all">
                {item.Name || t('library:no_title')}
            </p>
            <div className="flex flex-wrap items-center mt-0.5">
                <span className="text-xs text-muted-foreground mr-3 line-clamp-1 flex items-center gap-1">
                    {item.Type === 'Movie' && <Film className="w-3.5 h-3.5 shrink-0" />}
                    {item.Type === 'Series' && <Tv className="w-3.5 h-3.5 shrink-0" />}
                    {detailLine && <span>{detailLine}</span>}
                </span>
            </div>
        </Link>
    );

    return (
        <ItemContextMenu item={item}>
            {cardContent}
        </ItemContextMenu>
    );
};

export default LibraryItem;