import type { AppConfig } from '@/hooks/api/useConfig';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import BaseMediaPage from './BaseMediaPage';
import { useTranslation } from 'react-i18next';
import { getPrimaryImageUrl } from '@/utils/jellyfinUrls';
import DetailBadges from './DetailBadges';
import { useState } from 'react';
import { useSeasons } from '@/hooks/api/useSeasons';
import EpisodesDisplay from './EpisodesDisplay';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import PeopleRow from './PeopleRow';
import { Link } from 'react-router';
import JellyfinItemKindIcon from '@/components/JellyfinItemKindIcon';
import FavoriteButton from '../../components/FavoriteButton';
import { Skeleton } from '@/components/ui/skeleton';
import ItemAdminButton from '@/components/ItemAdminButton';
import { ImageOff } from 'lucide-react';
import { getUserId } from '../../utils/localstorageCredentials';
import PlayStateButton from '../../components/PlayStateButton';
import { useUpcomingEpisodes } from '../../hooks/api/useUpcomingEpisodes';
import UpcomingEpisodeComponent from './UpcomingEpisodeComponent';

interface EpisodePageProps {
    item: BaseItemDto;
    config: AppConfig;
}

const SeasonPage = ({ item, config }: EpisodePageProps) => {
    const { t } = useTranslation('item');
    const [selectedSeason, setSelectedSeason] = useState<string | null>(null);
    const { data: seasons, isLoading: isLoadingSeasons } = useSeasons(item.SeriesId || '');
    const [posterFailed, setPosterFailed] = useState(false);
    const [isPosterLoaded, setIsPosterLoaded] = useState(false);
    const { data: upcomingEpisodes } = useUpcomingEpisodes(item.Id || '');
    console.log('Upcoming Episodes:', upcomingEpisodes);

    const effectiveSelectedSeason =
        selectedSeason ||
        (seasons && seasons.length > 0
            ? seasons.find((s) => s.IndexNumber === item.IndexNumber)?.Id || seasons[0]?.Id || ''
            : '');

    return (
        <BaseMediaPage itemId={item.SeriesId || ''} name={item.SeriesName || item.Name || ''} showLogo={false} topPadding={false}>
            <div className="pt-24 sm:pt-32 pb-12 px-4 sm:px-12 max-w-7xl mx-auto w-full flex flex-col gap-12">
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start relative z-10 w-full">
                    {/* Left Column (Poster) */}
                    <div className="w-48 sm:w-64 md:w-72 lg:w-80 shrink-0 mx-auto lg:mx-0">
                        <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden shadow-2xl shadow-black/85 border border-white/10 bg-muted flex items-center justify-center">
                            {!posterFailed ? (
                                <>
                                    <Skeleton className="absolute inset-0 w-full h-full rounded-xl" />
                                    <img
                                        src={getPrimaryImageUrl(
                                            item.Id || '',
                                            undefined,
                                            item.ImageTags?.Primary
                                        )}
                                        alt={item.Name + ' Primary'}
                                        className={[
                                            'object-cover rounded-xl w-full h-full relative z-10',
                                            'transition-[filter,opacity] duration-700 ease-out',
                                            isPosterLoaded ? 'blur-0 opacity-100' : 'blur-md opacity-0',
                                        ].join(' ')}
                                        onLoad={() => setIsPosterLoaded(true)}
                                        onError={() => setPosterFailed(true)}
                                    />
                                </>
                            ) : (
                                <ImageOff className="text-muted-foreground w-12 h-12" />
                            )}
                        </div>
                    </div>

                    {/* Right Column (Details) */}
                    <div className="flex-1 flex flex-col gap-5 w-full text-left">
                        <div className="flex flex-wrap items-center text-sm text-muted-foreground">
                            <Link
                                to={`/item/${item.SeriesId}`}
                                className="hover:underline flex items-center gap-2"
                            >
                                <JellyfinItemKindIcon kind="Series" className="h-4 w-4" />
                                <span className="line-clamp-1 text-ellipsis break-all">
                                    {item.SeriesName || t('no_title')}
                                </span>
                            </Link>
                        </div>
                        <h2 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-2 text-wrap balance">
                            {item.Name}
                        </h2>
                        <DetailBadges item={item} appConfig={config} />
                        <div className="mt-1 flex flex-wrap gap-2.5 items-center">
                            <FavoriteButton
                                item={item}
                                showFavoriteButton={
                                    item.Type && config.itemPage?.favoriteButton?.includes(item.Type)
                                }
                            />
                            <PlayStateButton itemId={item.Id || ''} userId={getUserId() || ''} />
                            <ItemAdminButton item={item} />
                        </div>
                        <p className="text-base sm:text-lg text-foreground/90 leading-relaxed font-normal max-w-3xl mt-2">
                            {item.Overview}
                        </p>
                    </div>
                </div>

                {upcomingEpisodes && upcomingEpisodes.length > 0 && (
                    <div>
                        <h3 className="text-3xl font-bold mb-3">{t('upcoming_episodes')}</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                            {upcomingEpisodes.map((episode) => (
                                <UpcomingEpisodeComponent key={episode.Id} episode={episode} t={t} />
                            ))}
                        </div>
                    </div>
                )}

                <EpisodesDisplay
                    title={
                        <div className="flex items-center gap-4">
                            <h3 className="text-3xl font-bold">{t('episodes')}</h3>
                            <Select
                                value={effectiveSelectedSeason || ''}
                                onValueChange={(value) => setSelectedSeason(value || null)}
                                disabled={isLoadingSeasons || !seasons || seasons.length === 0}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder={t('select_season')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {seasons?.map((season) => (
                                        <SelectItem
                                            key={season.Id}
                                            value={season.Id || ''}
                                            onSelect={() => setSelectedSeason(season.Id || null)}
                                        >
                                            {season.Name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    }
                    seasonsLoading={isLoadingSeasons}
                    seasonId={effectiveSelectedSeason}
                    episodeDisplay={config.itemPage?.episodeDisplay || 'row'}
                />

                <PeopleRow
                    people={item.People || []}
                    title={<h3 className="text-3xl font-bold">{t('cast_and_crew')}</h3>}
                />
            </div>
        </BaseMediaPage>
    );
};

export default SeasonPage;
