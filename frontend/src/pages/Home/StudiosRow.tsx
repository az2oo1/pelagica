import SectionScroller from '@/components/SectionScroller';
import { Skeleton } from '@/components/ui/skeleton';
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router';
import { ChevronRight } from 'lucide-react';
import { useStudiosByItemCount } from '../../hooks/api/useStudiosApi';
import { getStudioImageUrl } from '@/utils/jellyfinUrls';
import { cn } from '@/lib/utils';

interface StudiosRowProps {
    title?: string;
    limit?: number;
}

const getStudioTrademarkColor = (name: string): string => {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('marvel')) return '#E21227';
    if (lowerName.includes('dc films') || lowerName.includes('dc studios') || lowerName === 'dc') return '#002D62';
    // Match specific sub-brands first
    if (lowerName.includes('warner bros. animation') || lowerName.includes('warner bros animation')) return '#FFC72C'; // WB Animation Gold/Yellow
    if (lowerName.includes('warner bros') || lowerName.includes('warner pictures') || lowerName.includes('warnerbros')) return '#002561';
    if (lowerName.includes('universal pictures') || lowerName.includes('universal-pictures') || lowerName.includes('universal studios') || lowerName === 'universal') return '#1E3E8C';
    if (lowerName.includes('paramount')) return '#0062AF';
    if (lowerName.includes('disney') || lowerName.includes('walt disney')) return '#00aeef';
    if (lowerName.includes('columbia')) return '#0A192F';
    if (lowerName.includes('sony')) return '#0A1C3C';
    if (lowerName.includes('20th century') || lowerName.includes('20th-century') || lowerName.includes('fox searchlight') || lowerName.includes('fox studios')) return '#D4AF37';
    if (lowerName.includes('mgm') || lowerName.includes('metro-goldwyn-mgayer') || lowerName.includes('metro goldwyn')) return '#C59B27';
    if (lowerName.includes('dreamworks') || lowerName.includes('dream-works')) return '#00A3E0';
    if (lowerName.includes('pixar')) return '#005C8A';
    if (lowerName.includes('netflix')) return '#E50914';
    if (lowerName.includes('amazon')) return '#FF9900';
    if (lowerName.includes('apple')) return '#555555';
    if (lowerName.includes('hbo')) return '#6A1B9A';
    if (lowerName.includes('a24')) return '#FF9E1B';
    if (lowerName.includes('ghibli') || lowerName.includes('studio ghibli')) return '#4D9EAD';
    if (lowerName.includes('lionsgate') || lowerName.includes('lions-gate')) return '#D1A153';
    if (lowerName.includes('miramax')) return '#8B0000';
    if (lowerName.includes('new line')) return '#0D47A1';
    if (lowerName.includes('lucasfilm')) return '#C29B38';
    if (lowerName.includes('legendary')) return '#C29B38';
    if (lowerName.includes('focus features')) return '#D81B60';
    if (lowerName.includes('toho')) return '#E50012';
    if (lowerName.includes('searchlight')) return '#E5A823';
    if (lowerName.includes('blumhouse')) return '#1A237E';
    if (lowerName.includes('illumination')) return '#FFF000';
    if (lowerName.includes('tsg')) return '#D4AF37'; // TSG Gold
    if (lowerName.includes('thunder road')) return '#111111'; // Thunder Road Black (contrasts neon blue logo)
    if (lowerName.includes('regenc')) return '#0055A5'; // Regency Royal Blue
    if (lowerName.includes('87eleven')) return '#1A1A1A'; // 87Eleven Dark Gray
    if (lowerName.includes('touchstone')) return '#0A1C3C'; // Touchstone Dark Blue
    
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    const saturation = 80;
    const lightness = 45;
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};


export const StudioDisplay = ({
    item,
}: {
    item: {
        id: string;
        name: string;
        count: number;
        thumbType?: string;
    };
}) => {
    const [imageError, setImageError] = useState(false);
    const [isImageLoaded, setIsImageLoaded] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [isLogo, setIsLogo] = useState(item.thumbType === 'logo');
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        if (isHovered) {
            video.play().catch((err) => {
                console.warn('Video play failed:', err);
            });
        } else {
            video.pause();
            video.currentTime = 0;
        }
    }, [isHovered]);

    return (
        <Link
            to={`/studio/${item.id}?name=${encodeURIComponent(item.name)}`}
            key={item.id}
            className={'group w-min min-w-36 lg:min-w-48 2xl:min-w-64 outline-none focus:outline-none focus-visible:outline-none'}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onFocus={() => setIsHovered(true)}
            onBlur={() => setIsHovered(false)}
        >
            <div 
                className={cn(
                    "relative w-full aspect-video rounded-md overflow-hidden flex items-center justify-center transition-all duration-500",
                    !isLogo && "bg-muted"
                )}
                style={isLogo ? { backgroundColor: getStudioTrademarkColor(item.name) } : undefined}
            >
                {imageError ? (
                    <div className="flex flex-col items-center justify-center p-3 text-center w-full h-full bg-gradient-to-br from-neutral-800 to-neutral-900 border border-white/5">
                        <span className="font-extrabold text-xs sm:text-sm lg:text-base tracking-widest text-neutral-300 drop-shadow-md uppercase break-words px-2 font-mono">
                            {item.name}
                        </span>
                    </div>
                ) : (
                    <>
                        <img
                            src={getStudioImageUrl(item.name)}
                            alt={item.name || 'No Name'}
                            className={cn(
                                'absolute inset-0 w-full h-full transform-gpu will-change-transform z-10 poster-image transition-all duration-500',
                                isLogo ? 'object-contain p-4' : 'object-cover',
                                isImageLoaded
                                    ? 'blur-0 opacity-100 scale-100'
                                    : 'blur-md opacity-0 scale-95',
                                isImageLoaded && isHovered ? 'scale-110 opacity-0' : 'scale-100 opacity-100'
                            )}
                            onLoad={(e) => {
                                setIsImageLoaded(true);
                                const src = e.currentTarget.currentSrc || '';
                                if (src.includes('tmdb.org') || item.thumbType === 'logo') {
                                    setIsLogo(true);
                                }
                            }}
                            onError={() => setImageError(true)}
                        />
                        {!isImageLoaded && <Skeleton className="absolute inset-0 z-0" />}
                    </>
                )}
                <div className="absolute inset-0 rounded-md pointer-events-none poster-card-outline z-40" />

                <video
                    ref={videoRef}
                    src={`/api/studios/search/video?name=${encodeURIComponent(item.name)}`}
                    className={cn(
                        "absolute inset-0 w-full h-full object-cover z-30 pointer-events-none transition-all duration-500",
                        isHovered ? "opacity-100 scale-100" : "opacity-0 scale-95 pointer-events-none"
                    )}
                    preload="auto"
                    loop
                    muted
                    playsInline
                />
            </div>
        </Link>
    );
};

const StudiosRow = ({ title, limit }: StudiosRowProps) => {
    const { data: studios, isLoading } = useStudiosByItemCount(limit);

    if ((!studios || studios.length === 0) && !isLoading) {
        return null;
    }

    return (
        <SectionScroller
            className="max-w-full"
            title={
                <Link to="/studios" className="flex items-center gap-1 group cursor-pointer w-fit hover:text-primary transition-colors" tabIndex={-1}>
                    <h2 className="text-2xl font-bold">{title}</h2>
                    <ChevronRight className="w-7 h-7 opacity-50 group-hover:opacity-100 transition-opacity" />
                </Link>
            }
            items={
                studios
                    ? studios.map((studio) => <StudioDisplay item={studio} key={studio.id} />)
                    : Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="w-min min-w-36 lg:min-w-48 2xl:min-w-64">
                              <Skeleton className="w-full aspect-video rounded-md" />
                          </div>
                      ))
            }
            contentInset={true}
        />
    );
};

export default StudiosRow;
