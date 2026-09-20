import '@testing-library/jest-dom/vitest';

import { createElement } from 'react';

import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

vi.mock('@iconify/react', () => ({
    Icon: ({ icon, ...props }: { icon: string; [key: string]: unknown }) =>
        createElement('svg', { ...props, 'data-icon': icon }),
}));

class ResizeObserverMock implements ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock;

afterEach(() => {
    cleanup();
});
