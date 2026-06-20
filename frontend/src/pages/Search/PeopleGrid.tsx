import { Skeleton } from '@/components/ui/skeleton';
import { getPrimaryImageUrl } from '@/utils/jellyfinUrls';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { User } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/utils';
import ItemContextMenu from '@/components/ItemContextMenu';

interface PeopleGridProps {
    items: BaseItemDto[];
}

const PersonItem = ({ item }: { item: BaseItemDto }) => {
    const [posterError, setPosterError] = useState(false);
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    const posterUrl = getPrimaryImageUrl(item.Id || '', undefined, item.ImageTags?.Primary);

    return (
        <ItemContextMenu item={item}>
            <Link to={`/person/${item.Id}`} key={item.Id} className="p-0 m-0">
                <div className="relative w-full aspect-square overflow-hidden rounded-full group">
                    {!posterError ? (
                        <>
                            <img
                                key={item.Id}
                                src={`${posterUrl}&maxWidth=300&maxHeight=300&quality=85`}
                                alt={item.Name || 'No Title'}
                                className={cn(
                                    'w-full h-full object-cover rounded-full transform-gpu will-change-transform z-10 poster-image',
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
                            <div className="absolute inset-0 rounded-full pointer-events-none poster-card-outline z-20" />
                        </>
                    ) : (
                        <div className="w-full h-full bg-muted flex items-center justify-center rounded-full">
                            <User className="text-4xl text-muted-foreground" />
                            <div className="absolute inset-0 rounded-full pointer-events-none poster-card-outline z-20" />
                        </div>
                    )}
                </div>
                <p className="mt-2 text-sm line-clamp-1 text-ellipsis break-all text-center">
                    {item.Name || 'No Title'}
                </p>
            </Link>
        </ItemContextMenu>
    );
};

const PeopleGrid = ({ items }: PeopleGridProps) => (
    <div className="w-full gap-4 grid grid-cols-3 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-7 xl:grid-cols-9 2xl:grid-cols-11">
        {items.map((item) => (
            <PersonItem key={item.Id} item={item} />
        ))}
    </div>
);

export default PeopleGrid;
