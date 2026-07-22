import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { Button } from './ui/button';
import { Film, ChevronDown } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useNavigate } from 'react-router';

export const TrailerButton = ({ item }: { item: BaseItemDto }) => {
    const navigate = useNavigate();

    const localTrailers = (item as any).LocalTrailers || [];
    const remoteTrailers = (item.RemoteTrailers || []).filter((t) => t.Url);

    const totalTrailersCount = localTrailers.length + remoteTrailers.length;

    if (totalTrailersCount === 0) return null;

    if (totalTrailersCount === 1) {
        if (localTrailers.length > 0 && localTrailers[0].Id) {
            return (
                <Button
                    variant="outline"
                    onClick={() => navigate(`/play/${localTrailers[0].Id}`)}
                >
                    <Film />
                    Trailer
                </Button>
            );
        }

        const singleRemote = remoteTrailers[0];
        return (
            <Button variant="outline" asChild>
                <a href={singleRemote.Url || undefined} target="_blank" rel="noopener noreferrer">
                    <Film />
                    Trailer
                </a>
            </Button>
        );
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline">
                    <Film />
                    Trailers
                    <ChevronDown className="ml-1 h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
                {localTrailers.map((local: any, index: number) => (
                    <DropdownMenuItem
                        key={`local-${local.Id || index}`}
                        onClick={() => local.Id && navigate(`/play/${local.Id}`)}
                    >
                        {local.Name || `Local Trailer ${index + 1}`}
                    </DropdownMenuItem>
                ))}
                {remoteTrailers.map((remote, index) => (
                    <DropdownMenuItem key={`remote-${remote.Url || index}`} asChild>
                        <a
                            href={remote.Url || undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full cursor-pointer"
                        >
                            {remote.Name || `Trailer ${index + 1}`}
                        </a>
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};
