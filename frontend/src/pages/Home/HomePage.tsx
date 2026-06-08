import Page from '../Page';
import { useUserViews } from '@/hooks/api/useUserViews';
import { useConfig, type DetailField } from '@/hooks/api/useConfig';
import MediaBar from './MediaBar';
import ItemsRow from './ItemsRow';
import ContinueWatchingRow from './ContinueWatchingRow';
import { useTranslation } from 'react-i18next';
import RecommendedItemsRow from './RecommendedItemsRow';
import NextUpRow from './NextUpRow';
import ResumeRow from './ResumeRow';
import type { CollectionType } from '@jellyfin/sdk/lib/generated-client/models';
import GenresRow from './GenresRow';
import LibrariesRow from './LibrariesRow';
import StudiosRow from './StudiosRow';
import LazyRow from '@/components/LazyRow';

function getDetailFieldsForCollectionType(type: CollectionType | undefined): DetailField[] {
    switch (type) {
        case 'music':
            return ['Artist'];
        case 'playlists':
            return ['TrackCount'];
        default:
            return ['ReleaseYear'];
    }
}

const HomePage = () => {
    const { t } = useTranslation('home');
    const { data: userViews } = useUserViews();
    const { config } = useConfig();

    return (
        <Page
            title={config?.serverName || 'Pelagica'}
            requiresAuth={true}
            overlayHeader={true}
            pagePadding={false}
        >
            <div className="flex flex-col gap-4 pb-4">
                {config.homeScreenSections?.map((section, index) => {
                    if (section.enabled === false) return null;

                    switch (section.type) {
                        case 'studios':
                            return (
                                <LazyRow key={index} placeholderHeight="140px">
                                    <StudiosRow
                                        title={section.title || t('studios')}
                                        limit={section.limit}
                                    />
                                </LazyRow>
                            );
                        case 'libraries':
                            return (
                                <LazyRow key={index} placeholderHeight="150px">
                                    <LibrariesRow title={section.title || t('libraries')} />
                                </LazyRow>
                            );

                        case 'continueWatching':
                            return (
                                <LazyRow key={index} placeholderHeight="280px">
                                    <ContinueWatchingRow
                                        title={section.title || t('continue_watching')}
                                        titleLine={section.titleLine}
                                        detailLine={
                                            section.detailLine !== undefined
                                                ? section.detailLine
                                                : ['TimeRemaining']
                                        }
                                        limit={section.limit || 20}
                                        accurateSorting={section.accurateSorting}
                                    />
                                </LazyRow>
                            );

                        case 'nextUp':
                            return (
                                <LazyRow key={index} placeholderHeight="280px">
                                    <NextUpRow
                                        title={section.title || t('next_up')}
                                        titleLine={section.titleLine}
                                        detailLine={
                                            section.detailLine !== undefined
                                                ? section.detailLine
                                                : ['TimeRemaining']
                                        }
                                        limit={section.limit || 20}
                                    />
                                </LazyRow>
                            );

                        case 'resume':
                            return (
                                <LazyRow key={index} placeholderHeight="280px">
                                    <ResumeRow
                                        title={section.title || t('resume')}
                                        titleLine={section.titleLine}
                                        detailLine={
                                            section.detailLine !== undefined
                                                ? section.detailLine
                                                : ['TimeRemaining']
                                        }
                                        limit={section.limit || 20}
                                    />
                                </LazyRow>
                            );

                        case 'mediaBar':
                            return (
                                <MediaBar
                                    key={index}
                                    size={section.size}
                                    itemsConfig={section.items}
                                    title={section.title}
                                    showFavoriteButton={section.showFavoriteButton}
                                    showWatchlistButton={section.showWatchlistButton}
                                    fadeTop={index != 0}
                                />
                            );

                        case 'recentlyAdded': {
                            const allowedTypes = (section as any).types !== undefined
                                ? (section as any).types
                                : [
                                    'Movie',
                                    'Series',
                                    'MusicAlbum',
                                ];
                            const allowedCollectionTypes = allowedTypes.flatMap((t: string) => {
                                switch (t) {
                                    case 'Movie': return ['movies'];
                                    case 'Series': return ['tvshows'];
                                    case 'MusicAlbum': return ['music'];
                                    case 'Playlist': return ['playlists'];
                                    case 'BoxSet': return ['boxsets'];
                                    default: return [];
                                }
                            });

                            return (
                                <div key={index} className="flex flex-col gap-4">
                                    {userViews && userViews.Items ? (
                                        <>
                                            {userViews.Items.filter((view) => 
                                                !view.CollectionType || allowedCollectionTypes.includes(view.CollectionType)
                                            ).map((view) => {
                                                const title = t('recently_added', {
                                                                category: view.Name,
                                                            });
                                                const itemsConfig = {
                                                                libraryId: view.Id,
                                                                sortBy: ['DateCreated'],
                                                                sortOrder: 'Descending',
                                                                limit: section.limit || 10,
                                                                types: allowedTypes,
                                                            };
                                                return (
                                                    <LazyRow key={view.Id} placeholderHeight="320px">
                                                        <div data-library-id={view.Id}>
                                                            {view.Id && view.Name && (
                                                                <ItemsRow
                                                                    title={title}
                                                                    allLink={`/library?library=${view.Id}&page=0&sortBy=DateCreated&sortOrder=Descending`}
                                                                    items={itemsConfig as any}
                                                                    detailFields={getDetailFieldsForCollectionType(
                                                                        view.CollectionType
                                                                    )}
                                                                />
                                                            )}
                                                        </div>
                                                    </LazyRow>
                                                );
                                            })}
                                        </>
                                    ) : (
                                        <p>Loading user views...</p>
                                    )}
                                </div>
                            );
                        }

                        case 'items':
                            return (
                                <LazyRow key={index} placeholderHeight="320px">
                                    <ItemsRow
                                        title={section.title}
                                        allLink={section.allLink || `/items?title=${encodeURIComponent(section.title || 'Items')}&config=${encodeURIComponent(JSON.stringify(section.items || {}))}`}
                                        items={section.items}
                                        detailFields={
                                            section.detailFields && section.detailFields.length > 0
                                                ? section.detailFields
                                                : ['ReleaseYear']
                                        }
                                    />
                                </LazyRow>
                            );

                        case 'streamystatsRecommended':
                            return (
                                <LazyRow key={index} placeholderHeight="320px">
                                    <RecommendedItemsRow
                                        title={section.title || t('recommended_for_you')}
                                        type={section.recommendationType}
                                        limit={section.limit}
                                        showSimilarity={section.showSimilarity}
                                        showBasedOn={section.showBasedOn}
                                    />
                                </LazyRow>
                            );

                        case 'genres':
                            return (
                                <LazyRow key={index} placeholderHeight="140px">
                                    <GenresRow
                                        title={section.title || t('genres')}
                                        limit={section.limit}
                                    />
                                </LazyRow>
                            );

                        default:
                            return null;
                    }
                })}
            </div>
        </Page>
    );
};

export default HomePage;
