import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Loader2,
    Film,
    Tv,
    Settings,
    Info,
} from 'lucide-react';
import { getUsername, getPassword, setPassword } from '@/utils/localstorageCredentials';
import { useCurrentUser } from '@/hooks/api/useCurrentUser';
import { toast } from 'sonner';
import type { SeerrResult } from '@/hooks/api/useSeerrSearch';
import { Badge } from '@/components/ui/badge';

interface SeerrRequestDialogProps {
    item: SeerrResult;
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
}

const getStatusDetails = (status?: number) => {
    switch (status) {
        case 2:
            return { text: 'Pending Approval', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' };
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

export default function SeerrRequestDialog({ 
    item, 
    trigger, 
    open: controlledOpen, 
    onOpenChange: controlledOnOpenChange 
}: SeerrRequestDialogProps) {
    const [localOpen, setLocalOpen] = useState(false);
    const open = controlledOpen !== undefined ? controlledOpen : localOpen;
    const setOpen = (val: boolean) => {
        if (controlledOnOpenChange) {
            controlledOnOpenChange(val);
        } else {
            setLocalOpen(val);
        }
    };
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [details, setDetails] = useState<any>(null);
    const [isUnauthorized, setIsUnauthorized] = useState(false);
    const [passwordInput, setPasswordInput] = useState('');

    // Request settings
    const [selectedSeasons, setSelectedSeasons] = useState<number[]>([]);
    const [is4k, setIs4k] = useState(false);

    // Admin configuration settings
    const [hasAdminAccess, setHasAdminAccess] = useState(false);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [servers, setServers] = useState<any[]>([]);
    const [selectedServerId, setSelectedServerId] = useState<string>('');
    const [profiles, setProfiles] = useState<any[]>([]);
    const [selectedProfileId, setSelectedProfileId] = useState<string>('');
    const [rootFolders, setRootFolders] = useState<any[]>([]);
    const [selectedRootFolder, setSelectedRootFolder] = useState<string>('');

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
                // 1. Fetch Movie/TV details
                const detailData = await fetchSeerr(`/api/seerr/${item.mediaType}/${item.id}`);
                setDetails(detailData);

                if (item.mediaType === 'tv' && detailData.seasons) {
                    // Pre-select all normal seasons (exclude specials/season 0 unless requested)
                    const normalSeasons = detailData.seasons
                        .filter((s: any) => s.seasonNumber > 0)
                        .map((s: any) => s.seasonNumber);
                    setSelectedSeasons(normalSeasons);
                }

                // 2. Fetch admin service settings (Radarr/Sonarr)
                const settingsPath = item.mediaType === 'movie' ? '/api/seerr/settings/radarr' : '/api/seerr/settings/sonarr';
                try {
                    const serversList = await fetchSeerr(settingsPath);
                    if (Array.isArray(serversList) && serversList.length > 0) {
                        setServers(serversList);
                        setHasAdminAccess(true);
                        
                        // Select default server
                        const defaultSrv = serversList.find((s: any) => s.isDefault) || serversList[0];
                        setSelectedServerId(String(defaultSrv.id));
                    }
                } catch (e) {
                    // Ignore error - means user is not an admin on Seerr
                    setHasAdminAccess(false);
                }
                setIsUnauthorized(false);
            } catch (error: any) {
                console.error('Failed to load Seerr request details:', error);
                if (error.message?.includes('Unauthorized') || error.message?.includes('401')) {
                    setIsUnauthorized(true);
                } else {
                    toast.error('Failed to load request options from Seerr.');
                }
            } finally {
                setLoading(false);
            }
        };

        void loadDetails();
    }, [open, isUserLoading, item.id, item.mediaType, currentUser?.Name, isUnauthorized]);

    // Load quality profiles and root folders from service when server changes
    useEffect(() => {
        if (!selectedServerId || !hasAdminAccess || isUserLoading) return;

        const loadProfilesAndFolders = async () => {
            const srvType = item.mediaType === 'movie' ? 'radarr' : 'sonarr';
            try {
                const data = await fetchSeerr(`/api/seerr/service/${srvType}/${selectedServerId}`);
                
                // Set profiles
                const profilesList = data.profiles || [];
                setProfiles(profilesList);
                if (profilesList.length > 0) {
                    const serverObj = servers.find((s: any) => String(s.id) === selectedServerId);
                    const defaultProfile = profilesList.find((p: any) => p.id === serverObj?.activeProfileId) || profilesList[0];
                    if (defaultProfile) {
                        setSelectedProfileId(String(defaultProfile.id));
                    }
                } else {
                    setSelectedProfileId('');
                }

                // Set root folders
                const foldersList = data.rootFolders || [];
                setRootFolders(foldersList);
                if (foldersList.length > 0) {
                    setSelectedRootFolder(foldersList[0].path);
                } else {
                    setSelectedRootFolder('');
                }
            } catch (error) {
                console.error('Failed to fetch service profiles/folders:', error);
                toast.error(`Failed to load quality profiles and root folders for ${srvType}.`);
            }
        };

        void loadProfilesAndFolders();
    }, [selectedServerId, hasAdminAccess, item.mediaType, servers, isUserLoading]);

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const payload: any = {
                mediaType: item.mediaType,
                mediaId: item.id,
                is4k,
            };

            if (item.mediaType === 'tv') {
                payload.seasons = selectedSeasons;
            }

            if (hasAdminAccess && selectedServerId) {
                payload.serverId = parseInt(selectedServerId, 10);
                if (selectedProfileId) {
                    payload.profileId = parseInt(selectedProfileId, 10);
                }
                if (selectedRootFolder) {
                    payload.rootFolder = selectedRootFolder;
                }
            }

            await postSeerr('/api/seerr/request', payload);
            toast.success('Media request successfully submitted!');
            setOpen(false);
        } catch (error: any) {
            console.error('Seerr request failed:', error);
            toast.error(error.message || 'Failed to submit request to Seerr.');
        } finally {
            setSubmitting(false);
        }
    };

    const statusObj = getStatusDetails(details?.mediaInfo?.status || item.mediaInfo?.status);
    const releaseDate = item.releaseDate || item.firstAirDate;
    const year = releaseDate ? new Date(releaseDate).getFullYear() : '';
    const title = item.title || item.name || 'No Title';

    const handleSeasonToggle = (seasonNum: number) => {
        setSelectedSeasons(prev =>
            prev.includes(seasonNum)
                ? prev.filter(s => s !== seasonNum)
                : [...prev, seasonNum].sort((a, b) => a - b)
        );
    };

    const selectAllSeasons = () => {
        if (!details?.seasons) return;
        const all = details.seasons
            .filter((s: any) => s.seasonNumber > 0)
            .map((s: any) => s.seasonNumber);
        setSelectedSeasons(all);
    };

    const clearAllSeasons = () => {
        setSelectedSeasons([]);
    };

    const handleSavePassword = (e: React.FormEvent) => {
        e.preventDefault();
        if (passwordInput) {
            setPassword(passwordInput);
            if (currentUser?.Name) {
                localStorage.setItem('jf_username', currentUser.Name);
            }
            setIsUnauthorized(false);
        }
    };

    const isTv = item.mediaType === 'tv';
    const isAlreadyAvailable = details?.mediaInfo?.status === 5;
    const isPending = details?.mediaInfo?.status === 2 || details?.mediaInfo?.status === 3;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            <DialogContent className="w-full max-w-[calc(100vw-2rem)] md:max-w-2xl max-h-[85vh] !flex !flex-col p-6 overflow-hidden">
                <DialogHeader className="shrink-0 mb-4">
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold">
                        {isTv ? <Tv className="h-5 w-5 text-primary" /> : <Film className="h-5 w-5 text-primary" />}
                        {title}
                        {year && <span className="text-muted-foreground font-normal">({year})</span>}
                    </DialogTitle>
                    <DialogDescription className="hidden">Request options for {title}</DialogDescription>
                </DialogHeader>

                {isUnauthorized ? (
                    <div className="flex-1 flex flex-col justify-center max-w-md mx-auto w-full gap-4 py-8 text-left">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Your Jellyfin password is required to retrieve request options from Seerr. 
                            Enter your password below to authorize requests.
                        </p>
                        <form onSubmit={handleSavePassword} className="flex flex-col gap-4 mt-2">
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
                                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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
                        <span>Loading request options from Seerr...</span>
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col min-h-0 gap-6">
                        {/* Summary & Overview */}
                        <div className="flex gap-4 items-start shrink-0">
                            {item.posterPath && (
                                <img
                                    src={`https://image.tmdb.org/t/p/w200${item.posterPath}`}
                                    alt={title}
                                    className="w-24 rounded-md object-cover border bg-muted shrink-0 shadow-sm"
                                />
                            )}
                            <div className="flex-1 flex flex-col min-w-0">
                                {statusObj && (
                                    <Badge variant="outline" className={`w-fit mb-2 font-medium px-2 py-0.5 border ${statusObj.color}`}>
                                        {statusObj.text}
                                    </Badge>
                                )}
                                <p className="text-sm text-muted-foreground line-clamp-4 leading-relaxed">
                                    {item.overview || details?.overview || 'No description available.'}
                                </p>
                            </div>
                        </div>

                        {/* Request parameters */}
                        <div className="flex-1 overflow-y-auto min-h-0 border rounded-md p-4 bg-muted/10 pr-2">
                            <div className="flex flex-col gap-5">
                                {/* TV Seasons Selection */}
                                {isTv && details?.seasons && (
                                    <div className="flex flex-col gap-2">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-sm font-semibold text-foreground">Select Seasons</span>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="ghost" className="h-7 text-xs px-2" onClick={selectAllSeasons}>
                                                    Select All
                                                </Button>
                                                <Button size="sm" variant="ghost" className="h-7 text-xs px-2 text-red-500 hover:text-red-600" onClick={clearAllSeasons}>
                                                    Clear All
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                            {details.seasons
                                                .filter((s: any) => s.seasonNumber > 0)
                                                .map((s: any) => {
                                                    const isChecked = selectedSeasons.includes(s.seasonNumber);
                                                    return (
                                                        <div
                                                            key={s.seasonNumber}
                                                            className={`flex items-center gap-2.5 p-2 rounded-md border transition-colors cursor-pointer hover:bg-muted/30 select-none ${isChecked ? 'bg-primary/5 border-primary/20' : 'bg-card border-border'}`}
                                                            onClick={() => handleSeasonToggle(s.seasonNumber)}
                                                        >
                                                            <Checkbox
                                                                checked={isChecked}
                                                                className="pointer-events-none"
                                                            />
                                                            <span className="text-sm font-medium leading-none flex-1">
                                                                Season {s.seasonNumber}
                                                                {s.episodeCount > 0 && (
                                                                    <span className="text-xs text-muted-foreground block mt-0.5">
                                                                        {s.episodeCount} episodes
                                                                    </span>
                                                                )}
                                                            </span>
                                                        </div>
                                                    );
                                                })}
                                        </div>
                                    </div>
                                )}

                                {/* Advanced settings toggler */}
                                <div className="flex flex-col gap-2">
                                    <div
                                        className="flex items-center justify-between p-3 rounded-md border bg-card hover:bg-muted/10 cursor-pointer transition-colors"
                                        onClick={() => setShowAdvanced(!showAdvanced)}
                                    >
                                        <div className="flex items-center gap-2 text-sm font-semibold">
                                            <Settings className="h-4 w-4 text-muted-foreground" />
                                            Advanced Request Options
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {showAdvanced ? 'Hide' : 'Show'}
                                        </span>
                                    </div>

                                    {showAdvanced && (
                                        <div className="flex flex-col gap-4 p-4 rounded-md border border-t-0 bg-card/50 mt-[-8px] animate-in fade-in slide-in-from-top-1 duration-200">
                                            {/* 4K Toggle */}
                                            <div className="flex items-center gap-3">
                                                <Checkbox
                                                    id="request-4k"
                                                    checked={is4k}
                                                    onCheckedChange={(val) => setIs4k(!!val)}
                                                />
                                                <label htmlFor="request-4k" className="text-sm font-medium cursor-pointer">
                                                    Request in 4K Quality
                                                </label>
                                            </div>

                                            {hasAdminAccess && servers.length > 0 && (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                    {/* Server selection */}
                                                    <div className="flex flex-col gap-1.5">
                                                        <label className="text-xs font-semibold text-muted-foreground">Server</label>
                                                        <Select value={selectedServerId} onValueChange={setSelectedServerId}>
                                                            <SelectTrigger className="w-full">
                                                                <SelectValue placeholder="Select Server" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {servers.map((srv) => (
                                                                    <SelectItem key={srv.id} value={String(srv.id)}>
                                                                        {srv.name} {srv.isDefault && '(Default)'}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    {/* Quality Profile selection */}
                                                    <div className="flex flex-col gap-1.5">
                                                        <label className="text-xs font-semibold text-muted-foreground">Quality Profile</label>
                                                        <Select value={selectedProfileId} onValueChange={setSelectedProfileId}>
                                                            <SelectTrigger className="w-full">
                                                                <SelectValue placeholder="Select Profile" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {profiles.map((p) => (
                                                                    <SelectItem key={p.id} value={String(p.id)}>
                                                                        {p.name}
                                                                    </SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>

                                                    {/* Root Folder selection */}
                                                    {rootFolders.length > 0 && (
                                                        <div className="flex flex-col gap-1.5 sm:col-span-2">
                                                            <label className="text-xs font-semibold text-muted-foreground">Root Path</label>
                                                            <Select value={selectedRootFolder} onValueChange={setSelectedRootFolder}>
                                                                <SelectTrigger className="w-full">
                                                                    <SelectValue placeholder="Select Root Path" />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {rootFolders.map((rf) => (
                                                                        <SelectItem key={rf.path} value={rf.path}>
                                                                            {rf.path}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        </div>
                                                    )}
                                                </div>
                                            )}

                                            {!hasAdminAccess && (
                                                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-1">
                                                    <Info className="h-3.5 w-3.5" />
                                                    Advanced server selection requires admin privileges on Seerr.
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Actions footer */}
                        <div className="shrink-0 flex justify-end gap-3 mt-2">
                            <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSubmit}
                                disabled={submitting || isAlreadyAvailable || isPending || (isTv && selectedSeasons.length === 0)}
                                className="px-6 cursor-pointer hover:scale-105 active:scale-95 transition-transform duration-200 ease-out"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                                        Submitting...
                                    </>
                                ) : isAlreadyAvailable ? (
                                    'Already Available'
                                ) : isPending ? (
                                    'Request Pending'
                                ) : (
                                    'Submit Request'
                                )}
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
