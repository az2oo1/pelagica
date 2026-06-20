import { Skeleton } from '@/components/ui/skeleton';
import { getPrimaryImageUrl } from '@/utils/jellyfinUrls';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { Music } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/utils';
import { useMusicPlayback } from '@/hooks/useMusicPlayback';
import ItemContextMenu from '@/components/ItemContextMenu';

interface MusicGridProps {
    items: BaseItemDto[];
}
const MusicItem = ({ item }: { item: BaseItemDto }) => {
    const { loadQueue } = useMusicPlayback();
    const [posterError, setPosterError] = useState(false);
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    const targetImageId = item.Type === 'Audio' && item.AlbumId ? item.AlbumId : (item.Id || '');
    const targetImageTag = item.Type === 'Audio' && item.AlbumId ? undefined : item.ImageTags?.Primary;
    const posterUrl = getPrimaryImageUrl(targetImageId, undefined, targetImageTag);

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

    return (
        <ItemContextMenu item={item}>
            <Link
                to={`/item/${item.Id}`}
                key={item.Id}
                className="p-0 m-0"
                onClick={handleClick}
            >
                <div className="relative w-full aspect-square overflow-hidden rounded-md group">
                    {!posterError ? (
                        <>
                            <img
                                key={item.Id}
                                src={`${posterUrl}&maxWidth=300&maxHeight=300&quality=85`}
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
                            <Music className="text-4xl text-muted-foreground" />
                            <div className="absolute inset-0 rounded-md pointer-events-none poster-card-outline z-20" />
                        </div>
                    )}
                </div>
                <p className="mt-2 text-sm line-clamp-1 text-ellipsis break-all">
                    {item.Name || 'No Title'}
                </p>
                {item.Artists && item.Artists.length > 0 && (
                    <p className="text-xs text-muted-foreground line-clamp-1">
                        {item.Artists.join(', ')}
                    </p>
                )}
            </Link>
        </ItemContextMenu>
    );
};

const MusicGrid = ({ items }: MusicGridProps) => (
    <div className="w-full gap-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-8">
        {items.map((item) => (
            <MusicItem key={item.Id} item={item} />
        ))}
    </div>
);

export default MusicGrid;
