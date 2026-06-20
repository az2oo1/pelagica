import { useState, useEffect, useRef, type PropsWithChildren } from 'react';

interface LazyRowProps {
    placeholderHeight?: string;
}

export const LazyRow = ({ children, placeholderHeight = '280px' }: PropsWithChildren<LazyRowProps>) => {
    const [isIntersected, setIsIntersected] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (isIntersected) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsIntersected(true);
                }
            },
            {
                rootMargin: '250px 0px', // Preload when the row is within 250px of the viewport
            }
        );

        const currentRef = ref.current;
        if (currentRef) {
            observer.observe(currentRef);
        }

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, [isIntersected]);

    return (
        <div ref={ref} style={{ minHeight: isIntersected ? 'auto' : placeholderHeight }}>
            {isIntersected ? children : null}
        </div>
    );
};

export default LazyRow;
