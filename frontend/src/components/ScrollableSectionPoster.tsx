import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { Link } from 'react-router';
import { Skeleton } from './ui/skeleton';
import { getPrimaryImageUrl } from '@/utils/jellyfinUrls';
import { useConfig } from '@/hooks/api/useConfig';
import WatchedStateBadge from './WatchedStateBadge';
import { useState } from 'react';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import GenreOverlay from './GenreOverlay';
import PosterPlayButton from './PosterPlayButton';
import { useMusicPlayback } from '@/hooks/useMusicPlayback';
import ItemContextMenu from './ItemContextMenu';

interface ScrollableSectionPosterProps {
    item?: BaseItemDto;
    posterUrl?: string;
    children?: React.ReactNode;
    itemName?: string;
    itemId?: string;
    className?: string;
    showGenres?: boolean;
    showPlayButton?: boolean;
}

const ScrollableSectionPoster = ({
    item,
    posterUrl,
    children,
    itemName,
    itemId,
    className,
    showGenres = false,
    showPlayButton = false,
}: ScrollableSectionPosterProps) => {
    const { config } = useConfig();
    const { loadQueue } = useMusicPlayback();
    const [posterFailed, setPosterFailed] = useState(false);
    const [isImageLoaded, setIsImageLoaded] = useState(false);

    const isArtist = item?.Type === 'MusicArtist';
    const isSquareType =
        item?.Type === 'Playlist' ||
        item?.Type === 'MusicAlbum' ||
        item?.Type === 'Audio' ||
        isArtist;
    const posterClasses = isSquareType
        ? 'w-36 h-36 lg:w-44 lg:h-44 2xl:w-52 2xl:h-52'
        : 'w-36 h-54 lg:w-44 lg:h-64 2xl:w-52 2xl:h-80';
    const minPosterClasses = isSquareType
        ? 'min-w-36 lg:min-w-44 2xl:min-w-52 min-h-36 lg:min-h-44 2xl:min-h-52'
        : 'min-w-36 lg:min-w-44 2xl:min-w-52 min-h-54 lg:min-h-64 2xl:min-h-80';
    const skeletonClasses = isSquareType ? 'h-36 lg:h-44 2xl:h-52' : 'h-54 lg:h-64 2xl:h-80';
    const roundedClass = isArtist ? 'rounded-full' : 'rounded-md';

    const primaryImageTag = item?.ImageTags?.Primary;
    const targetImageId = item?.Type === 'Audio' && item.AlbumId ? item.AlbumId : (itemId || item?.Id || '');
    const targetImageTag = item?.Type === 'Audio' && item.AlbumId ? undefined : primaryImageTag;

    const handleClick = (e: React.MouseEvent) => {
        if (item?.Type === 'Audio') {
            e.preventDefault();
            loadQueue([
                {
                    id: itemId || item.Id || '',
                    title: itemName || item.Name || '',
                    artist: item.AlbumArtist || (item.Artists && item.Artists[0]) || 'Unknown',
                    albumId: item.AlbumId || '',
                    albumName: item.Album || '',
                }
            ], 0, true);
        }
    };

    const posterContent = posterFailed ? (
        <Link
            to={`/item/${itemId || item?.Id}`}
            key={itemId || item?.Id}
            className={cn('group block outline-none focus:outline-none focus-visible:outline-none', className)}
            onClick={handleClick}
        >
            <div
                className={`relative overflow-hidden ${roundedClass} ${posterClasses} bg-muted flex items-center justify-center`}
            >
                <ImageOff className="text-muted-foreground" size={32} />
                <WatchedStateBadge
                    item={item}
                    show={config?.watchedStateBadgeHomeScreen || false}
                />
                <GenreOverlay item={item} show={showGenres && item?.Type !== 'Playlist' && item?.Type !== 'MusicAlbum' && item?.Type !== 'Audio'} />
                {!isArtist && (
                    <div className="absolute inset-0 rounded-md pointer-events-none poster-card-outline z-20" />
                )}
            </div>
            <p
                className={cn(
                    'mt-2 text-sm line-clamp-1 text-ellipsis break-all max-w-36 lg:max-w-44 2xl:max-w-52',
                    isArtist && 'text-center w-full'
                )}
            >
                {itemName || item?.Name || ''}
            </p>
            {children}
        </Link>
    ) : (
        <Link
            to={`/item/${itemId || item?.Id}`}
            key={itemId || item?.Id}
            className={cn('group block outline-none focus:outline-none focus-visible:outline-none', className)}
            onClick={handleClick}
        >
            <div className={`relative overflow-hidden ${roundedClass} ${posterClasses}`}>
                <img
                    key={itemId || item?.Id}
                    src={
                        posterUrl
                            ? posterUrl
                            : getPrimaryImageUrl(
                                  targetImageId,
                                  { width: 400 },
                                  targetImageTag
                              )
                    }
                    alt={itemName || item?.Name || ''}
                    className={cn(
                        minPosterClasses,
                        posterClasses,
                        'object-cover transform-gpu will-change-transform z-10',
                        roundedClass,
                        // Loading snap: no transition until image is ready, then hover effects are smooth
                        isImageLoaded
                            ? [
                                  'transition-[opacity,transform,scale] duration-[250ms] ease-out',
                                  'opacity-100 scale-100',
                                  'group-hover:opacity-90 group-hover:scale-105',
                                  'group-focus-within:opacity-90 group-focus-within:scale-105',
                              ].join(' ')
                            : // While loading: blurred/dim, NO transition (instant snap on load)
                              'opacity-40 scale-95 blur-sm'
                    )}
                    loading="lazy"
                    onLoad={() => setIsImageLoaded(true)}
                    onError={() => setPosterFailed(true)}
                />
                <Skeleton className={`absolute bottom-0 left-0 right-0 ${skeletonClasses} -z-1`} />
                <WatchedStateBadge
                    item={item}
                    show={config?.watchedStateBadgeHomeScreen || false}
                />
                
                {config?.showPosterTags !== false && (
                    <div className="absolute top-1.5 left-1.5 flex flex-col items-start gap-1.5 z-30 pointer-events-none drop-shadow-md">
                        {item?.HasSubtitles && (
                            <span className="bg-black/70 backdrop-blur-sm text-white/90 text-[9px] font-bold px-1.5 py-0.5 rounded-[4px] border border-white/20 uppercase tracking-wider">
                                CC
                            </span>
                        )}
                        {item?.MediaSources?.[0]?.MediaStreams?.some(s => s.Type === 'Video' && s.Height && s.Height >= 720) && (
                            <span className="bg-black/70 backdrop-blur-sm text-brand font-bold text-[9px] px-1.5 py-0.5 rounded-[4px] border border-brand/30 uppercase tracking-wider">
                                HD
                            </span>
                        )}
                        {item?.OfficialRating && (
                            <span className="bg-black/70 backdrop-blur-sm text-white/90 text-[9px] font-bold px-1.5 py-0.5 rounded-[4px] border border-white/20 uppercase tracking-wider">
                                {item.OfficialRating}
                            </span>
                        )}
                    </div>
                )}
                <GenreOverlay item={item} show={showGenres && item?.Type !== 'Playlist' && item?.Type !== 'MusicAlbum' && item?.Type !== 'Audio'} />
                {!isArtist && (
                    <div className={`absolute inset-0 ${roundedClass} pointer-events-none poster-card-outline z-20`} />
                )}

                {showPlayButton && (
                    <PosterPlayButton item={item} itemId={itemId} />
                )}
            </div>
            <p
                className={cn(
                    'mt-2 text-sm line-clamp-1 text-ellipsis break-all max-w-36 lg:max-w-44 2xl:max-w-52',
                    isArtist && 'text-center w-full'
                )}
            >
                {itemName || item?.Name || ''}
            </p>
            {children}
        </Link>
    );

    if (!item) return posterContent;

    return (
        <ItemContextMenu item={item}>
            {posterContent}
        </ItemContextMenu>
    );
};
export default ScrollableSectionPoster;
