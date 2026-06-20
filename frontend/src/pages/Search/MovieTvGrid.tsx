import { Skeleton } from '@/components/ui/skeleton';
import { getPrimaryImageUrl } from '@/utils/jellyfinUrls';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { ImageOff, Film, Tv } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import WatchedStateBadge from '@/components/WatchedStateBadge';
import { useConfig } from '@/hooks/api/useConfig';
import { cn } from '@/lib/utils';
import ItemContextMenu from '@/components/ItemContextMenu';

interface MovieTvGridProps {
    items: BaseItemDto[];
}

const MovieTvItem = ({ item }: { item: BaseItemDto }) => {
    const { config } = useConfig();
    const [posterError, setPosterError] = useState(false);
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    const posterUrl = getPrimaryImageUrl(item.Id || '', undefined, item.ImageTags?.Primary);

    return (
        <ItemContextMenu item={item}>
            <Link to={`/item/${item.Id}`} key={item.Id} className="p-0 m-0">
                <div
                    className="relative w-full aspect-[2/3] overflow-hidden rounded-md group"
                >
                    {!posterError ? (
                        <>
                            <img
                                key={item.Id}
                                src={`${posterUrl}&maxWidth=416&maxHeight=640&quality=85`}
                                alt={item.Name || 'No Title'}
                                className={cn(
                                    'w-full h-full object-cover rounded-md z-10 poster-image transition-[opacity,transform,scale] duration-[250ms] ease-out',
                                    isImageLoaded
                                        ? 'opacity-100 scale-100'
                                        : 'opacity-0 scale-95',
                                    isImageLoaded && 'group-hover:opacity-90 group-hover:scale-105'
                                )}
                                loading="lazy"
                                onLoad={() => setIsImageLoaded(true)}
                                onError={() => setPosterError(true)}
                            />
                            <Skeleton className="absolute bottom-0 left-0 right-0 top-0 -z-1" />
                            <div className="absolute inset-0 rounded-md pointer-events-none poster-card-outline z-20" />
                        </>
                    ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center rounded-md">
                            <ImageOff className="text-4xl text-muted-foreground" />
                            <div className="absolute inset-0 rounded-md pointer-events-none poster-card-outline z-20" />
                        </div>
                    )}
                    <WatchedStateBadge item={item} show={config?.watchedStateBadgeSearch || false} />
                </div>
                <p className="mt-2 text-sm line-clamp-1 text-ellipsis break-all">
                    {item.Name || 'No Title'}
                </p>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    {item.Type === 'Movie' && <Film className="w-3.5 h-3.5 shrink-0" />}
                    {item.Type === 'Series' && <Tv className="w-3.5 h-3.5 shrink-0" />}
                    <span>{item.PremiereDate ? new Date(item.PremiereDate).getFullYear() : ''}</span>
                </div>
            </Link>
        </ItemContextMenu>
    );
};

const MovieTvGrid = ({ items }: MovieTvGridProps) => (
    <div className="w-full gap-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-9">
        {items.map((item) => (
            <MovieTvItem key={item.Id} item={item} />
        ))}
    </div>
);

export default MovieTvGrid;
