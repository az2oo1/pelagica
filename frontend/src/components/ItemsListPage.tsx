import { Skeleton } from '@/components/ui/skeleton';
import { getPrimaryImageUrl } from '@/utils/jellyfinUrls';
import type { BaseItemDto, ItemSortBy, SortOrder } from '@jellyfin/sdk/lib/generated-client/models';
import {
    ArrowDownWideNarrow,
    ArrowUpNarrowWideIcon,
    Calendar,
    CalendarPlus,
    CaseSensitive,
    Clock,
    Star,
    Shuffle,
    Award,
    History,
    Shield,
    Play,
} from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import ItemPagination from '@/components/ItemPagination';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ButtonGroup } from '@/components/ui/button-group';
import LibraryItem from '../Library/LibraryItem';

const ITEM_ROWS = 5;
const DEFAULT_SORT_BY: ItemSortBy = 'Name';
const DEFAULT_SORT_ORDER: SortOrder = 'Ascending';

function getColumnCount(width: number): number {
    if (width >= 1536) return 9; // 2xl
    if (width >= 1280) return 7; // xl
    if (width >= 1024) return 5; // lg
    if (width >= 768) return 4; // md
    if (width >= 640) return 3; // sm
    return 2;
}

export interface ItemsQueryParams {
    sortBy: ItemSortBy[];
    sortOrder: SortOrder[];
    limit: number;
    startIndex: number;
}

export interface ItemsQueryResult {
    data:
        | {
              items?: BaseItemDto[] | null;
              totalCount?: number | null;
          }
        | undefined;
    isLoading: boolean;
    error: unknown;
}

/**
 * Hook signature expected by ItemsListPage.
 * e.g. useGenreItems(id, params) or useStudioItems(id, params)
 */
export type UseItemsHook = (id: string, params: ItemsQueryParams) => ItemsQueryResult;

export interface ItemsListPageProps {
    /** The parent item (genre, studio, etc.) — used for id + title */
    item: BaseItemDto;
    /** The hook used to fetch children for this item */
    useItems: UseItemsHook;
    /** Poster aspect ratio class for grid items */
    itemAspectClass?: string;
    /** Override the list heading (defaults to item name) */
    listTitle?: string;
    /** Optional render prop to overlay something on each poster (e.g. WatchedStateBadge) */
    renderItemOverlay?: (item: BaseItemDto) => ReactNode;
    defaultSortBy?: ItemSortBy;
    defaultSortOrder?: SortOrder;
}

const ItemsListPage = ({
    item,
    useItems,
    itemAspectClass = 'aspect-[2/3]',
    listTitle,
    renderItemOverlay,
    defaultSortBy,
    defaultSortOrder,
}: ItemsListPageProps) => {
    const { t } = useTranslation(['item', 'library']);
    const [searchParams, setSearchParams] = useSearchParams();
    const pageParam = parseInt(searchParams.get('page') ?? '0', 10);
    const sortByParam = (searchParams.get('sortBy') as ItemSortBy) || defaultSortBy || DEFAULT_SORT_BY;
    const sortOrderParam = (searchParams.get('sortOrder') as SortOrder) || defaultSortOrder || DEFAULT_SORT_ORDER;
    const [page, setPage] = useState<number>(Number.isNaN(pageParam) ? 0 : pageParam);
    const [sortBy, setSortBy] = useState<ItemSortBy>(sortByParam);
    const [sortOrder, setSortOrder] = useState<SortOrder>(sortOrderParam);
    const [pageSize, setPageSize] = useState(
        () => getColumnCount(typeof window !== 'undefined' ? window.innerWidth : 640) * ITEM_ROWS
    );

    const updateSearchParams = (
        nextPage: number,
        nextSortBy = sortBy,
        nextSortOrder = sortOrder
    ) => {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('page', String(nextPage));
        nextParams.set('sortBy', nextSortBy);
        nextParams.set('sortOrder', nextSortOrder);
        setSearchParams(nextParams);
    };

    useEffect(() => {
        const handleResize = () => {
            const newPageSize = getColumnCount(window.innerWidth) * ITEM_ROWS;
            setPageSize(newPageSize);
            setPage(0);
            updateSearchParams(0);
        };

        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const {
        data: items,
        isLoading: loadingItems,
        error,
    } = useItems(item.Id!, {
        sortBy: [sortBy],
        sortOrder: [sortOrder],
        limit: pageSize,
        startIndex: page * pageSize,
    });

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        updateSearchParams(newPage);
    };

    const handleSortChange = (newSortBy: ItemSortBy) => {
        setSortBy(newSortBy);
        setPage(0);
        updateSearchParams(0, newSortBy, sortOrder);
    };

    const handleSortOrderChange = (newSortOrder: SortOrder) => {
        setSortOrder(newSortOrder);
        setPage(0);
        updateSearchParams(0, sortBy, newSortOrder);
    };

    const totalPages = items?.totalCount ? Math.ceil(items.totalCount / pageSize) : 0;
    const gridCols =
        'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 2xl:grid-cols-9';

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h2 className="text-2xl font-bold">{listTitle ?? item.Name}</h2>
                <ButtonGroup>
                    <Select onValueChange={handleSortChange} value={sortBy}>
                        <SelectTrigger size="sm">
                            <SelectValue placeholder="Sort" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Name">
                                <CaseSensitive />
                                {t('library:sort_name')}
                            </SelectItem>
                            <SelectItem value="Random">
                                <Shuffle />
                                {t('library:sort_random')}
                            </SelectItem>
                            <SelectItem value="CommunityRating">
                                <Star />
                                {t('library:sort_community_rating')}
                            </SelectItem>
                            <SelectItem value="CriticRating">
                                <Award />
                                {t('library:sort_critic_rating')}
                            </SelectItem>
                            <SelectItem value="DateCreated">
                                <CalendarPlus />
                                {t('library:sort_date_added')}
                            </SelectItem>
                            <SelectItem value="DateLastPlayed">
                                <History />
                                {t('library:sort_date_played')}
                            </SelectItem>
                            <SelectItem value="OfficialRating">
                                <Shield />
                                {t('library:sort_parental_rating')}
                            </SelectItem>
                            <SelectItem value="PlayCount">
                                <Play />
                                {t('library:sort_play_count')}
                            </SelectItem>
                            <SelectItem value="PremiereDate">
                                <Calendar />
                                {t('library:sort_premiere_date')}
                            </SelectItem>
                            <SelectItem value="Runtime">
                                <Clock />
                                {t('library:sort_runtime')}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                    <Select onValueChange={handleSortOrderChange} value={sortOrder}>
                        <SelectTrigger size="sm">
                            <SelectValue placeholder="Order" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Ascending">
                                <ArrowUpNarrowWideIcon />
                                {t('library:ascending')}
                            </SelectItem>
                            <SelectItem value="Descending">
                                <ArrowDownWideNarrow />
                                {t('library:descending')}
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </ButtonGroup>
            </div>

            {loadingItems && (
                <div className={`w-full gap-4 mt-2 grid ${gridCols}`}>
                    {Array.from({ length: pageSize }).map((_, i) => (
                        <div key={i} className="p-0 m-0">
                            <div
                                className={`relative w-full ${itemAspectClass} overflow-hidden rounded-md`}
                            >
                                <Skeleton className="w-full h-full" />
                            </div>
                            <Skeleton className="mt-2 h-4 w-3/4" />
                            <Skeleton className="mt-1 h-3 w-1/4" />
                        </div>
                    ))}
                </div>
            )}

            {!!error && (
                <p className="text-red-500">
                    Error loading items: {error instanceof Error ? error.message : String(error)}
                </p>
            )}

            {!loadingItems && !error && items && (
                <>
                    <ul className={`gw-full gap-4 grid ${gridCols}`}>
                        {items?.items?.map((child) => (
                            <LibraryItem
                                key={child.Id}
                                item={child}
                                posterUrl={getPrimaryImageUrl(
                                    (child.Type === 'Episode' ? child.SeriesPrimaryImageTag || child.Id : child.Id) || '',
                                    undefined,
                                    (child.Type === 'Episode' ? child.SeriesPrimaryImageTag || undefined : child.ImageTags?.Primary) || undefined
                                )}
                                t={t}
                                posterAspectRatio={
                                    child.Type === 'MusicAlbum' ||
                                    child.Type === 'Audio' ||
                                    child.Type === 'MusicArtist'
                                        ? 'square'
                                        : itemAspectClass.replace('aspect-', '').replace('[', '').replace(']', '').replace('/', '/')
                                }
                                detailLine={
                                    child.PremiereDate ? (
                                        <span>{new Date(child.PremiereDate).getFullYear()}</span>
                                    ) : undefined
                                }
                                overlay={renderItemOverlay?.(child)}
                            />
                        ))}
                    </ul>
                    <ItemPagination
                        totalPages={totalPages}
                        currentPage={page}
                        onPageChange={handlePageChange}
                    />
                </>
            )}
        </div>
    );
};

export default ItemsListPage;
