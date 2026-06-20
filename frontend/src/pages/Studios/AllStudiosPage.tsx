import Page from '../Page';
import { useTranslation } from 'react-i18next';
import { useStudiosByItemCount } from '../../hooks/api/useStudiosApi';
import { StudioDisplay } from '../Home/StudiosRow';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router';
const AllStudiosPage = () => {
    const { t } = useTranslation('home');
    const navigate = useNavigate();
    const { data: studios } = useStudiosByItemCount(100);

    return (
        <Page title={t('studios')} requiresAuth={true}>
            <div className="flex flex-col gap-6 p-4 pt-16">
                <Button
                    variant="ghost"
                    size="icon"
                    className="fixed top-20 left-4 z-50 bg-background/50 hover:bg-background/80 backdrop-blur-md rounded-full shadow-md"
                    onClick={() => navigate(-1)}
                    tabIndex={-1}
                >
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <h1 className="text-3xl font-bold px-10">{t('studios')}</h1>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                    {studios
                        ? studios.map((studio) => (
                              <StudioDisplay item={studio} key={studio.id} />
                          ))
                        : Array.from({ length: 12 }).map((_, i) => (
                              <div key={i} className="w-full">
                                  <Skeleton className="w-full aspect-video rounded-md" />
                              </div>
                          ))}
                </div>
            </div>
        </Page>
    );
};

export default AllStudiosPage;
