import { describe, expect, it } from 'vitest';

import { parseLocalizedAmount } from '@/lib/money';

describe('parseLocalizedAmount', () => {
    it('normalizes an Italian amount into a neutral number', () => {
        expect(parseLocalizedAmount('1.234,50 €', 'it')).toBe(1234.5);
    });

    it('normalizes an English amount into a neutral number', () => {
        expect(parseLocalizedAmount('1,234.50', 'en')).toBe(1234.5);
    });

    it('rejects malformed values without applying a domain validation rule', () => {
        expect(parseLocalizedAmount('one euro', 'en')).toBeUndefined();
    });
});
