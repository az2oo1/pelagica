import { useParams, useSearchParams, useNavigate } from 'react-router';
import { useStudioItems } from '../../hooks/api/useStudioItems';
import ItemsListPage from '../../components/ItemsListPage';
import Page from '../Page';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

import type { BaseItemKind } from '@jellyfin/sdk/lib/generated-client/models';

const StudioPage = () => {
    const { studioId } = useParams<{ studioId: string }>();
    const [searchParams] = useSearchParams();
    const studioName = searchParams.get('name') || 'Studio';
    const navigate = useNavigate();

    const mockItem = {
        Id: studioId,
        Name: studioName,
        Type: 'Studio' as BaseItemKind,
    };

    return (
        <Page
            title={studioName}
            className="flex-1 flex flex-col pt-16"
            overlayHeader={false}
            pagePadding={true}
        >
            <Button
                variant="ghost"
                size="icon"
                className="fixed top-20 left-4 z-50 bg-background/50 hover:bg-background/80 backdrop-blur-md rounded-full shadow-md"
                onClick={() => navigate(-1)}
            >
                <ArrowLeft className="w-5 h-5" />
            </Button>
            <ItemsListPage item={mockItem} useItems={useStudioItems} />
        </Page>
    );
};

export default StudioPage;
