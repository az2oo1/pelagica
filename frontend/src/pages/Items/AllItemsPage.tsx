import { useSearchParams, useNavigate } from 'react-router';
import ItemsListPage from '../../components/ItemsListPage';
import Page from '../Page';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import type { BaseItemKind, ItemSortBy, SortOrder } from '@jellyfin/sdk/lib/generated-client/models';
import { useGenericItems } from '../../hooks/api/useGenericItems';
import { useUserViews } from '@/hooks/api/useUserViews';

const AllItemsPage = () => {
    const [searchParams] = useSearchParams();
    const title = searchParams.get('title') || 'Items';
    const configJson = searchParams.get('config') || '{}';
    const navigate = useNavigate();

    const mockItem = {
        Id: configJson,
        Name: title,
        Type: 'Folder' as BaseItemKind,
    };

    const { data: userViews } = useUserViews();

    let defaultSortBy: ItemSortBy | undefined;
    let defaultSortOrder: SortOrder | undefined;
    let libraryId = '';
    try {
        const parsed = JSON.parse(configJson);
        if (parsed.sortBy && parsed.sortBy.length > 0) {
            defaultSortBy = parsed.sortBy[0] as ItemSortBy;
        }
        if (parsed.sortOrder) {
            defaultSortOrder = parsed.sortOrder as SortOrder;
        }
        libraryId = parsed.libraryId || '';
    } catch (e) {
        // ignore
    }

    const activeView = userViews?.Items?.find((view) => view.Id === libraryId);
    const isMusic = activeView?.CollectionType === 'music' || 
                    title.toLowerCase().includes('song') || 
                    title.toLowerCase().includes('music') || 
                    title.toLowerCase().includes('album');

    return (
        <Page
            title={title}
            className="flex-1 flex flex-col pt-16"
            overlayHeader={false}
            pagePadding={true}
        >
            <Button
                variant="ghost"
                size="icon"
                className="fixed top-20 left-4 z-50 bg-background/50 hover:bg-background/80 backdrop-blur-md rounded-full shadow-md"
                onClick={() => navigate(-1)}
                tabIndex={-1}
            >
                <ArrowLeft className="w-5 h-5" />
            </Button>
            <ItemsListPage
                item={mockItem}
                useItems={useGenericItems}
                defaultSortBy={defaultSortBy}
                defaultSortOrder={defaultSortOrder}
                itemAspectClass={isMusic ? 'aspect-square' : 'aspect-[2/3]'}
            />
        </Page>
    );
};

export default AllItemsPage;
