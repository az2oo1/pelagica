import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogTitle,
    DialogDescription,
    DialogHeader,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, Layers, Film } from 'lucide-react';
import { getUsername, getPassword, setPassword } from '@/utils/localstorageCredentials';
import { useCurrentUser } from '@/hooks/api/useCurrentUser';
import { toast } from 'sonner';

interface SeerrCollectionDialogProps {
    collectionId: number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const getStatusDetails = (status?: number) => {
    switch (status) {
        case 2:
            return { text: 'Pending', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' };
        case 3:
            return { text: 'Processing', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' };
        case 4:
            return { text: 'Partially Available', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' };
        case 5:
            return { text: 'Available', color: 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' };
        default:
            return null;
    }
};

const CollectionMovieItem = ({
    movie,
    isChecked,
    onToggle,
    requestable
}: {
    movie: any;
    isChecked: boolean;
    onToggle: () => void;
    requestable: boolean;
}) => {
    const posterUrl = movie.posterPath ? `https://image.tmdb.org/t/p/w185${movie.posterPath}` : null;
    const title = movie.title || 'No Title';
    const releaseYear = movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : '';
    const statusDetails = getStatusDetails(movie.mediaInfo?.status);

    return (
        <div
            className={`group flex flex-col gap-1 text-left ${requestable ? 'cursor-pointer' : 'cursor-default'}`}
            onClick={() => {
                if (requestable) {
                    onToggle();
                }
            }}
        >
            <div className="relative aspect-[2/3] w-full overflow-hidden rounded-md border bg-muted shadow-sm transition-transform duration-200 group-hover:scale-[1.02]">
                {/* Poster Image */}
                {posterUrl ? (
                    <img
                        src={posterUrl}
                        alt={title}
                        className="w-full h-full object-cover rounded-md"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted text-muted-foreground">
                        <Film className="w-6 h-6" />
                    </div>
                )}

                {/* Overlaid Checkbox (top-left) */}
                {requestable && (
                    <div className="absolute top-1.5 left-1.5 z-30 drop-shadow-md">
                        <Checkbox
                            checked={isChecked}
                            onCheckedChange={onToggle}
                            onClick={(e) => e.stopPropagation()}
                            className="h-4.5 w-4.5 border-white bg-black/60 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                    </div>
                )}

                {/* Status Badge (top-right) */}
                {statusDetails && (
                    <Badge variant="secondary" className={`absolute top-1.5 right-1.5 z-30 font-medium text-[9px] px-1 py-0.2 border shadow-sm ${statusDetails.color}`}>
                        {statusDetails.text}
                    </Badge>
                )}

                {/* Darken/Active Overlay when selected */}
                {isChecked && (
                    <div className="absolute inset-0 bg-primary/10 border-2 border-primary rounded-md z-20 pointer-events-none" />
                )}
            </div>

            <p className="mt-1 text-[11px] font-semibold line-clamp-1 text-ellipsis break-all group-hover:text-primary transition-colors leading-tight">
                {title}
            </p>
            <p className="text-[10px] text-muted-foreground">
                {releaseYear}
            </p>
        </div>
    );
};

export default function SeerrCollectionDialog({
    collectionId,
    open,
    onOpenChange,
}: SeerrCollectionDialogProps) {
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [details, setDetails] = useState<any>(null);
    const [isUnauthorized, setIsUnauthorized] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');
    const [selectedIds, setSelectedIds] = useState<number[]>([]);

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

    const postSeerr = async (path: string, body: any) => {
        const username = currentUser?.Name || getUsername() || '';
        const password = getPassword() || '';
        const response = await fetch(path, {
            method: 'POST',
            headers: {
                'X-Seerr-Username': username,
                'X-Seerr-Password': password,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        });
        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.error || errData.message || `Request failed: ${response.statusText}`);
        }
        return response.json();
    };

    useEffect(() => {
        if (!open || isUserLoading || isUnauthorized) return;

        const loadDetails = async () => {
            setLoading(true);
            try {
                const data = await fetchSeerr(`/api/seerr/collection/${collectionId}`);
                setDetails(data);
                setIsUnauthorized(false);
                setSelectedIds([]);
            } catch (error: any) {
                console.error('Failed to load collection details:', error);
                if (error.message?.includes('Unauthorized') || error.message?.includes('401')) {
                    setIsUnauthorized(true);
                } else {
                    toast.error('Failed to load collection details from Seerr.');
                }
            } finally {
                setLoading(false);
            }
        };

        void loadDetails();
    }, [open, isUserLoading, collectionId, currentUser?.Name, isUnauthorized]);

    const title = details?.name || 'Collection';
    const movies = details?.parts?.map((p: any) => ({
        ...p,
        mediaType: p.mediaType || 'movie',
    })) || [];

    const isRequestable = (movie: any) => {
        const status = movie.mediaInfo?.status;
        return !status || (status !== 2 && status !== 3 && status !== 4 && status !== 5);
    };

    const requestableMovies = movies.filter(isRequestable);
    const allSelected = requestableMovies.length > 0 && selectedIds.length === requestableMovies.length;

    const handleSelectAllToggle = () => {
        if (allSelected) {
            setSelectedIds([]);
        } else {
            setSelectedIds(requestableMovies.map((m: any) => m.id));
        }
    };

    const toggleSelect = (movieId: number) => {
        setSelectedIds(prev =>
            prev.includes(movieId)
                ? prev.filter(id => id !== movieId)
                : [...prev, movieId]
        );
    };

    const handleRequestSelected = async () => {
        setSubmitting(true);
        try {
            const promises = selectedIds.map(id =>
                postSeerr('/api/seerr/request', {
                    mediaType: 'movie',
                    mediaId: id,
                    is4k: false
                })
            );
            await Promise.all(promises);
            toast.success(`Successfully submitted requests for ${selectedIds.length} movie(s)!`);

            // Re-fetch details to show updated statuses
            const data = await fetchSeerr(`/api/seerr/collection/${collectionId}`);
            setDetails(data);
            setSelectedIds([]);
        } catch (error: any) {
            console.error('Request failed:', error);
            toast.error(error.message || 'Failed to submit requests.');
        } finally {
            setSubmitting(false);
        }
    };

    const backdropUrl = details?.backdropPath
        ? `https://image.tmdb.org/t/p/original${details.backdropPath}`
        : null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-full max-w-[calc(100vw-2rem)] md:max-w-2xl max-h-[85vh] overflow-y-auto p-6 bg-background border shadow-2xl">
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
                                Your Jellyfin password is required to retrieve collection details from Seerr.
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
                        <span>Loading collection movies...</span>
                    </div>
                ) : (
                    <>
                        <DialogHeader className="flex flex-col gap-1 text-left mb-4 shrink-0 pr-8">
                            <span className="text-xs font-semibold tracking-wider text-primary uppercase flex items-center gap-1.5">
                                <Layers className="h-3.5 w-3.5" />
                                Collection
                            </span>
                            <DialogTitle className="text-xl sm:text-2xl font-extrabold tracking-tight text-foreground line-clamp-1">
                                {title}
                            </DialogTitle>
                            <DialogDescription className="hidden">Movies in {title}</DialogDescription>
                        </DialogHeader>

                        <div className="flex-1 flex flex-col min-h-0 gap-4 text-left">
                            {details?.overview && (
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {details.overview}
                                </p>
                            )}

                            {/* Movies Grid */}
                            <div className="flex-1 flex flex-col min-h-0 gap-2">
                                <div className="flex justify-between items-center px-1 shrink-0">
                                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                        Movies in Collection ({movies.length})
                                    </h3>
                                    {requestableMovies.length > 0 && (
                                        <div
                                            className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-muted-foreground hover:text-foreground"
                                            onClick={handleSelectAllToggle}
                                        >
                                            <Checkbox
                                                id="select-all"
                                                checked={allSelected}
                                                className="pointer-events-none"
                                            />
                                            <label htmlFor="select-all" className="cursor-pointer">
                                                Select All Requestable ({requestableMovies.length})
                                            </label>
                                        </div>
                                    )}
                                </div>

                                {movies.length === 0 ? (
                                    <span className="text-sm text-muted-foreground">No movies found in this collection.</span>
                                ) : (
                                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-4 mt-2">
                                        {movies.map((movie: any) => (
                                            <CollectionMovieItem
                                                key={movie.id}
                                                movie={movie}
                                                isChecked={selectedIds.includes(movie.id)}
                                                onToggle={() => toggleSelect(movie.id)}
                                                requestable={isRequestable(movie)}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Footer Controls */}
                        <div className="shrink-0 flex justify-end gap-3 mt-4 border-t pt-4 bg-transparent">
                            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
                                Close
                            </Button>
                            <Button
                                onClick={handleRequestSelected}
                                disabled={submitting || selectedIds.length === 0}
                                className="px-6 font-semibold cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-200 ease-out"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                                        Submitting...
                                    </>
                                ) : (
                                    `Request Selected (${selectedIds.length})`
                                )}
                            </Button>
                        </div>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
}
