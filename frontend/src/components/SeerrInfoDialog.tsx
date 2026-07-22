import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
    DialogHeader,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
    Loader2,
    Film,
    Tv,
    Layers,
    Play,
} from 'lucide-react';
import { getUsername, getPassword, setPassword } from '@/utils/localstorageCredentials';
import { useCurrentUser } from '@/hooks/api/useCurrentUser';
import { toast } from 'sonner';
import type { SeerrResult } from '@/hooks/api/useSeerrSearch';
import SeerrCollectionDialog from './SeerrCollectionDialog';

interface SeerrInfoDialogProps {
    item: SeerrResult;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onRequestOpen: () => void;
}

export default function SeerrInfoDialog({
    item,
    open,
    onOpenChange,
    onRequestOpen,
}: SeerrInfoDialogProps) {
    const [loading, setLoading] = useState(false);
    const [details, setDetails] = useState<any>(null);
    const [isCollectionOpen, setIsCollectionOpen] = useState(false);
    const [isUnauthorized, setIsUnauthorized] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');

    const { data: currentUser, isLoading: isUserLoading } = useCurrentUser();

    const fetchSeerr = async (path: string) => {
        const username = currentUser?.Name || getUsername() || '';
        const password = getPassword() || '';
        const response = await fetch(path, {
            headers: {
                'X-Seerr-Username': username,
                'X-Seerr-Password': password,
                'Content-Type': 'application/json',
            },
        });
        if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
        return response.json();
    };

    useEffect(() => {
        if (!open || isUserLoading || isUnauthorized) return;

        const loadDetails = async () => {
            setLoading(true);
            try {
                const detailData = await fetchSeerr(`/api/seerr/${item.mediaType}/${item.id}`);
                setDetails(detailData);
                setIsUnauthorized(false);
            } catch (error: any) {
                console.error('Failed to load Seerr details:', error);
                if (error.message?.includes('Unauthorized') || error.message?.includes('401')) {
                    setIsUnauthorized(true);
                } else {
                    toast.error('Failed to load media details from Seerr.');
                }
            } finally {
                setLoading(false);
            }
        };

        void loadDetails();
    }, [open, isUserLoading, item.id, item.mediaType, currentUser?.Name, isUnauthorized]);

    const isTv = item.mediaType === 'tv';
    const releaseDate = item.releaseDate || item.firstAirDate;
    const year = releaseDate ? new Date(releaseDate).getFullYear() : '';
    const title = item.title || item.name || 'No Title';
    const rating = details?.voteAverage ? (details.voteAverage).toFixed(1) : null;
    const collection = details?.collection || details?.belongsToCollection || details?.belongs_to_collection;

    const creators = details?.createdBy
        ?.map((c: any) => c.name)
        ?.join(', ');

    const directors = details?.credits?.crew
        ?.filter((c: any) => c.job === 'Director')
        ?.map((c: any) => c.name)
        ?.join(', ') || creators;

    const mainCast = details?.credits?.cast
        ?.slice(0, 5)
        ?.map((c: any) => c.name)
        ?.join(', ');

    const crewLabel = isTv ? 'Creator' : 'Director';
    
    // Find YouTube trailer
    const trailer = details?.relatedVideos?.find(
        (v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')
    );

    const backdropPath = details?.backdropPath || item.backdropPath;
    const backdropUrl = backdropPath 
        ? `https://image.tmdb.org/t/p/original${backdropPath}` 
        : item.posterPath 
            ? `https://image.tmdb.org/t/p/original${item.posterPath}` 
            : null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-full max-w-[calc(100vw-2rem)] md:max-w-3xl max-h-[85vh] overflow-y-auto p-6 bg-background border shadow-2xl">
                {/* Full Backdrop Background */}
                {backdropUrl && (
                    <div className="absolute inset-0 -z-10 select-none overflow-hidden rounded-lg pointer-events-none">
                        <img
                            src={backdropUrl}
                            alt=""
                            className="w-full h-full object-cover opacity-20 blur-3xl scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/20" />
                    </div>
                )}

                {isUnauthorized ? (
                    <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full gap-4 py-8 text-left">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold">Seerr Authentication Required</DialogTitle>
                            <DialogDescription className="text-sm text-muted-foreground mt-1">
                                Your Jellyfin password is required to retrieve media details from Seerr. 
                                Enter your password below to authorize requests.
                            </DialogDescription>
                        </DialogHeader>
                        <form 
                            onSubmit={(e) => {
                                e.preventDefault();
                                if (passwordInput) {
                                    setPassword(passwordInput);
                                    if (currentUser?.Name) {
                                        localStorage.setItem('jf_username', currentUser.Name);
                                    }
                                    setIsUnauthorized(false);
                                }
                            }} 
                            className="flex flex-col gap-4 mt-2"
                        >
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-semibold text-muted-foreground">Jellyfin Password</label>
                                <Input
                                    type="password"
                                    placeholder="Enter password"
                                    value={passwordInput}
                                    onChange={(e) => setPasswordInput(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-2">
                                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit">
                                    Authorize
                                </Button>
                            </div>
                        </form>
                    </div>
                ) : loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <span>Loading details from Seerr...</span>
                    </div>
                ) : (
                    <>
                        {/* Title overlay */}
                        <div className="flex flex-col gap-1 text-left mb-4 shrink-0 pr-8">
                            <span className="text-xs font-semibold tracking-wider text-primary uppercase flex items-center gap-1.5">
                                {isTv ? <Tv className="h-3.5 w-3.5" /> : <Film className="h-3.5 w-3.5" />}
                                {isTv ? 'TV Series' : 'Movie'}
                            </span>
                            <DialogTitle className="text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground line-clamp-2">
                                {title}
                                {year && <span className="text-muted-foreground font-normal ml-2">({year})</span>}
                            </DialogTitle>
                            <DialogDescription className="hidden">Details for {title}</DialogDescription>
                        </div>

                        <div className="flex flex-col md:flex-row gap-6">
                            {/* Left column: Poster */}
                            <div className="w-full md:w-48 shrink-0 flex flex-col items-center md:items-start gap-4">
                                {item.posterPath && (
                                    <img
                                        src={`https://image.tmdb.org/t/p/w300${item.posterPath}`}
                                        alt={title}
                                        className="w-40 md:w-full rounded-lg object-cover border bg-muted shadow-md"
                                    />
                                )}

                                {/* Release Status */}
                                {details?.status && (
                                    <Badge variant="outline" className="font-medium bg-muted/40 px-2.5 py-0.5 border">
                                        {details.status}
                                    </Badge>
                                )}

                                {/* Collection section */}
                                {collection && (
                                    <div className="flex flex-col gap-2.5 p-3 rounded-lg border bg-primary/5 border-primary/10 mt-1 w-full text-center md:text-left">
                                        <div>
                                            <h4 className="text-xs font-bold text-foreground flex items-center justify-center md:justify-start gap-1.5 uppercase tracking-wide">
                                                <Layers className="h-3.5 w-3.5 text-primary" />
                                                Collection
                                            </h4>
                                            <p className="text-[11px] text-muted-foreground mt-1 leading-normal">
                                                Part of the <strong>{collection.name}</strong>.
                                            </p>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={() => setIsCollectionOpen(true)}
                                            className="w-full gap-1.5 font-semibold text-xs h-8"
                                        >
                                            <Layers className="h-3.5 w-3.5" />
                                            View Collection
                                        </Button>
                                        
                                        <SeerrCollectionDialog
                                            collectionId={collection.id}
                                            open={isCollectionOpen}
                                            onOpenChange={setIsCollectionOpen}
                                        />
                                    </div>
                                )}
                                {/* Request Options Button */}
                                <Button onClick={onRequestOpen} className="w-full font-semibold gap-1.5 mt-2.5 h-9 text-xs cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-200 ease-out">
                                    <Play className="h-4 w-4 fill-current animate-pulse" />
                                    Request Options
                                </Button>
                            </div>

                            {/* Right column: Content Details */}
                            <div className="flex-1 flex flex-col gap-4 text-left">
                                {/* Rating with TMDB Logo */}
                                {rating && (
                                    <div className="flex items-center gap-2 text-sm font-semibold select-none">
                                        <img 
                                            src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_square_2-d537fb228cf3ded904ef09b136fe3fec72548ebc1fea3fbbd1ad9e36364db38b.svg" 
                                            alt="TMDB" 
                                            className="h-4.5 w-4.5 rounded-sm shrink-0"
                                        />
                                        <span className="text-foreground">{rating} / 10</span>
                                        {details?.voteCount && (
                                            <span className="text-xs text-muted-foreground font-normal">
                                                ({details.voteCount} votes)
                                            </span>
                                        )}
                                    </div>
                                )}

                                {/* Genres */}
                                {details?.genres && details.genres.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                        {details.genres.map((g: any) => (
                                            <Badge key={g.id} variant="secondary" className="px-2 py-0.5 text-xs font-semibold">
                                                {g.name}
                                            </Badge>
                                        ))}
                                    </div>
                                )}

                                {/* Crew Info */}
                                {(directors || mainCast) && (
                                    <div className="flex flex-col gap-1.5 text-xs border-y py-2.5 my-1 bg-muted/5 border-border/40">
                                        {directors && (
                                            <div className="flex gap-2">
                                                <span className="font-semibold text-muted-foreground min-w-[70px]">{crewLabel}:</span>
                                                <span className="text-foreground">{directors}</span>
                                            </div>
                                        )}
                                        {mainCast && (
                                            <div className="flex gap-2">
                                                <span className="font-semibold text-muted-foreground min-w-[70px]">Cast:</span>
                                                <span className="text-foreground line-clamp-1">{mainCast}</span>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Overview */}
                                <div className="flex flex-col gap-1.5">
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Overview</h3>
                                    <p className="text-sm text-foreground leading-relaxed">
                                        {details?.overview || item.overview || 'No description available.'}
                                    </p>
                                </div>



                                {/* Trailer Player */}
                                {trailer && (
                                    <div className="flex flex-col gap-2 mt-2">
                                        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                            <Play className="h-4 w-4" />
                                            Trailer
                                        </h3>
                                        <div className="relative w-full aspect-video rounded-lg overflow-hidden border bg-muted shadow-inner">
                                            <iframe
                                                src={`https://www.youtube.com/embed/${trailer.key}?rel=0`}
                                                title={trailer.name}
                                                className="absolute inset-0 w-full h-full border-0"
                                                allowFullScreen
                                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
