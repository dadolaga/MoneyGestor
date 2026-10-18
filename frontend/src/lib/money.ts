const regionByLocale: Record<string, string> = {
    en: 'en-GB',
    it: 'it-IT',
};

function escapeForCharacterClass(value: string) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Accepts either a dot or a comma as the decimal separator. When both are
 * present, uses the active locale to interpret decimal and grouping separators.
 * Domain rules such as allowed ranges and precision deliberately belong to
 * the API; this only makes the browser input usable in the active language.
 */
export function parseLocalizedAmount(value: string, locale: string): number | undefined {
    const parts = new Intl.NumberFormat(regionByLocale[locale] ?? locale).formatToParts(12345.6);
    const localeDecimal = parts.find((part) => part.type === 'decimal')?.value ?? '.';
    const hasDot = value.includes('.');
    const hasComma = value.includes(',');
    const decimal = hasDot && hasComma ? localeDecimal : hasComma ? ',' : '.';
    const group = decimal === '.' ? ',' : '.';
    const normalized = value
        .trim()
        .replace(/\s/g, '')
        .replace(new RegExp(escapeForCharacterClass(group), 'g'), '')
        .replace(decimal, '.')
        .replace(/[^0-9+\-.]/g, '');

    if (!normalized || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return undefined;

    const amount = Number(normalized);
    return Number.isFinite(amount) ? amount : undefined;
}
