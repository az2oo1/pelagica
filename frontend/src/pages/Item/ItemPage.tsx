import { Navigate, useParams } from 'react-router';
import Page from '../Page';
import { useItem } from '@/hooks/api/useItem';
import MoviePage from './MoviePage';
import SeriesPage from './SeriesPage';
import { Skeleton } from '@/components/ui/skeleton';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { useConfig } from '@/hooks/api/useConfig';
import EpisodePage from './EpisodePage';
import SeasonPage from './SeasonPage';
import { getUserId } from '@/utils/localstorageCredentials';
import BoxSetPage from './BoxSetPage';
import MusicAlbumPage from './MusicAlbumPage';
import PlaylistPage from './PlaylistPage';
import type { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models';
import MusicArtistPage from './MusicArtistPage';
import AudioPage from './AudioPage';

const ItemPageSkeleton = memo(({ isSquare = false }: { isSquare?: boolean }) => {
    return (
        <div className="relative h-full w-full">
            {/* Backdrop skeleton */}
            <div className="absolute top-0 left-0 h-[75vh] md:h-[85vh] w-full -z-10 bg-muted/10 animate-pulse" />

            {/* Main Content */}
            <div className="pt-24 sm:pt-32 pb-12 px-4 sm:px-12 max-w-7xl mx-auto w-full flex flex-col gap-12">
                <div className="flex flex-col lg:flex-row gap-8 lg:gap-12 items-start relative z-10 w-full animate-pulse">
                    {/* Left Column (Poster) */}
                    <div className="w-48 sm:w-64 md:w-72 lg:w-80 shrink-0 mx-auto lg:mx-0">
                        <div className={`relative w-full rounded-xl overflow-hidden shadow-2xl shadow-black/85 border border-white/10 bg-muted ${isSquare ? 'aspect-square' : 'aspect-[2/3]'}`}>
                            <Skeleton className="absolute inset-0 w-full h-full rounded-xl" />
                        </div>
                    </div>

                    {/* Right Column (Details) */}
                    <div className="flex-1 flex flex-col gap-5 w-full text-left">
                        {/* Logo/Title */}
                        <Skeleton className="h-16 sm:h-24 md:h-28 w-2/3 max-w-[320px] rounded-xl" />

                        {/* Badges */}
                        <div className="flex flex-wrap gap-2">
                            <Skeleton className="h-6 w-16 rounded-md" />
                            <Skeleton className="h-6 w-12 rounded-md" />
                            <Skeleton className="h-6 w-20 rounded-md" />
                        </div>

                        {/* Actions */}
                        <div className="flex flex-wrap gap-2.5 items-center mt-2">
                            <Skeleton className="h-10 w-28 rounded-md" />
                            <Skeleton className="h-10 w-24 rounded-md" />
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <Skeleton className="h-10 w-10 rounded-full" />
                        </div>

                        {/* Overview */}
                        <div className="space-y-2 mt-2 max-w-3xl w-full">
                            <Skeleton className="h-4 w-full rounded-md" />
                            <Skeleton className="h-4 w-[95%] rounded-md" />
                            <Skeleton className="h-4 w-[85%] rounded-md" />
                        </div>

                        {/* Metadata Grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6 mt-6 border-t border-white/10 pt-6 w-full max-w-4xl">
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex flex-col gap-2">
                                    <Skeleton className="h-3 w-16 rounded-md" />
                                    <div className="flex flex-wrap gap-1.5">
                                        <Skeleton className="h-6 w-20 rounded-md" />
                                        <Skeleton className="h-6 w-16 rounded-md" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
});

ItemPageSkeleton.displayName = 'ItemPageSkeleton';

const FULL_PAGE_ITEM_TYPES: BaseItemKind[] = ['Movie', 'Series', 'Episode', 'Season', 'BoxSet', 'MusicAlbum', 'Audio'];

const REDIRECT_ITEM_TYPES: Partial<Record<BaseItemKind, string>> = {
    Person: '/person',
    Genre: '/genre',
};

const ItemPage = () => {
    const { t } = useTranslation('item');
    const params = useParams<{ itemId: string }>();
    const itemId = params.itemId;

    const { config, loading: configLoading } = useConfig();
    const { data: item, isLoading, error } = useItem(itemId, true, getUserId() || undefined);

    const redirectPath =
        item?.Type && REDIRECT_ITEM_TYPES[item.Type]
            ? `${REDIRECT_ITEM_TYPES[item.Type]}/${item.Id}`
            : null;
    if (redirectPath) return <Navigate to={redirectPath} replace />;

    const isFullPageItem = item && FULL_PAGE_ITEM_TYPES.includes(item.Type as BaseItemKind);

    return (
        <Page
            title={item ? `${item.Name}` : isLoading ? t('loading') : t('item_not_found')}
            className="flex-1 flex flex-col"
            overlayHeader={isFullPageItem}
            pagePadding={!isFullPageItem}
        >
            {(isLoading || configLoading) && <ItemPageSkeleton isSquare={item?.Type === 'MusicAlbum' || item?.Type === 'MusicArtist' || item?.Type === 'Audio'} />}
            {error && <p>Error loading item details.</p>}
            {item &&
                (() => {
                    switch (item.Type) {
                        case 'Movie':
                            return <MoviePage item={item} config={config} />;
                        case 'Series':
                            return <SeriesPage item={item} config={config} />;
                        case 'Episode':
                            return <EpisodePage item={item} config={config} />;
                        case 'Season':
                            return <SeasonPage item={item} config={config} />;
                        case 'BoxSet':
                            return <BoxSetPage item={item} config={config} />;
                        case 'MusicAlbum':
                            return <MusicAlbumPage item={item} config={config} />;
                        case 'Playlist':
                            return <PlaylistPage item={item} config={config} />;
                        case 'MusicArtist':
                            return <MusicArtistPage item={item} config={config} />;
                        case 'Audio':
                            return <AudioPage item={item} config={config} />;
                        default:
                            return (
                                <p>
                                    Unsupported item type "{item.Type}" for item "{item.Name}" with
                                    ID "{item.Id}"
                                </p>
                            );
                    }
                })()}
        </Page>
    );
};

export default ItemPage;
