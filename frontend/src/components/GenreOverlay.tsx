
import {
    Compass,
    Film,
    Smile,
    Drama,
    Camera,
    Users,
    Sparkles,
    Skull,
    Music,
    Search,
    Heart,
    Rocket,
    Eye,
    ShieldAlert,
    Swords,
    HelpCircle,
    type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { useConfig } from '@/hooks/api/useConfig';

const genreIconMap: Record<string, LucideIcon> = {
    action: Swords,
    adventure: Compass,
    animation: Film,
    comedy: Smile,
    crime: ShieldAlert,
    documentary: Camera,
    drama: Drama,
    family: Users,
    fantasy: Sparkles,
    horror: Skull,
    music: Music,
    mystery: Search,
    romance: Heart,
    'science fiction': Rocket,
    'sci-fi': Rocket,
    thriller: Eye,
    'fantasy & adventure': Sparkles,
    'action & adventure': Swords,
    war: Swords,
};

interface GenreOverlayProps {
    item?: BaseItemDto;
    show: boolean;
}

export const GenreOverlay = ({ item, show }: GenreOverlayProps) => {
    const { config } = useConfig();
    if (!show || config?.showGenreTags === false || !item?.Genres || item.Genres.length === 0) return null;

    // Display at most 3 genres to keep the card clean
    const genresToShow = item.Genres.slice(0, 3);

    return (
        <div className="absolute top-2 right-2 flex flex-col gap-1.5 items-end z-30 pointer-events-none">
            {genresToShow.map((genre) => {
                const normalizedGenre = genre.toLowerCase().trim();
                const Icon = genreIconMap[normalizedGenre] || HelpCircle;

                return (
                    <div
                        key={genre}
                        className={cn(
                            // Pill: fixed height, expands max-width. Icon pinned right, text reveals left.
                            'flex flex-row-reverse items-center bg-black/85 border border-white/10 text-white text-[10px] font-medium rounded-full h-6 px-1.5 shadow-sm overflow-hidden transition-[max-width] duration-300 ease-out',
                            // Collapsed = just icon width; hovered/focused = expanded max-width
                            'w-auto max-w-6 group-hover:max-w-32 group-focus-within:max-w-32 group-focus:max-w-32'
                        )}
                    >
                        {/* Icon stays pinned — never moves */}
                        <Icon className="w-3 h-3 shrink-0" />
                        {/* Text slides in from the right of the icon toward the left */}
                        <span
                            className={cn(
                                'whitespace-nowrap overflow-hidden',
                                'max-w-0 opacity-0 mr-0',
                                'group-hover:max-w-24 group-hover:opacity-100 group-hover:mr-1.5',
                                'group-focus-within:max-w-24 group-focus-within:opacity-100 group-focus-within:mr-1.5',
                                'group-focus:max-w-24 group-focus:opacity-100 group-focus:mr-1.5',
                                'transition-[max-width,opacity,margin] duration-300 ease-out'
                            )}
                        >
                            {genre}
                        </span>
                    </div>
                );
            })}
        </div>
    );
};

export default GenreOverlay;
