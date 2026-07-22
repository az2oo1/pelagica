import type { ContinueWatchingDetailLine, ContinueWatchingTitleLine } from '@/hooks/api/useConfig';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useLocation, useNavigate } from 'react-router';
import { getDetailLineText, getTitleLineText } from './continueWatchingLines';
import { buildPlayerUrl } from '@/utils/playerUrl';
import { Dot, ImageOff, Play } from 'lucide-react';
import { getPrimaryImageUrl, getThumbUrl } from '@/utils/jellyfinUrls';
import { Skeleton } from '@/components/ui/skeleton';
import SectionScroller from '@/components/SectionScroller';
import type { BaseItemDto } from '@jellyfin/sdk/lib/generated-client/models';
import { cn } from '@/lib/utils';
import ItemContextMenu from '@/components/ItemContextMenu';

interface BaseContinueRowProps {
    title: string;
    titleLine?: ContinueWatchingTitleLine;
    detailLine?: ContinueWatchingDetailLine[];
    items: BaseItemDto[];
    isLoading: boolean;
    error: unknown;
}

export function BaseContinueRow({
    title,
    titleLine,
    detailLine,
    items,
    isLoading,
    error,
}: BaseContinueRowProps) {
    const { t } = useTranslation('home');
    const navigate = useNavigate();
    const location = useLocation();

    const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
    const [loadedImages, setLoadedImages] = useState<Record<string, boolean>>({});

    const handleImageError = (itemId: string) => {
        setImageErrors((prev) => ({ ...prev, [itemId]: true }));
    };

    const handleImageLoad = (itemId: string) => {
        setLoadedImages((prev) => ({ ...prev, [itemId]: true }));
    };

    return (
        <>
            {error && <p>Error loading next up items: {String(error)}</p>}
            {((items && items.length > 0) || isLoading) && (
                <SectionScroller
                    title={<h2 className="text-2xl font-bold flex items-center gap-2">{title}</h2>}
                    items={
                        isLoading || !items
                            ? Array.from({ length: 5 }).map((_, index) => (
                                  <div
                                      key={index}
                                      className="group min-w-48 lg:min-w-64 2xl:min-w-80"
                                  >
                                      <Skeleton className="w-full aspect-video rounded-md mb-2" />
                                      <Skeleton className="w-32 lg:w-40 2xl:w-48 h-4 mb-2" />
                                      <Skeleton className="w-40 lg:w-52 2xl:w-64 h-3" />
                                  </div>
                              ))
                            : items.map((item) => {
                                  const watched = item.UserData?.PlaybackPositionTicks ?? 0;
                                  const runtime = item.RunTimeTicks ?? 0;
                                  const progress = runtime > 0 ? (watched / runtime) * 100 : 0;

                                  return (
                                      <ItemContextMenu item={item} key={item.Id}>
                                          <Link
                                              to={`/item/${item.Id}`}
                                              className="group w-min min-w-48 lg:min-w-64 2xl:min-w-80 block outline-none focus:outline-none focus-visible:outline-none"
                                          >
                                          <div className="relative w-full aspect-video rounded-md overflow-hidden">
                                              {imageErrors[item.Id!] ? (
                                                  <div className="w-full h-full bg-muted flex items-center justify-center rounded-md">
                                                      <ImageOff className="w-12 h-12 text-muted-foreground" />
                                                      <div className="absolute inset-0 rounded-md pointer-events-none poster-card-outline z-20" />
                                                  </div>
                                              ) : (
                                                  <>
                                                      <img
                                                          src={
                                                              item.ImageTags?.Thumb
                                                                  ? getThumbUrl(item.Id!, { width: 416 }, item.ImageTags.Thumb)
                                                                  : item.ImageTags?.Primary
                                                                  ? getPrimaryImageUrl(item.Id!, { width: 416 }, item.ImageTags.Primary)
                                                                  : item.SeriesId
                                                                  ? getPrimaryImageUrl(item.SeriesId, { width: 416 })
                                                                  : getPrimaryImageUrl(item.Id!, { width: 416 })
                                                          }
                                                          alt={item.Name || t('no_title')}
                                                          className={cn(
                                                              'w-full h-full object-cover rounded-md z-10 poster-image',
                                                              loadedImages[item.Id!]
                                                                  ? [
                                                                        'transition-[opacity,transform,scale] duration-[250ms] ease-out',
                                                                        'opacity-100 scale-100',
                                                                        'group-hover:opacity-90 group-hover:scale-105',
                                                                        'group-focus-within:opacity-90 group-focus-within:scale-105',
                                                                    ].join(' ')
                                                                  : 'opacity-0 scale-95'
                                                          )}
                                                          onLoad={() => handleImageLoad(item.Id!)}
                                                          onError={() => handleImageError(item.Id!)}
                                                      />
                                                      <Skeleton className="absolute bottom-0 left-0 right-0 top-0 -z-1" />
                                                      <div className="absolute inset-0 rounded-md pointer-events-none poster-card-outline z-20" />
                                                  </>
                                              )}
                                              {progress > 0 && (
                                                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/60 rounded-b-md overflow-hidden z-15">
                                                      <div
                                                          style={{ width: `${progress}%` }}
                                                          className="h-full bg-white/70 transition-width"
                                                      />
                                                  </div>
                                              )}
                                                <div className="absolute bottom-2 left-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 group-focus:opacity-100 transition-opacity duration-150 z-30">
                                                    <div
                                                        className="flex items-center justify-center bg-black/80 border border-white/15 rounded-full w-9 h-9 cursor-pointer hover:bg-black/90 hover:scale-110 active:scale-95 transition-all duration-200 ease-out"
                                                        role="button"
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            navigate(buildPlayerUrl(item.Id!, location.pathname + location.search));
                                                        }}
                                                    >
                                                        <Play className="w-4 h-4 text-white fill-white translate-x-px" />
                                                    </div>
                                                </div>
                                          </div>
                                          <p className="mt-2 text-sm line-clamp-1 text-ellipsis break-all">
                                              {getTitleLineText(item, titleLine, t)}
                                          </p>
                                          <div className="flex items-center space-x-0 text-xs text-muted-foreground overflow-hidden">
                                              {detailLine && detailLine.length > 0
                                                  ? detailLine.map((line, idx) => {
                                                        const detailText = getDetailLineText(
                                                            item,
                                                            line,
                                                            t
                                                        );
                                                        if (!detailText) return null;

                                                        const isLast =
                                                            idx === detailLine.length - 1;

                                                        return (
                                                            <span
                                                                key={`${item.Id}-${line}`}
                                                                className={`flex items-center ${
                                                                    isLast
                                                                        ? 'min-w-0 flex-1'
                                                                        : 'whitespace-nowrap'
                                                                }`}
                                                            >
                                                                <span
                                                                    className={`${
                                                                        isLast
                                                                            ? 'truncate'
                                                                            : 'whitespace-nowrap'
                                                                    }`}
                                                                >
                                                                    {detailText}
                                                                </span>
                                                                {!isLast && (
                                                                    <Dot className="w-5 text-muted-foreground shrink-0" />
                                                                )}
                                                            </span>
                                                        );
                                                    })
                                                  : null}
                                          </div>
                                      </Link>
                                      </ItemContextMenu>
                                  );
                              })
                    }
                    contentInset={true}
                />
            )}
        </>
    );
}

export default BaseContinueRow;
