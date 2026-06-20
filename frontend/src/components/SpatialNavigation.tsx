import { useEffect } from 'react';

const getFocusableElements = (container: HTMLElement | Document = document): HTMLElement[] => {
    // Select all links, buttons, inputs, selects, textareas, and tabindex focusable elements.
    // We explicitly allow [role="tab"] and [data-slot="tabs-trigger"] to match roving-tabindex tab triggers (which can have tabindex="-1" when inactive).
    const selector = 'a[href]:not([tabindex="-1"]), button:not([disabled]):not([tabindex="-1"]), input:not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"]), [role="tab"], [data-slot="tabs-trigger"], [role="tablist"] button, [data-slot="tabs-list"] button';
    const elements = Array.from(container.querySelectorAll(selector)) as HTMLElement[];
    
    // Filter to only visible elements
    return elements.filter(el => {
        const rect = el.getBoundingClientRect();
        // Exclude elements that are extremely small/visually hidden
        if (rect.width <= 4 || rect.height <= 4) return false;
        
        // Exclude Radix focus guards and screen-reader only elements
        if (el.hasAttribute('data-radix-focus-guard') || el.closest('[data-radix-focus-guard]')) return false;
        if (el.classList.contains('sr-only') || el.closest('.sr-only')) return false;
        
        const style = window.getComputedStyle(el);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
        
        return el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0;
    });
};

export const SpatialNavigation = () => {
    useEffect(() => {
        let lastMoveTime = 0;
        // Try focusing home button on mount
        const timer = setTimeout(() => {
            const homeBtn = document.getElementById('home-nav-button');
            if (homeBtn) {
                homeBtn.focus({ preventScroll: true });
            }
        }, 150);

        const handleKeyDown = (e: KeyboardEvent) => {
            const KEY_TO_DIRECTION: Record<string, string> = {
                w: 'ArrowUp',
                W: 'ArrowUp',
                s: 'ArrowDown',
                S: 'ArrowDown',
                a: 'ArrowLeft',
                A: 'ArrowLeft',
                d: 'ArrowRight',
                D: 'ArrowRight',
            };

            const direction = KEY_TO_DIRECTION[e.key];
            if (!direction) {
                return;
            }

            const now = Date.now();
            if (now - lastMoveTime < 110) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }

            // If the user is moving very fast (e.g., holding down the key), use 'auto' (instant) 
            // so the scroll doesn't lag behind the cursor. Otherwise, use 'smooth'.
            const scrollBehavior: ScrollBehavior = now - lastMoveTime < 150 ? 'auto' : 'smooth';

            const activeEl = document.activeElement as HTMLElement;
            
            // Ignore key events if focus is inside editable fields
            const isEditable = activeEl && (
                activeEl.tagName === 'INPUT' || 
                activeEl.tagName === 'TEXTAREA' || 
                activeEl.tagName === 'SELECT' || 
                activeEl.isContentEditable
            );
            if (isEditable) {
                return;
            }

            const isMenuOpen = document.querySelector('[role="menu"], [role="listbox"], [data-slot="dropdown-menu-content"], [data-slot="select-content"]') !== null;
            const inMenuOrSelect = activeEl && (
                isMenuOpen ||
                activeEl.closest('[role="menu"], [role="listbox"], [data-slot="dropdown-menu-content"], [data-slot="dropdown-menu-sub-content"], [data-slot="select-content"]') !== null
            );
            const inTablist = activeEl && activeEl.closest('[role="tablist"], [data-slot="tabs-list"]') !== null;

            if (inMenuOrSelect || (inTablist && ['ArrowLeft', 'ArrowRight'].includes(direction))) {
                e.preventDefault();
                e.stopPropagation();
                
                const keyCodeMap: Record<string, number> = {
                    ArrowLeft: 37,
                    ArrowUp: 38,
                    ArrowRight: 39,
                    ArrowDown: 40,
                };
                const keyCode = keyCodeMap[direction];

                const event = new KeyboardEvent('keydown', {
                    key: direction,
                    code: direction,
                    keyCode: keyCode,
                    which: keyCode,
                    bubbles: true,
                    cancelable: true,
                });
                Object.defineProperty(event, 'keyCode', { value: keyCode });
                Object.defineProperty(event, 'which', { value: keyCode });
                
                activeEl.dispatchEvent(event);
                return;
            }

            // We handle the navigation, so prevent default and stop propagation (especially in capture phase)
            e.preventDefault();
            e.stopPropagation();

            // Restrict focus search to modal dialog/menu container if focus is currently inside one.
            const modalContainer = activeEl ? (activeEl.closest('[role="dialog"], [data-slot="dialog-content"], [data-slot="sheet-content"]') as HTMLElement) : null;
            const focusables = getFocusableElements(modalContainer || document);
            if (focusables.length === 0) return;

            // Default to Home button or first element if nothing or body is focused
            if (!activeEl || activeEl === document.body) {
                const homeBtn = document.getElementById('home-nav-button') || focusables[0];
                if (homeBtn) {
                    homeBtn.focus({ preventScroll: true });
                    
                    const rect = homeBtn.getBoundingClientRect();
                    const elementTop = rect.top + window.scrollY;
                    const viewportHeight = window.innerHeight;
                    const elementHeight = rect.height;
                    const targetY = elementTop - (viewportHeight - elementHeight) / 2;
                    const maxScrollY = document.documentElement.scrollHeight - viewportHeight;
                    const clampedTargetY = Math.max(0, Math.min(maxScrollY, targetY));
                    
                    window.scrollTo({ top: clampedTargetY, behavior: scrollBehavior });
                    lastMoveTime = now;
                }
                return;
            }

            const scrollY = window.scrollY;
            const scrollX = window.scrollX;

            const activeRect = activeEl.getBoundingClientRect();
            const activeCenter = {
                x: activeRect.left + activeRect.width / 2 + scrollX,
                y: activeRect.top + activeRect.height / 2 + scrollY,
            };

            const activeInHeader = activeEl.closest('header') !== null;

            // Check if there are focusable content elements (below the top bar / not in the header) above the active element
            const hasContentAbove = focusables.some(candidate => {
                if (candidate === activeEl) return false;
                if (candidate.closest('header') !== null) return false;
                const rect = candidate.getBoundingClientRect();
                return rect.bottom <= activeRect.top + 10;
            });

            const activeTablist = activeEl.closest('[role="tablist"]');
            let candidates = focusables;
            if (activeTablist && ['ArrowLeft', 'ArrowRight'].includes(direction)) {
                candidates = focusables.filter(candidate => candidate.closest('[role="tablist"]') === activeTablist);
            }

            let bestCandidate: HTMLElement | null = null;
            let minScore = Infinity;

            candidates.forEach(candidate => {
                if (candidate === activeEl) return;

                if (['ArrowUp', 'ArrowDown'].includes(direction)) {
                    const activeCarousel = activeEl.closest('[data-slot="carousel-content"]');
                    const candidateCarousel = candidate.closest('[data-slot="carousel-content"]');
                    if (activeCarousel && activeCarousel === candidateCarousel) {
                        return;
                    }
                }

                const candidateRect = candidate.getBoundingClientRect();
                const candidateCenter = {
                    x: candidateRect.left + candidateRect.width / 2 + scrollX,
                    y: candidateRect.top + candidateRect.height / 2 + scrollY,
                };

                const dx = candidateCenter.x - activeCenter.x;
                const dy = candidateCenter.y - activeCenter.y;

                let isCorrectDirection = false;
                let score = 0;

                const activeTablist = activeEl.closest('[role="tablist"]');
                const candidateTablist = candidate.closest('[role="tablist"]');
                const isSameTablist = activeTablist !== null && activeTablist === candidateTablist;

                // Move calculation weights: prioritize closer elements along the primary axis,
                // and penalize orthogonal deviation (multiplying by 4 to prefer horizontal align when moving horizontally)
                if (direction === 'ArrowRight') {
                    const isSameRow = isSameTablist || Math.abs(dy) <= 50;
                    isCorrectDirection = dx > 0.1 && isSameRow;
                    score = dx + Math.abs(dy) * 4;
                } else if (direction === 'ArrowLeft') {
                    const isSameRow = isSameTablist || Math.abs(dy) <= 50;
                    isCorrectDirection = dx < -0.1 && isSameRow;
                    score = Math.abs(dx) + Math.abs(dy) * 4;
                } else if (direction === 'ArrowDown') {
                    isCorrectDirection = dy > 0.1;
                    score = dy + Math.abs(dx) * 4;
                } else if (direction === 'ArrowUp') {
                    isCorrectDirection = dy < -0.1;
                    const candidateInHeader = candidate.closest('header') !== null;
                    // If we are in the content area and there is content above us, exclude header elements
                    if (!activeInHeader && hasContentAbove && candidateInHeader) {
                        isCorrectDirection = false;
                    }
                    score = Math.abs(dy) + Math.abs(dx) * 4;
                    // If moving from the topmost content into the header, prioritize the Home button
                    if (!activeInHeader && !hasContentAbove && candidateInHeader) {
                        if (candidate.id === 'home-nav-button') {
                            score = Math.abs(dy) - 1000;
                        }
                    }
                }

                if (isCorrectDirection && score < minScore) {
                    minScore = score;
                    bestCandidate = candidate;
                }
            });

            // Carousel looping fallback:
            // If we didn't find any candidate in the visual direction, but we are inside a carousel and moving horizontally,
            // we manually target the opposite visual boundary (first/last element) in that same carousel.
            if (!bestCandidate && ['ArrowLeft', 'ArrowRight'].includes(direction)) {
                const carouselContent = activeEl.closest('[data-slot="carousel-content"]');
                if (carouselContent) {
                    const carouselFocusables = getFocusableElements(carouselContent as HTMLElement);
                    if (carouselFocusables.length > 0) {
                        if (direction === 'ArrowRight') {
                            bestCandidate = carouselFocusables[0];
                        } else if (direction === 'ArrowLeft') {
                            bestCandidate = carouselFocusables[carouselFocusables.length - 1];
                        }
                    }
                }
            }

            // If we moved vertically (Up/Down) from OUTSIDE a carousel into INSIDE a carousel,
            // override bestCandidate to be the first focusable element (leftmost) of that carousel row.
            if (bestCandidate && ['ArrowDown', 'ArrowUp'].includes(direction)) {
                const activeCarousel = activeEl.closest('[data-slot="carousel-content"]');
                const targetCarousel = bestCandidate.closest('[data-slot="carousel-content"]');
                if (!activeCarousel && targetCarousel) {
                    const carouselFocusables = getFocusableElements(targetCarousel as HTMLElement);
                    if (carouselFocusables.length > 0) {
                        bestCandidate = carouselFocusables[0];
                    }
                }
            }

            // Special rule: if moving down from the Home navigation button, and a play button exists on the page, target it.
            if (direction === 'ArrowDown' && (activeEl.id === 'home-nav-button' || activeEl.closest('#home-nav-button'))) {
                const playButton = document.getElementById('play-button');
                if (playButton) {
                    bestCandidate = playButton;
                }
            }

            if (bestCandidate) {
                const element = bestCandidate as HTMLElement;
                element.focus({ preventScroll: true });
                
                const isHorizontal = ['ArrowLeft', 'ArrowRight'].includes(direction);
                
                const inCarousel = element.closest('[data-slot="carousel"]') !== null;

                if (!inCarousel || !isHorizontal) {
                    if (modalContainer) {
                        element.scrollIntoView({
                            behavior: 'smooth',
                            block: isHorizontal ? 'nearest' : 'center',
                            inline: 'nearest',
                        });
                    } else {
                        if (isHorizontal) {
                            const parent = element.parentElement;
                            if (parent && element === parent.firstElementChild) {
                                parent.scrollTo({ left: 0, behavior: 'smooth' });
                            } else {
                                element.scrollIntoView({
                                    behavior: 'smooth',
                                    block: 'nearest',
                                    inline: 'start',
                                });
                            }
                        } else {
                            const rect = element.getBoundingClientRect();
                            const elementTop = rect.top + window.scrollY;
                            const elementHeight = rect.height;
                            const viewportHeight = window.innerHeight;
                            const targetY = elementTop - (viewportHeight - elementHeight) / 2;
                            const maxScrollY = document.documentElement.scrollHeight - viewportHeight;
                            const clampedTargetY = Math.max(0, Math.min(maxScrollY, targetY));
                            
                            // Use custom high-performance lerp scrolling for vertical navigation
                            if ((window as any).__spatialTargetY === undefined) {
                                (window as any).__spatialTargetY = window.scrollY;
                            }
                            (window as any).__spatialTargetY = clampedTargetY;

                            if (!(window as any).__spatialIsAnimating) {
                                (window as any).__spatialIsAnimating = true;

                                const loop = () => {
                                    const currentY = window.scrollY;
                                    const target = (window as any).__spatialTargetY;
                                    const distance = target - currentY;

                                    if (Math.abs(distance) < 1 || (window as any).__spatialCancelAnimation) {
                                        window.scrollTo(0, target);
                                        (window as any).__spatialIsAnimating = false;
                                        (window as any).__spatialCancelAnimation = false;
                                        return;
                                    }

                                    // Move 35% of the distance each frame for a snappy but smooth motion
                                    window.scrollTo(0, currentY + distance * 0.35);
                                    requestAnimationFrame(loop);
                                };

                                requestAnimationFrame(loop);
                            }
                        }
                    }
                }
                lastMoveTime = now;
            }
        };

        // Attach event listener in the capture phase to intercept keys before component-specific roving handlers
        window.addEventListener('keydown', handleKeyDown, { capture: true });

        // Gamepad polling setup
        let gamepadRequestRef: number;
        const buttonStates = new Map<number, boolean>();
        const axesStates = { x: 0, y: 0 };
        const AXIS_THRESHOLD = 0.5;

        const pollGamepad = () => {
            const gamepads = navigator.getGamepads();
            for (let i = 0; i < gamepads.length; i++) {
                const gp = gamepads[i];
                if (!gp) continue;

                gp.buttons.forEach((btn, index) => {
                    const pressed = btn.pressed;
                    const prevPressed = buttonStates.get(index) || false;

                    if (pressed && !prevPressed) {
                        handleGamepadButtonDown(index);
                    }
                    buttonStates.set(index, pressed);
                });

                if (gp.axes.length >= 2) {
                    const xVal = gp.axes[0];
                    const yVal = gp.axes[1];

                    if (Math.abs(xVal) > AXIS_THRESHOLD) {
                        if (axesStates.x === 0) {
                            dispatchFakeKeyEvent(xVal > 0 ? 'd' : 'a');
                            axesStates.x = Math.sign(xVal);
                        }
                    } else {
                        axesStates.x = 0;
                    }

                    if (Math.abs(yVal) > AXIS_THRESHOLD) {
                        if (axesStates.y === 0) {
                            dispatchFakeKeyEvent(yVal > 0 ? 's' : 'w');
                            axesStates.y = Math.sign(yVal);
                        }
                    } else {
                        axesStates.y = 0;
                    }
                }
            }
            gamepadRequestRef = requestAnimationFrame(pollGamepad);
        };

        const dispatchFakeKeyEvent = (key: string) => {
            const event = new KeyboardEvent('keydown', {
                key,
                code: key,
                bubbles: true,
                cancelable: true,
            });
            const activeEl = document.activeElement || document.body;
            activeEl.dispatchEvent(event);
        };

        const handleGamepadButtonDown = (buttonIndex: number) => {
            switch (buttonIndex) {
                case 12:
                    dispatchFakeKeyEvent('w');
                    break;
                case 13:
                    dispatchFakeKeyEvent('s');
                    break;
                case 14:
                    dispatchFakeKeyEvent('a');
                    break;
                case 15:
                    dispatchFakeKeyEvent('d');
                    break;
                case 0: {
                    const activeEl = document.activeElement as HTMLElement;
                    if (activeEl) {
                        activeEl.click();
                    }
                    break;
                }
                case 1: {
                    const isMenuOpen = document.querySelector('[role="menu"], [role="listbox"], [data-slot="dropdown-menu-content"], [data-slot="select-content"], [data-slot="dialog-content"]') !== null;
                    if (isMenuOpen) {
                        dispatchFakeKeyEvent('Escape');
                    } else {
                        if (window.location.pathname !== '/') {
                            window.history.back();
                        }
                    }
                    break;
                }
                case 2: { // Square (Playstation) / X (Xbox)
                    const activeEl = document.activeElement as HTMLElement;
                    if (activeEl) {
                        const rect = activeEl.getBoundingClientRect();
                        const event = new MouseEvent('contextmenu', {
                            bubbles: true,
                            cancelable: true,
                            clientX: rect.left + rect.width / 2,
                            clientY: rect.top + rect.height / 2,
                        });
                        activeEl.dispatchEvent(event);
                    }
                    break;
                }
            }
        };

        gamepadRequestRef = requestAnimationFrame(pollGamepad);

        const cancelAnimation = () => {
            (window as any).__spatialCancelAnimation = true;
        };

        window.addEventListener('wheel', cancelAnimation, { passive: true });
        window.addEventListener('touchstart', cancelAnimation, { passive: true });
        window.addEventListener('mousedown', cancelAnimation, { passive: true });

        return () => {
            clearTimeout(timer);
            window.removeEventListener('keydown', handleKeyDown, { capture: true });
            cancelAnimationFrame(gamepadRequestRef);
            window.removeEventListener('wheel', cancelAnimation);
            window.removeEventListener('touchstart', cancelAnimation);
            window.removeEventListener('mousedown', cancelAnimation);
        };
    }, []);

    return null;
};

export default SpatialNavigation;
