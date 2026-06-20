import { Skeleton } from '@/components/ui/skeleton';
import { getPrimaryImageUrl } from '@/utils/jellyfinUrls';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { ImageOff } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/utils';
import ItemContextMenu from '@/components/ItemContextMenu';

interface EpisodesGridProps {
    items: BaseItemDto[];
}

const EpisodeItem = ({ item }: { item: BaseItemDto }) => {
    const [posterError, setPosterError] = useState(false);
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    const posterUrl = getPrimaryImageUrl(item.Id || '', undefined, item.ImageTags?.Primary);

    return (
        <ItemContextMenu item={item}>
            <Link to={`/item/${item.Id}`} key={item.Id} className="p-0 m-0">
                <div className="relative w-full aspect-video overflow-hidden rounded-md group">
                    {!posterError ? (
                        <>
                            <img
                                key={item.Id}
                                src={`${posterUrl}&maxWidth=416&maxHeight=234&quality=85`}
                                alt={item.Name || 'No Title'}
                                className={cn(
                                    'w-full h-full object-cover rounded-md transform-gpu will-change-transform z-10 poster-image',
                                    isImageLoaded
                                        ? 'blur-0 opacity-100 scale-100'
                                        : 'blur-md opacity-40 scale-95',
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
                </div>
                <p className="mt-2 text-sm line-clamp-1 text-ellipsis break-all">
                    {item.Name || 'No Title'}
                </p>
                <p className="text-xs text-muted-foreground">{item.SeriesName}</p>
            </Link>
        </ItemContextMenu>
    );
};

const EpisodesGrid = ({ items }: EpisodesGridProps) => (
    <div className="w-full gap-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
        {items.map((item) => (
            <EpisodeItem key={item.Id} item={item} />
        ))}
    </div>
);

export default EpisodesGrid;
