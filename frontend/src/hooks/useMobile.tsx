import { useEffect, useState } from 'react';

export function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const mediaQuery = window.matchMedia('(max-width: 639px)');
        const updateMatch = () => setIsMobile(mediaQuery.matches);

        updateMatch();
        mediaQuery.addEventListener('change', updateMatch);

        return () => mediaQuery.removeEventListener('change', updateMatch);
    }, []);

    return isMobile;
}
