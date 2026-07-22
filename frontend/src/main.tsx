import { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from './components/theme-provider.tsx';
import { BrowserRouter, Route, Routes } from 'react-router';

import './index.css';
import './theme.css';
import './i18n.ts';
import { SearchProvider } from './context/SearchProvider.tsx';
import { SearchCommand } from './components/SearchCommand.tsx';
import { KeyboardShortcuts } from './components/KeyboardShortcuts.tsx';
import { SpatialNavigation } from './components/SpatialNavigation.tsx';
import { MusicPlaybackProvider } from './context/MusicPlaybackProvider.tsx';
import PelagicaThemeLoader from './components/PelagicaThemeProvider.tsx';
import { Toaster } from './components/ui/sonner.tsx';
import StatsConsentModal from './components/StatsConsentModal.tsx';
import { AppPreloader } from './components/AppPreloader.tsx';
import { ScrollToTop } from './components/ScrollToTop.tsx';

const HomePage = lazy(() => import('./pages/Home/HomePage.tsx'));
const LoginPage = lazy(() => import('./pages/Login/LoginPage.tsx'));
const LibraryPage = lazy(() => import('./pages/Library/LibraryPage.tsx'));
const ItemPage = lazy(() => import('./pages/Item/ItemPage.tsx'));
const StudioPage = lazy(() => import('./pages/Item/StudioPage.tsx'));
const NotFoundPage = lazy(() => import('./pages/NotFound/NotFoundPage.tsx'));
const PlayerPage = lazy(() => import('./pages/Player/PlayerPage.tsx'));
const PersonPage = lazy(() => import('./pages/Person/PersonPage.tsx'));
const SettingsPage = lazy(() => import('./pages/Settings/SettingsPage.tsx'));
const SearchPage = lazy(() => import('./pages/Search/SearchPage.tsx'));
const ThemeBrowserPage = lazy(() => import('./pages/ThemeBrowser/ThemeBrowserPage.tsx'));
const AllStudiosPage = lazy(() => import('./pages/Studios/AllStudiosPage.tsx'));
const AllItemsPage = lazy(() => import('./pages/Items/AllItemsPage.tsx'));
const PhotoViewerPage = lazy(() => import('./pages/PhotoViewer/PhotoViewerPage.tsx'));
const GenrePage = lazy(() => import('./pages/Genre/GenrePage.tsx'));
const LiveTVPage = lazy(() => import('./pages/LiveTV/LiveTVPage.tsx'));

const PageFallback = () => (
    <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
);

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000, // 5 minutes cache validity
            refetchOnWindowFocus: false, // disable refetch on window focus
        },
    },
});

createRoot(document.getElementById('root')!).render(
    <QueryClientProvider client={queryClient}>
        <ThemeProvider>
            <MusicPlaybackProvider>
                <SearchProvider>
                    <BrowserRouter>
                        <ScrollToTop />
                        <KeyboardShortcuts />
                        <SpatialNavigation />
                        <SearchCommand />
                        <PelagicaThemeLoader />
                        <Toaster />
                        <StatsConsentModal />
                        <AppPreloader>
                            <Suspense fallback={<PageFallback />}>
                                <Routes>
                                    <Route path="/" element={<HomePage />} />
                                    <Route path="/library" element={<LibraryPage />} />
                                    <Route path="/item/:itemId" element={<ItemPage />} />
                                    <Route path="/items" element={<AllItemsPage />} />
                                    <Route path="/studios" element={<AllStudiosPage />} />
                                    <Route path="/studio/:studioId" element={<StudioPage />} />
                                    <Route path="/person/:itemId" element={<PersonPage />} />
                                    <Route path="/genre/:itemId" element={<GenrePage />} />
                                    <Route path="/login" element={<LoginPage />} />
                                    <Route path="/play/:itemId" element={<PlayerPage />} />
                                    <Route path="/settings" element={<SettingsPage />} />
                                    <Route path="/browse-themes" element={<ThemeBrowserPage />} />
                                    <Route path="/search" element={<SearchPage />} />
                                    <Route path="/livetv" element={<LiveTVPage />} />
                                    <Route path="/photo/:itemId" element={<PhotoViewerPage />} />
                                    <Route path="*" element={<NotFoundPage />} />
                                </Routes>
                            </Suspense>
                        </AppPreloader>
                    </BrowserRouter>
                </SearchProvider>
            </MusicPlaybackProvider>
        </ThemeProvider>
    </QueryClientProvider>
);

