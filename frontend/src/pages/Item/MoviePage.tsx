import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import BaseMediaPage from './BaseMediaPage';
import { getPrimaryImageUrl, getLogoUrl } from '@/utils/jellyfinUrls';
import { ImageOff } from 'lucide-react';
import PeopleRow from './PeopleRow';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import MoreLikeThisRow from './MoreLikeThisRow';
import type { AppConfig } from '@/hooks/api/useConfig';
import DetailBadges from './DetailBadges';
import MediaInfoDialog from '../../components/MediaInfoDialog';
import FavoriteButton from '../../components/FavoriteButton';
import WatchListButton from '../../components/WatchlistButton';
import PlayStateButton from '../../components/PlayStateButton';
import { getUserId } from '@/utils/localstorageCredentials';
import ItemAdminButton from '@/components/ItemAdminButton';
import { useState } from 'react';
import { TrailerButton } from '../../components/TrailerButton';
import ItemDownloadButton from '../../components/ItemDownloadButton';
import SourcePickerButton from '@/components/SourcePickerButton';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';


interface MoviePageProps {
    item: BaseItemDto;
    config: AppConfig;
}

const MoviePage = ({ item, config }: MoviePageProps) => {
    const { t } = useTranslation('item');
    const [postersFailed, setPostersFailed] = useState(false);
    const [isPosterLoaded, setIsPosterLoaded] = useState(false);
    const [failedLogo, setFailedLogo] = useState(false);


    const writers =
        item.People?.filter((person) => person.Type === 'Writer').filter((person) => person.Name) ||
        [];
    const directors =
        item.People?.filter((person) => person.Type === 'Director').filter(
            (person) => person.Name
        ) || [];
    const studios = item.Studios?.filter((studio) => studio.Name) || [];

    const isCurrentlyPlaying =
        item.UserData?.PlaybackPositionTicks &&
        item.UserData.PlaybackPositionTicks > 0 &&
        item.RunTimeTicks &&
        item.UserData.PlaybackPositionTicks < item.RunTimeTicks;

    return (
        <BaseMediaPage itemId={item.Id || ''} name={item.Name || ''} showLogo={false} topPadding={false}>
            <div className="pt-24 sm:pt-32 pb-12 px-4 sm:px-12 max-w-7xl mx-auto w-full flex flex-col gap-12">
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start relative z-10 w-full">
                    {/* Left Column (Poster) */}
                    <div className="w-48 sm:w-64 md:w-72 lg:w-80 shrink-0 mx-auto lg:mx-0">
                        <div className="relative aspect-[2/3] w-full rounded-xl overflow-hidden shadow-2xl shadow-black/85 border border-white/10 bg-muted flex items-center justify-center">
                            {!postersFailed ? (
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
                                        onError={() => setPostersFailed(true)}
                                    />
                                </>
                            ) : (
                                <ImageOff className="text-muted-foreground w-12 h-12" />
                            )}
                        </div>
                    </div>

                    {/* Right Column (Details) */}
                    <div className="flex-1 flex flex-col gap-5 w-full text-left">
                        {/* Title Logo / Text */}
                        {!failedLogo && item.Id ? (
                            <img
                                src={getLogoUrl(item.Id)}
                                alt={item.Name || ''}
                                className="h-16 sm:h-24 md:h-28 max-w-[85%] object-contain object-left mb-2"
                                onError={() => setFailedLogo(true)}
                            />
                        ) : (
                            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-2 text-wrap balance">
                                {item.Name}
                            </h1>
                        )}

                        {/* Badges */}
                        <DetailBadges item={item} appConfig={config} />

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2.5 items-center mt-2">
                            <SourcePickerButton
                                itemId={item.Id || ''}
                                mediaSources={item.MediaSources}
                                isCurrentlyPlaying={Boolean(isCurrentlyPlaying)}
                                playLabel={t('play')}
                                resumeLabel={t('resume')}
                            />
                            <TrailerButton item={item} />
                            <FavoriteButton
                                item={item}
                                showFavoriteButton={
                                    item.Type && config.itemPage?.favoriteButton?.includes(item.Type)
                                }
                            />
                            <WatchListButton
                                item={item}
                                showWatchlistButton={config.itemPage?.showWatchlistButton}
                            />
                            <PlayStateButton itemId={item.Id || ''} userId={getUserId() || ''} />
                            <ItemDownloadButton
                                item={item}
                                showDownloadButton={config.itemPage?.showDownloadButton}
                            />
                            <MediaInfoDialog streams={item.MediaStreams || []} path={item.MediaSources?.[0]?.Path || undefined} />
                            <ItemAdminButton item={item} showSubtitlesButton={true} />
                        </div>

                        {/* Overview */}
                        <p className="text-base sm:text-lg text-foreground/90 leading-relaxed font-normal max-w-3xl mt-2 whitespace-pre-line">
                            {item.Overview}
                        </p>

                        {/* Metadata Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6 mt-6 border-t border-white/10 pt-6 w-full max-w-4xl">
                            {/* Genres */}
                            {item.GenreItems && item.GenreItems.length > 0 && (
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        {t('genres')}
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {item.GenreItems.map((genre) => (
                                            <Badge
                                                key={genre.Name}
                                                variant="secondary"
                                                className="bg-white/5 hover:bg-white/10 border-white/5 text-foreground hover:underline transition-colors px-2.5 py-0.5"
                                                asChild
                                            >
                                                <Link to={`/item/${genre.Id}`}>{genre.Name}</Link>
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Directors */}
                            {directors.length > 0 && (
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        {t('directors')}
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {directors.map((person) => (
                                            <Badge
                                                key={person.Name}
                                                variant="secondary"
                                                className="bg-white/5 hover:bg-white/10 border-white/5 text-foreground hover:underline transition-colors px-2.5 py-0.5"
                                                asChild
                                            >
                                                <Link to={`/person/${person.Id}`}>{person.Name}</Link>
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Writers */}
                            {writers.length > 0 && (
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        {t('writers')}
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {writers.map((person) => (
                                            <Badge
                                                key={person.Name}
                                                variant="secondary"
                                                className="bg-white/5 hover:bg-white/10 border-white/5 text-foreground hover:underline transition-colors px-2.5 py-0.5"
                                                asChild
                                            >
                                                <Link to={`/person/${person.Id}`}>{person.Name}</Link>
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Studios */}
                            {studios.length > 0 && (
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                        {t('studios')}
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {studios.map((studio) => (
                                            <Badge
                                                key={studio.Name}
                                                variant="secondary"
                                                className="bg-white/5 hover:bg-white/10 border-white/5 text-foreground hover:underline transition-colors px-2.5 py-0.5"
                                                asChild
                                            >
                                                {studio.Id ? (
                                                    <Link to={`/studio/${studio.Id}?name=${encodeURIComponent(studio.Name ?? '')}`}>
                                                        {studio.Name}
                                                    </Link>
                                                ) : (
                                                    <span>{studio.Name}</span>
                                                )}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <PeopleRow
                    title={<h3 className="text-3xl font-bold">{t('cast_and_crew')}</h3>}
                    people={item.People || []}
                />
                <MoreLikeThisRow
                    title={<h3 className="text-3xl font-bold">{t('more_like_this')}</h3>}
                    itemId={item.Id || ''}
                />
            </div>
        </BaseMediaPage>
    );
};

export default MoviePage;
