import type { GenreWithItem } from '@/hooks/api/genres/useGenresWithItems';
import { getPrimaryImageUrl } from '@/utils/jellyfinUrls';
import { useState } from 'react';
import { Link } from 'react-router';
import { Skeleton } from './ui/skeleton';
import { ImageOff } from 'lucide-react';
import { cn } from '@/lib/utils';

const GenreItem = ({
    genreWithItem,
    className,
    titleClassName,
}: {
    genreWithItem: GenreWithItem;
    className?: string;
    titleClassName?: string;
}) => {
    const [posterError, setPosterError] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const posterUrl = getPrimaryImageUrl(genreWithItem.item?.Id || '', {
        maxWidth: 416,
        maxHeight: 640,
    });

    return (
        <Link
            to={`/item/${genreWithItem.id}`}
            key={genreWithItem.id}
            className={cn('p-0 m-0 group block cursor-pointer', className)}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <div className="relative w-full aspect-video overflow-hidden rounded-md bg-muted">
                {!posterError ? (
                    <>
                        <img
                            src={posterUrl}
                            alt={genreWithItem.item?.Name || 'No Title'}
                            className={cn(
                                'absolute inset-0 w-full h-full object-cover transition-all duration-500 ease-out',
                                isHovered
                                    ? 'scale-108 grayscale-0 opacity-100'
                                    : 'scale-100 grayscale opacity-80'
                             )}
                            loading="lazy"
                            onError={() => setPosterError(true)}
                        />
                        <Skeleton className="absolute inset-0 -z-10" />
                    </>
                ) : (
                    <div className="absolute inset-0 bg-muted flex items-center justify-center rounded-md">
                        <ImageOff className="text-4xl text-muted-foreground" />
                    </div>
                )}

                <div
                    className="absolute inset-0 rounded-md z-10 transition-all duration-500 ease-out"
                    style={{
                        backgroundColor: genreWithItem.tint,
                        opacity: isHovered ? 0.05 : 0.35,
                    }}
                />

                <div className="absolute inset-0 z-20 rounded-md bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

                <div className="absolute bottom-3 left-3 right-3 z-30">
                    <p
                        className={cn(
                            'text-xl sm:text-2xl font-bold text-white drop-shadow-md transition-transform duration-300 ease-out line-clamp-2',
                            isHovered ? 'translate-x-1.5' : 'translate-x-0',
                            titleClassName
                        )}
                    >
                        {genreWithItem.name}
                    </p>
                </div>

                <div className="absolute inset-0 rounded-md pointer-events-none poster-card-outline z-40" />
            </div>
        </Link>
    );
};

export default GenreItem;
