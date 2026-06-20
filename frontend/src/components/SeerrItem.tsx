import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageOff, Film, Tv, User, Play } from 'lucide-react';
import type { SeerrResult } from '@/hooks/api/useSeerrSearch';
import { useConfig } from '@/hooks/api/useConfig';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import SeerrRequestDialog from './SeerrRequestDialog';
import SeerrInfoDialog from './SeerrInfoDialog';
import { Button } from './ui/button';

interface SeerrItemProps {
    item: SeerrResult;
}

const getStatusBadge = (status?: number) => {
    switch (status) {
        case 2:
            return <Badge variant="secondary" className="absolute top-2 right-2 z-30 font-medium">Requested</Badge>;
        case 3:
            return <Badge variant="secondary" className="absolute top-2 right-2 z-30 font-medium">Processing</Badge>;
        case 4:
            return <Badge variant="default" className="absolute top-2 right-2 z-30 font-medium">Partially Available</Badge>;
        case 5:
            return <Badge variant="default" className="absolute top-2 right-2 z-30 font-medium">Available</Badge>;
        default:
            return null;
    }
};

export default function SeerrItem({ item }: SeerrItemProps) {
    const { config } = useConfig();
    const [posterError, setPosterError] = useState(false);
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    const [isRequestOpen, setIsRequestOpen] = useState(false);
    const [isInfoOpen, setIsInfoOpen] = useState(false);
    
    const imagePath = item.posterPath || item.profilePath;
    const posterUrl = imagePath ? `https://image.tmdb.org/t/p/w300${imagePath}` : null;
    const posterAspectRatio = '2/3';

    const title = item.title || item.name || 'No Title';
    const releaseYear = item.releaseDate 
        ? new Date(item.releaseDate).getFullYear() 
        : item.firstAirDate 
            ? new Date(item.firstAirDate).getFullYear() 
            : '';

    const seerrLink = config?.seerrUrl ? `${config.seerrUrl}/${item.mediaType}/${item.id}` : '#';

    if (item.mediaType === 'person') {
        return (
            <a 
                href={seerrLink} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="p-0 m-0 group relative text-left block cursor-pointer"
            >
                <div className="p-0 m-0 text-left">
                    <div className={cn("relative w-full overflow-hidden rounded-md group", `aspect-[${posterAspectRatio}]`)}>
                        {posterUrl && !posterError ? (
                            <>
                                <img
                                    src={posterUrl}
                                    alt={title}
                                    className={cn(
                                        'w-full h-full object-cover rounded-md z-10 poster-image transition-all duration-300',
                                        isImageLoaded
                                            ? 'blur-0 opacity-100 scale-100'
                                            : 'opacity-0 scale-95',
                                        isImageLoaded && 'group-hover:scale-105'
                                    )}
                                    loading="lazy"
                                    onLoad={() => setIsImageLoaded(true)}
                                    onError={() => setPosterError(true)}
                                />
                                <Skeleton className="absolute bottom-0 left-0 right-0 top-0 -z-1" />
                                <div className="absolute inset-0 rounded-md pointer-events-none poster-card-outline z-30" />
                            </>
                        ) : (
                            <div className="w-full h-full aspect-[2/3] bg-muted flex items-center justify-center rounded-md">
                                <User className="text-4xl text-muted-foreground" />
                                <div className="absolute inset-0 rounded-md pointer-events-none poster-card-outline z-30" />
                            </div>
                        )}
                    </div>
                    <p className="mt-2 text-sm line-clamp-1 text-ellipsis break-all group-hover:text-primary transition-colors font-medium">
                        {title}
                    </p>
                </div>
            </a>
        );
    }

    return (
        <>
            <div 
                className="p-0 m-0 group relative text-left cursor-pointer"
                onClick={() => setIsInfoOpen(true)}
            >
                <div
                    className={cn("relative w-full overflow-hidden rounded-md group", `aspect-[${posterAspectRatio}]`)}
                >
                    {getStatusBadge(item.mediaInfo?.status)}
                    
                    {posterUrl && !posterError ? (
                        <>
                            <img
                                src={posterUrl}
                                alt={title}
                                className={cn(
                                    'w-full h-full object-cover rounded-md transform-gpu will-change-transform z-10 poster-image transition-all duration-300',
                                    isImageLoaded ? 'blur-0 opacity-100 scale-100' : 'blur-md opacity-40 scale-95',
                                    isImageLoaded && 'group-hover:scale-105'
                                )}
                                loading="lazy"
                                  onLoad={() => setIsImageLoaded(true)}
                                  onError={() => setPosterError(true)}
                            />
                            <Skeleton className="absolute bottom-0 left-0 right-0 top-0 -z-1" />
                            <div className="absolute inset-0 rounded-md pointer-events-none poster-card-outline z-30" />
                        </>
                    ) : (
                        <div className="w-full h-full aspect-[2/3] bg-muted flex items-center justify-center rounded-md">
                            <ImageOff className="text-4xl text-muted-foreground" />
                            <div className="absolute inset-0 rounded-md pointer-events-none poster-card-outline z-30" />
                        </div>
                    )}
                    
                    {/* Hover Button Overlay */}
                    <div className="absolute inset-x-0 bottom-0 top-1/2 bg-gradient-to-t from-black/85 via-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 flex items-end justify-center pb-3 px-3 rounded-b-md">
                        <Button
                            size="sm"
                            className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold gap-1 px-3 shadow-lg scale-95 group-hover:scale-100 transition-all duration-300 border-0 text-[11px] h-7"
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsRequestOpen(true);
                            }}
                        >
                            <Play className="h-3 w-3 fill-current animate-pulse" />
                            Request
                        </Button>
                    </div>
                </div>
                
                <p className="mt-2 text-sm line-clamp-1 text-ellipsis break-all group-hover:text-primary transition-colors font-medium">
                    {title}
                </p>
                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    {item.mediaType === 'movie' && <Film className="w-3.5 h-3.5 shrink-0" />}
                    {item.mediaType === 'tv' && <Tv className="w-3.5 h-3.5 shrink-0" />}
                    <span>{releaseYear}</span>
                </div>
            </div>

            {/* Info Dialog */}
            <SeerrInfoDialog
                item={item}
                open={isInfoOpen}
                onOpenChange={setIsInfoOpen}
                onRequestOpen={() => {
                    setIsInfoOpen(false);
                    setIsRequestOpen(true);
                }}
            />

            {/* Quick Request Dialog */}
            <SeerrRequestDialog
                item={item}
                open={isRequestOpen}
                onOpenChange={setIsRequestOpen}
            />
        </>
    );
}
