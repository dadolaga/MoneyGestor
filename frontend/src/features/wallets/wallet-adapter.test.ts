import { describe, expect, it } from 'vitest';

import { toWalletPreviewModels } from './wallet-adapter';

describe('wallet preview adapter', () => {
    it('adapts valid backend DTOs and discards incomplete records', () => {
        expect(
            toWalletPreviewModels([
                { id: 1, name: 'Main', currentValue: 1250, favorite: true, color: { value: 0x123abc } },
                { id: 2, currentValue: 10 },
            ]),
        ).toEqual([
            {
                id: 1,
                name: 'Main',
                currentValue: 1250,
                isFavorite: true,
                color: '#123abc',
            },
        ]);
    });
});
