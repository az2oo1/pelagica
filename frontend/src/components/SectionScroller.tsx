import { ChevronLeft, ChevronRight } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import {
    Carousel,
    CarouselContent,
    type CarouselApi,
} from './ui/carousel';

interface SectionScrollerProps {
    title?: React.ReactNode;
    items: React.ReactNode[];
    icon?: React.ReactNode;
    className?: string;
    additionalButtons?: React.ReactNode;
    contentInset?: boolean;
}

export default function SectionScroller({
    title,
    items,
    className,
    additionalButtons,
    contentInset = false,
}: SectionScrollerProps) {
    const [api, setApi] = useState<CarouselApi>();
    const [canScroll, setCanScroll] = useState(false);

    useEffect(() => {
        if (!api) return;

        const updateScrollability = () => {
            // Embla's scrollSnapList represents the scroll destinations.
            // If there's more than 1 destination, it means there is content to scroll.
            setCanScroll(api.scrollSnapList().length > 1);
        };

        updateScrollability();
        api.on('reInit', updateScrollability);
        api.on('select', updateScrollability);

        return () => {
            api.off('reInit', updateScrollability);
            api.off('select', updateScrollability);
        };
    }, [api, items.length]);

    const scrollPrev = () => {
        api?.scrollPrev();
    };

    const scrollNext = () => {
        api?.scrollNext();
    };

    return (
        <div className={className}>
            <div
                className={
                    'flex items-center justify-between mb-3' +
                    (contentInset ? ` px-4 sm:px-12` : '')
                }
            >
                {title ? title : <div />}

                <div className="flex gap-2">
                    <Button
                        onClick={scrollPrev}
                        disabled={!canScroll}
                        size={'icon'}
                        variant={'outline'}
                        tabIndex={-1}
                    >
                        <ChevronLeft />
                    </Button>
                    <Button
                        onClick={scrollNext}
                        disabled={!canScroll}
                        size={'icon'}
                        variant={'outline'}
                        tabIndex={-1}
                    >
                        <ChevronRight />
                    </Button>
                    {additionalButtons}
                </div>
            </div>

            <Carousel
                setApi={setApi}
                opts={{
                    align: 'start',
                    loop: true,
                }}
                className={contentInset ? 'px-4 sm:px-12 w-full' : 'w-full'}
            >
                <CarouselContent
                    className="gap-4 -ml-0"
                    onFocusCapture={(e) => {
                        if (!api) return;
                        const target = e.target as HTMLElement;
                        const slideElements = api.slideNodes();
                        const index = slideElements.findIndex((slide) =>
                            slide.contains(target)
                        );
                        if (index !== -1) {
                            api.scrollTo(index);
                        }
                    }}
                >
                    {items}
                </CarouselContent>
            </Carousel>
        </div>
    );
}
