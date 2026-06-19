import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Page from '../Page';
import { useUserViews } from '@/hooks/api/useUserViews';
import { useMemo, useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useLibraryItems } from '@/hooks/api/useLibraryItems';
import { useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import ItemPagination from '@/components/ItemPagination';
import {
    Empty,
    EmptyDescription,
    EmptyHeader,
    EmptyMedia,
    EmptyTitle,
} from '@/components/ui/empty';
import {
    ArrowDownWideNarrow,
    ArrowUpNarrowWideIcon,
    Calendar,
    CalendarPlus,
    CaseSensitive,
    Clock,
    FolderOpen,
    Star,
    Shuffle,
    Award,
    History,
    Shield,
    Play,
} from 'lucide-react';
import JellyfinLibraryIcon from '@/components/JellyfinLibraryIcon';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import type { BaseItemKind, CollectionType, ItemSortBy, SortOrder } from '@jellyfin/sdk/lib/generated-client/models';
import { ButtonGroup } from '@/components/ui/button-group';
import LibraryItem from './LibraryItem';
import HomeVideoGrid, { TARGET_ROW_HEIGHT } from './HomeVideoGrid';
import { SUPPORTED_LIBRARY_COLLECTION_TYPES } from '@/utils/supportedLibraryCollectionTypes';
import { getPrimaryImageUrl, type ImageSize } from '@/utils/jellyfinUrls';

const ITEM_ROWS = 5;
const HOME_VIDEO_PAGE_SIZE = 50;


const ITEM_POSTER_SIZES: Partial<Record<CollectionType, ImageSize>> = {
    music: { width: 416, height: 416 },
    musicvideos: { width: 700, height: 394 },
};


const ITEM_POSTER_ASPECT_RATIOS: Partial<Record<CollectionType, string>> = {
    music: 'square',
    musicvideos: '16/9',
};


type GridConfig = { cols: string; breakpoints: [number, number][] };

const DEFAULT_GRID_CONFIG: GridConfig = {
    cols: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-9',
    breakpoints: [[1536, 9], [1280, 7], [1024, 5], [768, 4], [640, 3], [0, 2]],
};

const ITEM_GRID_CONFIG: Partial<Record<CollectionType, GridConfig>> = {
    musicvideos: {
        cols: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6',
        breakpoints: [[1536, 6], [1280, 5], [1024, 4], [768, 3], [0, 2]],
    },
};

function getGridConfig(collectionType: CollectionType): GridConfig {
    return ITEM_GRID_CONFIG[collectionType] ?? DEFAULT_GRID_CONFIG;
}

function getColumnCount(width: number, collectionType: CollectionType): number {
    const { breakpoints } = getGridConfig(collectionType);
    return breakpoints.find(([minWidth]) => width >= minWidth)?.[1] ?? 2;
}

function getPageSize(width: number, collectionType: CollectionType): number {
    if (collectionType === 'homevideos') return HOME_VIDEO_PAGE_SIZE;
    return getColumnCount(width, collectionType) * ITEM_ROWS;
}

const DIRECT_PLAY_TYPES: CollectionType[] = ['musicvideos'];

const COLLECTION_ITEM_TYPES: Partial<Record<CollectionType, BaseItemKind[]>> = {
    movies: ['Movie'],
    tvshows: ['Series'],
    boxsets: ['BoxSet'],
    music: ['MusicAlbum'],
    musicvideos: ['MusicVideo'],
    homevideos: ['Video', 'Photo'],
};


const SKELETON_ASPECT_RATIOS = [1.5, 0.75, 1.78, 1, 1.33, 0.67, 2, 1.2, 1.5, 0.8, 1, 1.78];

const LibraryContent = ({
    libraryId,
    collectionType,
    sortBy,
    sortOrder,
    itemTypeFilter,
    page,
    onPageChange,
}: {
    libraryId: string;
    collectionType?: string;
    sortBy: ItemSortBy;
    sortOrder: SortOrder;
    itemTypeFilter: string;
    page: number;
    onPageChange: (p: number) => void;
}) => {
    const { t } = useTranslation(['library', 'common']);
    const [pageSize, setPageSize] = useState(
        () => getPageSize(typeof window !== 'undefined' ? window.innerWidth : 640, collectionType as CollectionType)
    );

    useEffect(() => {
        const handleResize = () => {
            setPageSize((prev) => {
                const next = getPageSize(window.innerWidth, collectionType as CollectionType);
                if (next !== prev) onPageChange(0);
                return next;
            });
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [onPageChange, collectionType]);

    const isMusicLibrary = collectionType === 'music';
    const includeItemTypes = isMusicLibrary
        ? itemTypeFilter === 'all'
            ? (['MusicAlbum', 'Audio', 'MusicArtist'] as const)
            : ([itemTypeFilter] as unknown as ('MusicAlbum' | 'Audio' | 'MusicArtist')[])
        : (COLLECTION_ITEM_TYPES[collectionType as CollectionType] || ['Series', 'Movie', 'BoxSet', 'MusicAlbum'] as const);

    const { data: libraryData, isLoading } = useLibraryItems(libraryId, {
        limit: pageSize,
        startIndex: page * pageSize,
        includeItemTypes: [...includeItemTypes],
        sortBy: [sortBy],
        sortOrder,
    });

    const [wasLoading, setWasLoading] = useState(isLoading);
    useEffect(() => {
        if (wasLoading && !isLoading) {
            const activeEl = document.activeElement;
            if (!activeEl || activeEl === document.body || activeEl.id === 'loading-skeleton-container') {
                setTimeout(() => {
                    const firstItem = document.querySelector('.library-item-link') as HTMLElement;
                    if (firstItem) {
                        firstItem.focus({ preventScroll: true });
                    }
                }, 50);
            }
        }
        setWasLoading(isLoading);
    }, [isLoading, wasLoading]);

    const posterUrls = useMemo(() => {
        if (!libraryData || collectionType === 'homevideos') return {};
        return libraryData.items.reduce(
            (acc, item) => {
                const isSquare =
                    item.Type === 'MusicAlbum' ||
                    item.Type === 'Audio' ||
                    item.Type === 'MusicArtist';
                const targetImageId =
                    item.Type === 'Audio' && item.AlbumId ? item.AlbumId : item.Id!;
                const targetImageTag =
                    item.Type === 'Audio' && item.AlbumId ? undefined : item.ImageTags?.Primary;

                const size =
                    ITEM_POSTER_SIZES[collectionType as CollectionType] ||
                    (isSquare ? { width: 416, height: 416 } : { width: 416, height: 640 });

                acc[item.Id!] = getPrimaryImageUrl(
                    targetImageId,
                    size,
                    targetImageTag
                );
                return acc;
            },
            {} as Record<string, string>
        );
    }, [libraryData, collectionType]);

    const totalPages = libraryData?.totalCount ? Math.ceil(libraryData.totalCount / pageSize) : 0;
    const gridCols = getGridConfig(collectionType as CollectionType).cols;
    const isDirectPlay = DIRECT_PLAY_TYPES.includes(collectionType as CollectionType);
    const isHomeVideos = collectionType === 'homevideos';

    return (
        <div className="mb-4">
            {isLoading && !isHomeVideos && (
                <div
                    tabIndex={0}
                    id="loading-skeleton-container"
                    className={cn(
                        "w-full gap-4 mt-2 grid focus:outline-none focus-visible:ring-2 focus-visible:ring-brand rounded-md animate-pulse",
                        gridCols
                    )}
                >
                    {Array.from({ length: pageSize }).map((_, i) => (
                        <div key={i} className="p-0 m-0">
                            <div
                                className={cn(
                                    "relative w-full overflow-hidden rounded-md",
                                    (ITEM_POSTER_ASPECT_RATIOS[collectionType as CollectionType] === 'square' && 'aspect-square') ||
                                    (ITEM_POSTER_ASPECT_RATIOS[collectionType as CollectionType] === '16/9' && 'aspect-[16/9]') ||
                                    'aspect-[2/3]'
                                )}
                            >
                                <Skeleton className="w-full h-full" />
                            </div>
                            <Skeleton className="mt-2 h-4 w-3/4" />
                            <Skeleton className="mt-1 h-3 w-1/4" />
                        </div>
                    ))}
                </div>
            )}
            {isLoading && isHomeVideos && (
                <div className="flex flex-wrap mt-2" style={{ gap: 8 }}>
                    {SKELETON_ASPECT_RATIOS.map((ar, i) => (
                        <Skeleton
                            key={i}
                            style={{ height: TARGET_ROW_HEIGHT, width: Math.round(TARGET_ROW_HEIGHT * ar) }}
                            className="rounded-md"
                        />
                    ))}
                </div>
            )}
            {!isLoading && libraryData && !libraryData.items?.length && (
                <Empty>
                    <EmptyHeader>
                        <EmptyMedia variant="icon">
                            <FolderOpen />
                        </EmptyMedia>
                        <EmptyTitle>{t('library:no_items_title')}</EmptyTitle>
                        <EmptyDescription>{t('library:no_items_description')}</EmptyDescription>
                    </EmptyHeader>
                </Empty>
            )}
            {!isLoading && libraryData && libraryData.items && libraryData.items.length > 0 && (
                <>
                    {isHomeVideos ? (
                        <HomeVideoGrid items={libraryData.items} />
                    ) : (
                        <div className={cn("w-full gap-4 mt-2 grid", gridCols)}>
                            {libraryData.items.map((item) => (
                                <LibraryItem
                                    key={item.Id}
                                    item={item}
                                    posterUrl={posterUrls[item.Id!]}
                                    t={t}
                                    posterAspectRatio={
                                        (ITEM_POSTER_ASPECT_RATIOS[collectionType as CollectionType] as any) ||
                                        (item.Type === 'MusicAlbum' || item.Type === 'Audio' || item.Type === 'MusicArtist'
                                            ? 'square'
                                            : '2/3')
                                    }
                                    detailLine={
                                        item.Type === 'MusicAlbum' || item.Type === 'Audio'
                                            ? item.AlbumArtist || (item.Artists && item.Artists[0]) || undefined
                                            : item.PremiereDate
                                              ? new Date(item.PremiereDate).getFullYear().toString()
                                              : undefined
                                    }
                                    isDirectPlay={isDirectPlay}
                                />
                            ))}
                        </div>
                    )}
                    <ItemPagination
                        totalPages={totalPages}
                        currentPage={page}
                        onPageChange={onPageChange}
                    />
                </>
            )}
        </div>
    );
};

const LibraryPage = () => {
    const { t } = useTranslation('library');
    const { data: libraries } = useUserViews();
    const [searchParams, setSearchParams] = useSearchParams();

    // Filter libraries to supported collection types first
    const libraryItems = useMemo(() => {
        return libraries?.Items?.filter((library) =>
            SUPPORTED_LIBRARY_COLLECTION_TYPES.includes(library.CollectionType!)
        ) ?? [];
    }, [libraries]);

    const firstLibraryId = libraryItems?.[0]?.Id ?? '';
    const libraryIdFromUrl = searchParams.get('library') || '';
    const activeLibraryId = useMemo(() => {
        return libraryIdFromUrl && libraryItems.some((library) => library.Id === libraryIdFromUrl)
            ? libraryIdFromUrl
            : firstLibraryId;
    }, [libraryIdFromUrl, libraryItems, firstLibraryId]);

    const activeLibrary = useMemo(() => {
        return libraryItems.find((library) => library.Id === activeLibraryId);
    }, [libraryItems, activeLibraryId]);

    const isMusicLibrary = activeLibrary?.CollectionType === 'music';

    const sortByParam = useMemo(() => {
        const urlParam = searchParams.get('sortBy');
        if (urlParam) {
            if (urlParam === 'DateLastPlayed') return 'DatePlayed' as ItemSortBy;
            return urlParam as ItemSortBy;
        }
        if (typeof window !== 'undefined') {
            const saved = (localStorage.getItem('pelagica_library_sort_by') as ItemSortBy) || 'Name';
            if (saved as string === 'DateLastPlayed') return 'DatePlayed' as ItemSortBy;
            return saved;
        }
        return 'Name';
    }, [searchParams]);

    const sortOrderParam = useMemo(() => {
        const urlParam = searchParams.get('sortOrder');
        if (urlParam) return urlParam as SortOrder;
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('pelagica_library_sort_order') as SortOrder) || 'Ascending';
        }
        return 'Ascending';
    }, [searchParams]);

    const pageParam = useMemo(() => {
        const p = parseInt(searchParams.get('page') ?? '0', 10);
        return Number.isNaN(p) ? 0 : p;
    }, [searchParams]);

    const itemTypeParam = useMemo(() => {
        const urlParam = searchParams.get('itemType');
        if (urlParam) return urlParam;
        if (isMusicLibrary && typeof window !== 'undefined') {
            return localStorage.getItem('pelagica_library_item_type_filter') || 'all';
        }
        return 'all';
    }, [searchParams, isMusicLibrary]);

    // Single useEffect to fill missing URL parameters with defaults initially
    useEffect(() => {
        if (!activeLibraryId) return;

        const hasLibrary = searchParams.has('library');
        const hasPage = searchParams.has('page');
        const hasSortBy = searchParams.has('sortBy');
        const hasSortOrder = searchParams.has('sortOrder');

        if (!hasLibrary || !hasPage || !hasSortBy || !hasSortOrder) {
            const nextParams = new URLSearchParams(searchParams);
            if (!hasLibrary) nextParams.set('library', activeLibraryId);
            if (!hasPage) nextParams.set('page', String(pageParam));
            if (!hasSortBy) nextParams.set('sortBy', sortByParam);
            if (!hasSortOrder) nextParams.set('sortOrder', sortOrderParam);

            if (isMusicLibrary && !searchParams.has('itemType') && itemTypeParam !== 'all') {
                nextParams.set('itemType', itemTypeParam);
            }

            setSearchParams(nextParams, { replace: true });
        }
    }, [activeLibraryId, searchParams, setSearchParams, pageParam, sortByParam, sortOrderParam, itemTypeParam, isMusicLibrary]);

    const handleLibraryChange = (libraryId: string) => {
        const nextLibrary = libraryItems.find((library) => library.Id === libraryId);
        if (!nextLibrary) return;

        const nextIsMusic = nextLibrary.CollectionType === 'music';
        const savedType = nextIsMusic && typeof window !== 'undefined'
            ? localStorage.getItem('pelagica_library_item_type_filter') || 'all'
            : 'all';

        let savedSortBy = typeof window !== 'undefined'
            ? (localStorage.getItem('pelagica_library_sort_by') as ItemSortBy) || 'Name'
            : 'Name';

        if (savedSortBy as string === 'DateLastPlayed') {
            savedSortBy = 'DatePlayed';
        }

        // Validate sorting selection for the new library type to prevent illegal state
        const movieOnlySorts = ['CommunityRating', 'CriticRating', 'OfficialRating', 'PremiereDate'];
        const musicOnlySorts = ['Artist', 'AlbumArtist', 'ProductionYear'];

        if (nextIsMusic && movieOnlySorts.includes(savedSortBy)) {
            savedSortBy = 'Name';
            if (typeof window !== 'undefined') {
                localStorage.setItem('pelagica_library_sort_by', 'Name');
            }
        } else if (!nextIsMusic && musicOnlySorts.includes(savedSortBy)) {
            savedSortBy = 'Name';
            if (typeof window !== 'undefined') {
                localStorage.setItem('pelagica_library_sort_by', 'Name');
            }
        }

        const savedSortOrder = typeof window !== 'undefined'
            ? (localStorage.getItem('pelagica_library_sort_order') as SortOrder) || 'Ascending'
            : 'Ascending';

        const params: Record<string, string> = {
            library: libraryId,
            page: '0',
            sortBy: savedSortBy,
            sortOrder: savedSortOrder,
        };
        if (savedType !== 'all') {
            params.itemType = savedType;
        }
        setSearchParams(params);
    };

    return (
        <Page title={t('title')} requiresAuth className="flex-1">
            <Tabs
                value={activeLibraryId}
                onValueChange={handleLibraryChange}
                className="w-full"
                activationMode="manual"
            >
                <div className="flex flex-col sm:items-center sm:justify-between sm:flex-row gap-2">
                    <TabsList className="max-w-full overflow-auto hidden sm:flex">
                        {libraryItems.map((library) => (
                            <TabsTrigger key={library.Id} value={library.Id ?? ''}>
                                <JellyfinLibraryIcon libraryType={library.CollectionType} />
                                {library.Name}
                            </TabsTrigger>
                        ))}
                    </TabsList>
                    <Select
                        onValueChange={handleLibraryChange}
                        value={activeLibraryId}
                    >
                        <SelectTrigger size="sm" className="w-full sm:hidden">
                            <SelectValue placeholder={t('select_library', { defaultValue: 'Select Library' })} />
                        </SelectTrigger>
                        <SelectContent>
                            {libraryItems.map((library) => (
                                <SelectItem key={library.Id} value={library.Id ?? ''}>
                                    <JellyfinLibraryIcon libraryType={library.CollectionType} />
                                    {library.Name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <ButtonGroup>
                        {isMusicLibrary && (
                            <Select
                                onValueChange={(value) => {
                                    localStorage.setItem('pelagica_library_item_type_filter', value);
                                    const params = new URLSearchParams(searchParams);
                                    params.set('page', '0');
                                    if (value === 'all') {
                                        params.delete('itemType');
                                    } else {
                                        params.set('itemType', value);
                                    }
                                    setSearchParams(params);
                                }}
                                value={itemTypeParam}
                            >
                                <SelectTrigger size="sm" onKeyDown={(e) => {
                                    if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                                        e.preventDefault();
                                    }
                                }}>
                                    <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">
                                        {t('type_all', { defaultValue: 'All Types' })}
                                    </SelectItem>
                                    <SelectItem value="MusicAlbum">
                                        {t('type_albums', { defaultValue: 'Albums' })}
                                    </SelectItem>
                                    <SelectItem value="Audio">
                                        {t('type_songs', { defaultValue: 'Songs' })}
                                    </SelectItem>
                                    <SelectItem value="MusicArtist">
                                        {t('type_artists', { defaultValue: 'Artists' })}
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        )}
                        <Select
                            onValueChange={(value) => {
                                const nextSortBy = value as ItemSortBy;
                                localStorage.setItem('pelagica_library_sort_by', nextSortBy);
                                const params = new URLSearchParams(searchParams);
                                params.set('sortBy', nextSortBy);
                                params.set('page', '0');
                                setSearchParams(params);
                            }}
                            value={sortByParam}
                        >
                            <SelectTrigger size="sm" onKeyDown={(e) => {
                                if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                                    e.preventDefault();
                                }
                            }}>
                                <SelectValue placeholder="Sort" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Name">
                                    <CaseSensitive />
                                    {t('sort_name')}
                                </SelectItem>
                                <SelectItem value="Random">
                                    <Shuffle />
                                    {t('sort_random')}
                                </SelectItem>
                                {!isMusicLibrary && (
                                    <>
                                        <SelectItem value="CommunityRating">
                                            <Star />
                                            {t('sort_community_rating')}
                                        </SelectItem>
                                        <SelectItem value="CriticRating">
                                            <Award />
                                            {t('sort_critic_rating')}
                                        </SelectItem>
                                        <SelectItem value="OfficialRating">
                                            <Shield />
                                            {t('sort_parental_rating')}
                                        </SelectItem>
                                        <SelectItem value="PremiereDate">
                                            <Calendar />
                                            {t('sort_premiere_date')}
                                        </SelectItem>
                                    </>
                                )}
                                {isMusicLibrary && (
                                    <>
                                        <SelectItem value="Artist">
                                            <CaseSensitive />
                                            {t('sort_artist', { defaultValue: 'Artist' })}
                                        </SelectItem>
                                        <SelectItem value="AlbumArtist">
                                            <CaseSensitive />
                                            {t('sort_album_artist', { defaultValue: 'Album Artist' })}
                                        </SelectItem>
                                        <SelectItem value="ProductionYear">
                                            <Calendar />
                                            {t('sort_release_date', { defaultValue: 'Release Date' })}
                                        </SelectItem>
                                    </>
                                )}
                                <SelectItem value="DateCreated">
                                    <CalendarPlus />
                                    {t('sort_date_added')}
                                </SelectItem>
                                <SelectItem value="DatePlayed">
                                    <History />
                                    {t('sort_date_played')}
                                </SelectItem>
                                <SelectItem value="PlayCount">
                                    <Play />
                                    {t('sort_play_count')}
                                </SelectItem>
                                <SelectItem value="Runtime">
                                    <Clock />
                                    {t('sort_runtime')}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <Select
                            onValueChange={(value) => {
                                const nextSortOrder = value as SortOrder;
                                localStorage.setItem('pelagica_library_sort_order', nextSortOrder);
                                const params = new URLSearchParams(searchParams);
                                params.set('sortOrder', nextSortOrder);
                                params.set('page', '0');
                                setSearchParams(params);
                            }}
                            value={sortOrderParam}
                        >
                            <SelectTrigger size="sm" onKeyDown={(e) => {
                                if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                                    e.preventDefault();
                                }
                            }}>
                                <SelectValue placeholder="Order" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Ascending">
                                    <ArrowUpNarrowWideIcon />
                                    {t('ascending')}
                                </SelectItem>
                                <SelectItem value="Descending">
                                    <ArrowDownWideNarrow />
                                    {t('descending')}
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </ButtonGroup>
                </div>
                {libraryItems.map((library) => {
                    if (!library.Id) return null;

                    return (
                        <TabsContent key={library.Id} value={library.Id ?? ''}>
                            <LibraryContent
                                key={`${library.Id}-${sortByParam}-${sortOrderParam}-${itemTypeParam}`}
                                libraryId={library.Id}
                                collectionType={library.CollectionType ?? undefined}
                                sortBy={sortByParam}
                                sortOrder={sortOrderParam}
                                itemTypeFilter={itemTypeParam}
                                page={pageParam}
                                onPageChange={(nextPage) => {
                                    const params = new URLSearchParams(searchParams);
                                    params.set('page', String(nextPage));
                                    setSearchParams(params);
                                }}
                            />
                        </TabsContent>
                    );
                })}
            </Tabs>
        </Page>
    );
};

export default LibraryPage;
